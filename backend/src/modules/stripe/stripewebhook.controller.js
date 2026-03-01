const { getStripe } = require("../../config/stripe");
const logger = require("../../utils/logger");
const { db } = require("../../db");
const { config } = require("../../config");
const {
  deleteCustomer,
  createSubscription,
  retrieveSubscription,
  cancelStripeSubscription,
} = require("../../utils/stripe");
const { NotFoundError, BadRequestError } = require("../../utils/errors");

const {
  generateUUID,
  generateInvoiceId,
  generateTransactionId,
} = require("../../utils/helpers");
const { generateInvoicePDF } = require("../../config/pdf");
const { sendEmail } = require("../../config/email");
const { generateInvoiceEmail } = require("../../utils/emailTemplate");

const stripe = getStripe();

const VALID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "canceled",
  "cancelled",
  "unpaid",
  "paused",
  "expired",
]);

const normalizeSubscriptionStatus = (stripeStatus) => {
  const s = stripeStatus?.toLowerCase();
  if (!VALID_SUBSCRIPTION_STATUSES.has(s)) {
    logger.warn(
      `Unexpected Stripe subscription status: "${stripeStatus}", defaulting to "incomplete"`,
    );
    return "incomplete";
  }
  return s;
};

const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = config.stripe.webhookSecret;
  logger.info("Stripe webhook request received", {
    path: req.originalUrl,
    contentType: req.headers["content-type"],
    hasSignature: Boolean(sig),
    bodyIsBuffer: Buffer.isBuffer(req.body),
    bodyLength: Buffer.isBuffer(req.body)
      ? req.body.length
      : JSON.stringify(req.body || {}).length,
  });

  if (!sig || !webhookSecret) {
    logger.error("Missing Stripe signature or webhook secret");
    return res
      .status(400)
      .json({ error: "Missing Stripe signature or webhook secret" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    logger.error("Webhook signature verification failed:", error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        await handlePaymentSuccess(event.data.object);
        break;
      }

      case "payment_intent.payment_failed": {
        await handlePaymentFailure(event.data.object);
        break;
      }

      case "payment_intent.requires_action": {
        const paymentIntent = event.data.object;
        logger.info(`PaymentIntent requires action: ${paymentIntent.id}`);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object;
        await deleteCustomer(customer.id);
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object;
        logger.info(`Stripe subscription created: ${sub.id}`);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        let newStatus = normalizeSubscriptionStatus(sub.status);

        if (sub.pause_collection && sub.pause_collection.behavior === "void") {
          newStatus = "paused";
        }

        await db
          .updateTable("subscriptions")
          .set({ status: newStatus, updated_at: new Date() })
          .where("stripe_subscription_id", "=", sub.id)
          .execute();

        logger.info(`Subscription ${sub.id} status synced to: ${newStatus}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db
          .updateTable("subscriptions")
          .set({ status: "canceled", updated_at: new Date() })
          .where("stripe_subscription_id", "=", sub.id)
          .execute();
        logger.info(`Subscription deleted: ${sub.id}`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object;
        const user = await db
          .selectFrom("users")
          .selectAll()
          .where("stripe_customer_id", "=", subscription.customer)
          .executeTakeFirst();
        if (user) {
          logger.info(
            `Trial ending soon for user: ${user.id} | Subscription: ${subscription.id}`,
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        await handleInvoiceSuccess(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoiceFailure(event.data.object);
        break;
      }

      case "payment_method.detached": {
        const paymentMethod = event.data.object;

        await handleDetachedPaymentMethod(
          paymentMethod.id,
          paymentMethod.customer,
        );

        logger.info(`Payment method detached: ${paymentMethod.id}`);
        break;
      }
      case "payment_method.created": {
        const paymentMethod = event.data.object;
        logger.info(`Payment Method created: ${paymentMethod.id}`);
        break;
      }
      default: {
        logger.info(`Unhandled Stripe event type: ${event.type}`);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error handling webhook event ${event.type}:`, error);
    return res.status(500).json({ error: "Webhook failed" });
  }
};

const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const metadata = paymentIntent.metadata;
    const customerId = metadata.userId;
    const packageId = metadata.packageId;
    const userPackageId = metadata.userPackageId;
    const invoiceId = metadata.invoiceId;
    const autoRenew = String(metadata.auto_renew).toLowerCase() === "true";
    const paymentMethodId = paymentIntent.payment_method;
    if (!packageId || !invoiceId) {
      throw new BadRequestError("Invalid metadata in PaymentIntent");
    }

    if (!customerId) {
      throw new BadRequestError(
        "Skipping Payment Success: No userId in metadata",
      );
    }

    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", customerId)
      .executeTakeFirst();
    if (!user) throw new NotFoundError("User not found for payment success");

    const pkg = await db
      .selectFrom("packages")
      .selectAll()
      .where("id", "=", packageId)
      .executeTakeFirst();
    if (!pkg) throw new NotFoundError("Package not found for payment success");

    const userPackage = await db
      .selectFrom("user_packages")
      .selectAll()
      .where("id", "=", userPackageId)
      .executeTakeFirst();
    if (!userPackage)
      throw new NotFoundError("User Package not found for payment success");

    const paymentMethod = await db
      .selectFrom("payment_methods")
      .selectAll()
      .where("stripe_payment_method_id", "=", paymentMethodId)
      .executeTakeFirst();
    if (!paymentMethod)
      throw new BadRequestError("Invoice not found for payment success");

    const isTrial = pkg.trial_days && pkg.trial_days > 0;

    const invoice = await db
      .updateTable("invoices")
      .set({
        status: isTrial ? "trial" : "paid",
        updated_at: new Date(),
      })
      .where("id", "=", invoiceId)
      .returningAll()
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundError("Invoice not found for payment success");
    }

    if (isTrial) {
      if (autoRenew) {
        await handleSubscriptionCreation(
          customerId,
          packageId,
          autoRenew,
          paymentMethodId,
          invoice,
        );
      }
      logger.info(
        `Trial started for user: ${customerId} | Package: ${packageId} | Invoice: ${invoiceId}`,
      );
    } else {
      const existingPayment = await db
        .selectFrom("payments")
        .selectAll()
        .where("stripe_payment_intent_id", "=", paymentIntent.id)
        .executeTakeFirst();

      if (existingPayment) {
        logger.warn(
          `Duplicate payment detected for PaymentIntent: ${paymentIntent.id}, skipping`,
        );
        return;
      }

      const payment = await db
        .insertInto("payments")
        .values({
          id: generateUUID(),
          user_id: user.id,
          invoice_id: invoice.invoice_number,
          amount: invoice.total,
          currency: paymentIntent.currency,
          transaction_id: generateTransactionId(),
          payment_date: new Date(),
          status: "succeeded",
          payment_method: "stripe",
          stripe_payment_intent_id: paymentIntent.id,
          notes: "Payment successful",
        })
        .returning(["transaction_id", "payment_date"])
        .executeTakeFirstOrThrow();

      if (autoRenew) {
        await handleSubscriptionCreation(
          customerId,
          packageId,
          autoRenew,
          paymentMethodId,
          invoice,
        );
        logger.info(
          `Payment successful for user: ${customerId} | Amount: ${paymentIntent.amount} | Invoice: ${invoiceId} | Subscription Created`,
        );
      } else {
        logger.info(
          `Payment successful for user: ${customerId} | Amount: ${paymentIntent.amount} | Invoice: ${invoiceId}`,
        );
      }

      try {
        const generatedInvoice = await generateInvoicePDF({
          invoice,
          paymentMethod,
          payment,
          user,
        });

        const emailTemplate = generateInvoiceEmail({
          customerName: user.name,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          totalAmount: invoice.total,
          status: invoice.status,
          transactionId: payment?.transaction_id,
          paymentDate: payment?.payment_date,
          pdfBuffer: generatedInvoice,
        });

        await sendEmail({
          to: user.email,
          ...emailTemplate,
        });
      } catch (emailError) {
        logger.error(
          `Failed to send invoice email for user: ${customerId} | Invoice: ${invoiceId}`,
          emailError,
        );
      }
    }
  } catch (error) {
    logger.error("Error handling payment success:", error);
    throw error;
  }
};

const handlePaymentFailure = async (paymentIntent) => {
  try {
    const metadata = paymentIntent.metadata;
    const invoiceId = metadata?.invoiceId;
    const customerId = metadata?.userId;

    const invoice = await db
      .selectFrom("invoices")
      .selectAll()
      .where("id", "=", invoiceId)
      .executeTakeFirst();

    if (!invoice) {
      logger.warn("Invoice not found for failed payment");
      return;
    }
    if (invoice) {
      await db
        .updateTable("invoices")
        .set({ status: "failed" })
        .where("id", "=", invoice.id)
        .execute();
    }

    const existingPayment = await db
      .selectFrom("payments")
      .selectAll()
      .where("stripe_payment_intent_id", "=", paymentIntent.id)
      .executeTakeFirst();

    if (!existingPayment && customerId) {
      await db
        .insertInto("payments")
        .values({
          id: generateUUID(),
          user_id: customerId,
          invoice_id: invoice.invoice_number,
          amount: invoice.total,
          currency: paymentIntent.currency,
          transaction_id: generateTransactionId(),
          payment_date: new Date(),
          status: "failed",
          payment_method: "stripe",
          stripe_payment_intent_id: paymentIntent.id,
          notes: paymentIntent.last_payment_error?.message ?? "Payment failed",
        })
        .execute();
    }

    logger.warn(`Payment failed for PaymentIntent: ${paymentIntent.id}`);
  } catch (error) {
    logger.error("Error handling payment failure:", error);
    throw error;
  }
};

const handleSubscriptionCreation = async (
  customerId,
  packageId,
  autoRenew,
  stripePaymentMethodId,
  invoice,
) => {
  try {
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", customerId)
      .executeTakeFirst();
    if (!user)
      throw new NotFoundError("User not found for subscription creation");

    const pkg = await db
      .selectFrom("packages")
      .selectAll()
      .where("id", "=", packageId)
      .executeTakeFirst();

    if (!pkg)
      throw new NotFoundError("Package not found for subscription creation");

    const isTrial = pkg.trial_days && pkg.trial_days > 0;

    const startDate = new Date();
    const endDate = new Date(startDate);
    const billingCycle = pkg.billing_cycle?.toLowerCase();

    if (billingCycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      throw new BadRequestError(`Invalid billing cycle: ${pkg.billing_cycle}`);
    }

    const priceId =
      billingCycle === "monthly"
        ? pkg.stripe_price_monthly_id
        : pkg.stripe_price_yearly_id;

    if (!priceId) {
      throw new BadRequestError(
        `No Stripe price ID found for billing cycle: ${billingCycle}`,
      );
    }

    const data = {
      user,
      trial_days: isTrial ? pkg.trial_days : null,
      end_date: endDate,
      payment_method: stripePaymentMethodId,
      items: [{ priceId, quantity: 1 }],
      couponId: pkg.stripe_coupon_id || undefined,
      packageId: pkg.id,
      billing_cycle: pkg.billing_cycle,
      packageName: pkg.name,
    };

    const stripeSubscription = await createSubscription(data);

    try {
      if (invoice && isTrial) {
        await db
          .updateTable("invoices")
          .set({
            status: "trial",
            due_date: new Date(stripeSubscription.trial_end * 1000),
            updated_at: new Date(),
          })
          .where("id", "=", invoice.id)
          .execute();
        logger.info(
          `Invoice ${invoice.id} marked as 'trial' — due at ${new Date(stripeSubscription.trial_end * 1000)}`,
        );
      }

      const existingSubscription = await db
        .selectFrom("subscriptions")
        .selectAll()
        .where("user_id", "=", user.id)
        .executeTakeFirst();

      const subscriptionStatus = normalizeSubscriptionStatus(
        stripeSubscription.status,
      );

      const subscriptionEndDate = isTrial
        ? new Date(stripeSubscription.trial_end * 1000)
        : endDate;

      if (!existingSubscription) {
        await db
          .insertInto("subscriptions")
          .values({
            id: generateUUID(),
            stripe_subscription_id: stripeSubscription.id,
            user_id: customerId,
            package_id: packageId,
            status: subscriptionStatus,
            start_date: startDate,
            end_date: subscriptionEndDate,
            auto_renew: autoRenew,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      } else {
        await db
          .updateTable("subscriptions")
          .set({
            stripe_subscription_id: stripeSubscription.id,
            package_id: packageId,
            status: subscriptionStatus,
            start_date: startDate,
            end_date: subscriptionEndDate,
            auto_renew: autoRenew,
            updated_at: new Date(),
          })
          .where("id", "=", existingSubscription.id)
          .where("user_id", "=", user.id)
          .execute();
      }
    } catch (dbError) {
      logger.error(
        `DB write failed after Stripe subscription ${stripeSubscription.id} created. Rolling back.`,
        dbError,
      );
      await cancelStripeSubscription(stripeSubscription.id);
      throw dbError;
    }

    logger.info(
      `Subscription created for user: ${customerId} | status: ${stripeSubscription.status} | trial: ${isTrial}`,
    );
  } catch (error) {
    logger.error("Error handling subscription creation:", error);
    throw error;
  }
};

const handleInvoiceSuccess = async (stripeInvoice) => {
  try {
    if (!stripeInvoice.subscription) return;

    if (
      stripeInvoice.status === "uncollectible" ||
      stripeInvoice.status != "paid"
    )
      return;

    if (!stripeInvoice.amount_paid || stripeInvoice.amount_paid === 0) {
      logger.info(
        `Skipping $0 invoice ${stripeInvoice.id} — trial period invoice`,
      );
      return;
    }

    if (stripeInvoice.paid_out_of_band) {
      logger.info(
        `Skipping out-of-band invoice ${stripeInvoice.id} — payment already recorded`,
      );
      return;
    }

    const SUBSCRIPTION_REASONS = [
      "subscription_cycle",
      "subscription_update",
      "subscription_create",
    ];
    if (!SUBSCRIPTION_REASONS.includes(stripeInvoice.billing_reason)) {
      logger.info(
        `Skipping invoice ${stripeInvoice.id} with billing_reason: ${stripeInvoice.billing_reason}`,
      );
      return;
    }

    const stripeSubscription = await retrieveSubscription(
      stripeInvoice.subscription,
    );

    const metadata = stripeSubscription.metadata;
    const userId = metadata.userId;
    const packageId = metadata.packageId;

    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError("User not found for invoice success");
    }

    const pkg = await db
      .selectFrom("packages")
      .selectAll()
      .where("id", "=", packageId)
      .executeTakeFirst();

    if (!pkg) {
      throw new NotFoundError("Package not found for invoice success");
    }
    const subscription = await db
      .selectFrom("subscriptions")
      .selectAll()
      .where("user_id", "=", user.id)
      .where("stripe_subscription_id", "=", stripeInvoice.subscription)
      .executeTakeFirst();

    if (!subscription) {
      throw new NotFoundError("Subscription not found for invoice success");
    }
    const userPackage = await db
      .selectFrom("user_packages")
      .selectAll()
      .where("user_id", "=", user.id)
      .where("package_id", "=", pkg.id)
      .executeTakeFirst();

    if (!userPackage) {
      throw new NotFoundError("User Package not found for invoice success");
    }
    const existingPayments = await db
      .selectFrom("payments")
      .where("stripe_payment_intent_id", "=", stripeInvoice.payment_intent)
      .executeTakeFirst();

    if (existingPayments) return;

    const periodStart = new Date(
      stripeSubscription.current_period_start * 1000,
    );
    const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

    const trialInvoice = await db
      .selectFrom("invoices")
      .selectAll()
      .where("user_id", "=", user.id)
      .where("status", "=", "trial")
      .orderBy("created_at", "desc")
      .executeTakeFirst();

    if (trialInvoice) {
      await db
        .updateTable("invoices")
        .set({ status: "paid", due_date: periodEnd, updated_at: new Date() })
        .where("id", "=", trialInvoice.id)
        .execute();

      await db
        .insertInto("payments")
        .values({
          id: generateUUID(),
          user_id: user.id,
          invoice_id: trialInvoice.invoice_number,
          amount: trialInvoice.total,
          transaction_id: generateTransactionId(),
          payment_date: new Date(),
          currency: "GBP",
          status: "succeeded",
          payment_method: "stripe",
          stripe_payment_intent_id: stripeInvoice.payment_intent ?? null,
          notes: "Trial converted to paid subscription",
        })
        .execute();

      logger.info(
        `Trial invoice ${trialInvoice.id} converted to paid for user: ${user.id}`,
      );
    } else {
      const price =
        pkg.billing_cycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
      const subtotal = price * 1;
      const discountAmount =
        pkg.discount > 0 ? (subtotal * pkg.discount) / 100 : 0;
      const total = subtotal - discountAmount;

      const invoiceItems = [
        {
          name: pkg.name,
          description: pkg.description,
          billing_cycle: pkg.billing_cycle,
          price,
          quantity: 1,
          subtotal,
          discount_percentage: pkg.discount,
          discount_amount: discountAmount,
        },
      ];

      const invoiceNumber = generateInvoiceId();
      const [newInvoice] = await db
        .insertInto("invoices")
        .values({
          id: generateUUID(),
          user_id: user.id,
          package_id: pkg.id,
          invoice_number: invoiceNumber,
          invoice_date: new Date(),
          due_date: periodEnd,
          items: JSON.stringify(invoiceItems),
          subtotal,
          total,
          currency: "GBP",
          status: "paid",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .execute();

      if (newInvoice) {
        await db
          .insertInto("payments")
          .values({
            id: generateUUID(),
            user_id: user.id,
            invoice_id: newInvoice.invoice_number,
            amount: newInvoice.total,
            currency: "GBP",
            status: "succeeded",
            payment_method: "stripe",
            stripe_payment_intent_id: stripeInvoice.payment_intent ?? null,
            notes: "Subscription renewal successful",
          })
          .execute();
      }
    }

    await db
      .updateTable("subscriptions")
      .set({
        status: "active",
        start_date: periodStart,
        end_date: periodEnd,
        stripe_subscription_id: stripeSubscription.id,
        updated_at: new Date(),
      })
      .where("user_id", "=", user.id)
      .where("stripe_subscription_id", "=", stripeInvoice.subscription)
      .execute();

    logger.info(`Subscription activated/renewed for user: ${user.id}`);
  } catch (error) {
    logger.error("Error handling invoice success:", error);
    throw error;
  }
};

const handleInvoiceFailure = async (stripeInvoice) => {
  try {
    if (!stripeInvoice.subscription) return;

    const stripeSubscription = await retrieveSubscription(
      stripeInvoice.subscription,
    );
    const { userId, packageId } = stripeSubscription.metadata;

    if (!userId || !packageId) {
      logger.warn("Missing metadata in subscription for invoice failure");
      return;
    }

    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();
    if (!user) throw new NotFoundError("User not found");

    const pkg = await db
      .selectFrom("packages")
      .selectAll()
      .where("id", "=", packageId)
      .executeTakeFirst();
    if (!pkg) throw new NotFoundError("Package not found");

    const existingPayment = await db
      .selectFrom("payments")
      .where("stripe_payment_intent_id", "=", stripeInvoice.payment_intent)
      .executeTakeFirst();
    if (existingPayment) return;

    const price =
      pkg.billing_cycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
    const dueDate = new Date();
    if (pkg.billing_cycle === "monthly") {
      dueDate.setMonth(dueDate.getMonth() + 1);
    } else {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    }

    const subtotal = price;
    const discountAmount =
      pkg.discount > 0 ? (subtotal * pkg.discount) / 100 : 0;
    const total = subtotal - discountAmount;

    const invoiceItems = [
      {
        name: pkg.name,
        description: pkg.description,
        billing_cycle: pkg.billing_cycle,
        price,
        quantity: 1,
        subtotal,
        discount_percentage: pkg.discount,
        discount_amount: discountAmount,
      },
    ];

    const [newInvoice] = await db
      .insertInto("invoices")
      .values({
        id: generateUUID(),
        user_id: user.id,
        package_id: pkg.id,
        invoice_number: generateInvoiceId(),
        items: JSON.stringify(invoiceItems),
        invoice_date: new Date(),
        due_date: dueDate,
        subtotal,
        total,
        currency: "GBP",
        status: "failed",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    if (newInvoice) {
      await db
        .insertInto("payments")
        .values({
          id: generateUUID(),
          user_id: user.id,
          invoice_id: newInvoice.invoice_number,
          amount: newInvoice.total,
          transaction_id: generateTransactionId(),
          payment_date: new Date(),
          currency: "GBP",
          status: "failed",
          payment_method: "stripe",
          stripe_payment_intent_id: stripeInvoice.payment_intent ?? null,
          notes:
            stripeInvoice.last_finalization_error?.message ??
            "Subscription renewal failed",
        })
        .execute();
    }

    await db
      .updateTable("subscriptions")
      .set({ status: "past_due", updated_at: new Date() })
      .where("user_id", "=", user.id)
      .where("stripe_subscription_id", "=", stripeSubscription.id)
      .execute();

    logger.warn(`Subscription renewal failed for user ${user.id}`);
  } catch (error) {
    logger.error("Error handling invoice failure:", error);
    throw error;
  }
};

const handleDetachedPaymentMethod = async (stripePmId, stripeCustomerId) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("stripe_customer_id", "=", stripeCustomerId)
    .executeTakeFirst();

  if (!user) return;

  const existing = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("stripe_payment_method_id", "=", stripePmId)
    .where("user_id", "=", user.id)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!existing) return;

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
  });

  for (const sub of subscriptions.data) {
    if (sub.default_payment_method === stripePmId) {
      await stripe.subscriptions.update(sub.id, {
        default_payment_method: null,
      });
    }
  }

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: null,
    },
  });

  await db
    .updateTable("payment_methods")
    .set({
      is_active: false,
      is_default: false,
      updated_at: new Date(),
    })
    .where("stripe_payment_method_id", "=", stripePmId)
    .execute();
};

module.exports = { handleWebhook };
