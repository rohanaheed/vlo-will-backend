const { db } = require("../../db");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { generateInvoiceId, generateUUID } = require("../../utils/helpers");
const logger = require("../../utils/logger");
const { getStripe } = require("../../config/stripe");
const {
  pauseStripeSubscription,
  resumeStripeSubscription,
  cancelStripeSubscription,
  updateStripeSubscription,
  retrieveSubscription,
} = require("../../utils/stripe");

const stripe = getStripe();

const createSubscription = async (data, user) => {
  const userPackage = await db
    .selectFrom("user_packages")
    .where("user_id", "=", user)
    .executeTakeFirst();

  if (!userPackage) throw new NotFoundError("User package not found");

  const subscription = await db
    .insertInto("subscriptions")
    .values({
      id: generateUUID(),
      user_id: user,
      package_id: userPackage.package_id,
      status: data.status,
      auto_renew: true,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return subscription;
};

const updateSubscription = async (
  userId,
  subscriptionId,
  packageId,
  paymentMethodId,
  autoRenew,
) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  const subscription = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("id", "=", subscriptionId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!subscription) throw new NotFoundError("Subscription not found");

  if (
    subscription.status === "canceled" ||
    subscription.status === "cancelled"
  ) {
    throw new BadRequestError("Cannot update a cancelled subscription");
  }

  if (!subscription.auto_renew && !subscription.stripe_subscription_id) {
    throw new BadRequestError(
      "One-time subscriptions cannot be updated. Please purchase a new package.",
    );
  }

  if (!subscription.stripe_subscription_id) {
    throw new BadRequestError("No Stripe subscription linked to this record");
  }

  const pkg = await db
    .selectFrom("packages")
    .selectAll()
    .where("id", "=", packageId)
    .executeTakeFirst();
  if (!pkg) throw new NotFoundError("Package not found");
  if (pkg.status !== "active")
    throw new BadRequestError("Selected package is not active");

  let stripePaymentMethodId;

  if (paymentMethodId) {
    const paymentMethod = await db
      .selectFrom("payment_methods")
      .selectAll()
      .where("id", "=", paymentMethodId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!paymentMethod) throw new NotFoundError("Payment method not found");
    if (!paymentMethod.is_active)
      throw new BadRequestError("Payment method is not active");
    if (!paymentMethod.stripe_payment_method_id)
      throw new BadRequestError("Payment method is not linked to Stripe");

    stripePaymentMethodId = paymentMethod.stripe_payment_method_id;
  } else {
    if (!user.stripe_customer_id) {
      throw new BadRequestError("No Stripe customer linked to this user");
    }

    const customer = await stripe.customers.retrieve(user.stripe_customer_id, {
      expand: ["invoice_settings.default_payment_method"],
    });

    if (!customer.invoice_settings?.default_payment_method) {
      throw new BadRequestError(
        "No default payment method found for this customer",
      );
    }

    stripePaymentMethodId =
      typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method.id;
  }

  const resolvedAutoRenew = autoRenew !== undefined ? Boolean(autoRenew) : true;

  if (
    subscription.package_id === packageId &&
    subscription.payment_method_id === paymentMethodId
  ) {
    logger.info(
      `No changes detected for subscription ${subscriptionId}, skipping update`,
    );
    return subscription;
  }

  const billingCycle = pkg.billing_cycle?.toLowerCase();
  let priceId;

  if (billingCycle === "monthly") priceId = pkg.stripe_price_monthly_id;
  else if (billingCycle === "yearly") priceId = pkg.stripe_price_yearly_id;

  if (!priceId) {
    throw new BadRequestError(
      `No Stripe price ID found for billing cycle: ${billingCycle}`,
    );
  }

  const stripeSubscription = await retrieveSubscription(
    subscription.stripe_subscription_id,
  );
  if (!stripeSubscription) {
    throw new BadRequestError(
      "Could not retrieve Stripe subscription for update",
    );
  }

  const isTrialing = subscription.status === "trialing";

  let trialOrAnchor = {};
  if (pkg.trial_days && pkg.trial_days > 0) {
    const trialEndTimestamp =
      Math.floor(Date.now() / 1000) + pkg.trial_days * 24 * 60 * 60;
    trialOrAnchor = { trial_end: trialEndTimestamp };
  } else if (isTrialing) {
    trialOrAnchor = { trial_end: "now" };
  } else {
    trialOrAnchor = {
      billing_cycle_anchor: "now",
      proration_behavior: "create_prorations",
    };
  }

  const updatedStripeSubscription = await updateStripeSubscription({
    user,
    stripe_subscription_id: subscription.stripe_subscription_id,
    items: [{ priceId, quantity: 1 }],
    payment_method: stripePaymentMethodId,
    couponId: pkg.stripe_coupon_id || undefined,
    id: subscription.id,
    packageId: pkg.id,
    packageName: pkg.name,
    trialOrAnchor,
  });

  const finalEndDate = updatedStripeSubscription.current_period_end
    ? new Date(updatedStripeSubscription.current_period_end * 1000)
    : new Date(stripeSubscription.current_period_end * 1000);

  const updatedSubscription = await db
    .updateTable("subscriptions")
    .set({
      package_id: pkg.id,
      auto_renew: resolvedAutoRenew,
      start_date: new Date(),
      end_date: finalEndDate,
      updated_at: new Date(),
    })
    .where("id", "=", subscriptionId)
    .where("user_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  const oldInvoices = await db
    .selectFrom("invoices")
    .selectAll()
    .where("user_id", "=", user.id)
    .where("package_id", "=", subscription.package_id)
    .where((eb) =>
      eb.or([
        eb("status", "=", "pending"),
        eb("status", "=", "trial"),
        eb("status", "=", "processing"),
      ]),
    )
    .execute();

  if (oldInvoices.length > 0) {
    await db
      .updateTable("invoices")
      .set({ status: "canceled", updated_at: new Date() })
      .where("user_id", "=", user.id)
      .where("package_id", "=", subscription.package_id)
      .where((eb) =>
        eb.or([
          eb("status", "=", "pending"),
          eb("status", "=", "trial"),
          eb("status", "=", "processing"),
        ]),
      )
      .execute();

    logger.info(
      `Cancelled ${oldInvoices.length} old invoice(s) for user ${user.id}`,
    );
  }

  await db.deleteFrom("user_packages").where("user_id", "=", userId).execute();

  await db
    .insertInto("user_packages")
    .values({
      id: generateUUID(),
      user_id: user.id,
      package_id: pkg.id,
      status: pkg.status,
      billing_cycle: pkg.billing_cycle,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  const price =
    pkg.billing_cycle === "monthly" ? pkg.price_monthly : pkg.price_yearly;
  const stripe_price_id =
    pkg.billing_cycle === "monthly"
      ? pkg.stripe_price_monthly_id
      : pkg.stripe_price_yearly_id;

  const quantity = 1;
  const subtotal = price * quantity;
  const discountAmount = pkg.discount > 0 ? (subtotal * pkg.discount) / 100 : 0;
  const total = subtotal - discountAmount;

  const invoiceItems = [
    {
      package_id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      billing_cycle: pkg.billing_cycle,
      price,
      stripe_price_id,
      quantity,
      subtotal,
      discount_percentage: `${pkg.discount}%`,
      discount_amount: discountAmount,
    },
  ];

  const dueDate = new Date();
  if (pkg.billing_cycle === "monthly") {
    dueDate.setMonth(dueDate.getMonth() + 1);
  } else {
    dueDate.setFullYear(dueDate.getFullYear() + 1);
  }

  const invoiceNumber = generateInvoiceId();

  await db
    .insertInto("invoices")
    .values({
      id: generateUUID(),
      user_id: user.id,
      package_id: pkg.id,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      due_date: dueDate,
      items: JSON.stringify(invoiceItems),
      subtotal,
      total,
      currency: "GBP",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  logger.info(
    `Subscription updated for user: ${userId} | new package: ${packageId}`,
  );
  return updatedSubscription;
};

const getSubscriptionByUser = async (userId) => {
  return await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("user_id", "=", userId)
    .execute();
};

const pauseSubscription = async (userId, subscriptionId) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  const subscription = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("id", "=", subscriptionId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!subscription) throw new NotFoundError("Subscription not found");

  if (!subscription.stripe_subscription_id) {
    throw new BadRequestError("One-time subscriptions cannot be paused");
  }
  if (subscription.status === "paused") {
    throw new BadRequestError("Subscription is already paused");
  }
  if (subscription.status === "canceled") {
    throw new BadRequestError("Cannot pause a cancelled subscription");
  }

  await pauseStripeSubscription(subscription.stripe_subscription_id);

  return await getSubscriptionByUser(user.id);
};

const resumeSubscription = async (userId, subscriptionId) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  const subscription = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("id", "=", subscriptionId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!subscription) throw new NotFoundError("Subscription not found");

  if (!subscription.stripe_subscription_id) {
    throw new BadRequestError("One-time subscriptions cannot be resumed");
  }
  if (subscription.status !== "paused") {
    throw new BadRequestError("Only paused subscriptions can be resumed");
  }

  await resumeStripeSubscription(subscription.stripe_subscription_id);

  return await getSubscriptionByUser(user.id);
};

const cancelSubscription = async (userId, subscriptionId) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  const subscription = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("id", "=", subscriptionId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!subscription) throw new NotFoundError("Subscription not found");

  if (subscription.status === "canceled") {
    throw new BadRequestError("Subscription is already cancelled");
  }

  if (!subscription.stripe_subscription_id) {
    await db
      .updateTable("subscriptions")
      .set({ status: "canceled", auto_renew: false, updated_at: new Date() })
      .where("id", "=", subscriptionId)
      .where("user_id", "=", userId)
      .execute();
  } else {
    await cancelStripeSubscription(subscription.stripe_subscription_id);
  }

  return await getSubscriptionByUser(user.id);
};

module.exports = {
  createSubscription,
  updateSubscription,
  getSubscriptionByUser,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
};
