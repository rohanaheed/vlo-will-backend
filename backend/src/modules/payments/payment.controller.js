const { getStripe } = require("../../config/stripe");
const logger = require("../../utils/logger");
const { db } = require("../../db");
const { NotFoundError } = require("../../utils/errors");
const {
  retrieveCustomerPaymentMethod,
  createOrGetCustomer,
} = require("../../utils/stripe");

const stripe = getStripe();

const processPayment = async (req, res) => {
  try {
    const { paymentMethodId, autoRenew = true } = req.body;

    const paymentMethod = await db
      .selectFrom("payment_methods")
      .selectAll()
      .where("id", "=", paymentMethodId)
      .executeTakeFirst();

    if (!paymentMethod) {
      throw new NotFoundError("Payment Method not found for User");
    }

    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", paymentMethod.user_id)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const userPackage = await db
      .selectFrom("user_packages")
      .selectAll()
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    if (!userPackage) {
      throw new NotFoundError("User Package not found");
    }

    const pkg = await db
      .selectFrom("packages")
      .selectAll()
      .where("id", "=", userPackage.package_id)
      .executeTakeFirst();

    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    const invoice = await db
      .selectFrom("invoices")
      .selectAll()
      .where("user_id", "=", user.id)
      .where((eb) =>
        eb.or([eb("status", "=", "pending"), eb("status", "=", "trial")]),
      )
      .orderBy("created_at", "desc")
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundError("Invoice not found for user");
    }
    if (invoice) {
      await db
        .updateTable("invoices")
        .set({ status: "processing" })
        .where("id", "=", invoice.id)
        .where("status", "=", "pending")
        .execute();
    }
    if (
      paymentMethod.method_type.toLowerCase() === "stripe" &&
      pkg.status === "active" &&
      paymentMethod.is_active === true
    ) {
      const process = await StripePayment(
        paymentMethod,
        pkg,
        user,
        invoice,
        userPackage,
        autoRenew,
      );
      return res.status(200).json(process);
    } else {
      return res.status(400).json({
        error: "Payment method is not eligible for processing",
      });
    }
  } catch (error) {
    logger.error("Error processing payment:", error);
    return res.status(500).json({ error: error.message });
  }
};

const StripePayment = async (
  paymentMethod,
  pkg,
  user,
  invoice,
  userPackage,
  autoRenew,
) => {
  try {
    const customer = await createOrGetCustomer(user);
    if (!customer) {
      throw new NotFoundError("Stripe User not found");
    }

    const stripePaymentMethod = await retrieveCustomerPaymentMethod(
      customer.id,
      paymentMethod.stripe_payment_method_id,
    );
    if (stripePaymentMethod.customer !== customer.id) {
      throw new Error("Payment method does not belong to customer");
    }
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: stripePaymentMethod.id,
      },
    });
    const amountInCents = Math.round(Number(invoice.total) * 100);
    const idempotencyKey = `payment_${invoice.id}_${paymentMethod.id}_${amountInCents}`;
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: "gbp",
        customer: customer.id,
        payment_method: stripePaymentMethod.id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          userId: user.id,
          packageId: pkg.id,
          invoiceId: invoice.id,
          userPackageId: userPackage.id,
          auto_renew: String(Boolean(autoRenew)),
        },
      },
      {
        idempotencyKey,
      },
    );

    logger.info("Stripe Payment processed successfully");

    if (paymentIntent.status === "succeeded") {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: "succeeded",
        message: "Payment succeeded",
      };
    } else if (paymentIntent.status === "requires_action") {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requiresAction: true,
        message: "Payment requires additional authentication",
        nextActionUrl:
          paymentIntent.next_action?.redirect_to_url?.url ?? undefined,
      };
    } else if (paymentIntent.status === "processing") {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: "Payment is processing",
      };
    } else {
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: "Payment could not be completed",
        error: paymentIntent.last_payment_error?.message,
      };
    }
  } catch (error) {
    if (error.type === "StripeCardError") {
      return {
        success: false,
        message: error.message,
      };
    }
    logger.error("Error processing stripe payment:", error);
    throw error;
  }
};

module.exports = { processPayment };
