const { db } = require("../../db");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { generateInvoiceId, generateUUID } = require("../../utils/helpers");
const logger = require("../../utils/logger");
const { getStripe } = require("../../config/stripe");
const {
  createProduct,
  createPrice,
  createCoupon,
  deleteCoupon,
  updateProduct,
  archivePrice,
  archiveProduct,
  retrieveSubscription,
} = require("../../utils/stripe");

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

const getPackages = async () => {
  return await db
    .selectFrom("packages")
    .selectAll()
    .where("status", "=", "active")
    .orderBy("created_at", "desc")
    .execute();
};

const getPackageById = async (packageId) => {
  const pkg = await db
    .selectFrom("packages")
    .selectAll()
    .where("id", "=", packageId)
    .executeTakeFirst();

  if (!pkg) throw new NotFoundError("Package");
  return pkg;
};

const createPackage = async (data, currentUser) => {
  const pkg = await db
    .insertInto("packages")
    .values({
      ...data,
      id: generateUUID(),
      stripe_product_id: null,
      stripe_price_monthly_id: null,
      stripe_price_yearly_id: null,
      stripe_coupon_id: null,
      included_features: data.included_features
        ? JSON.stringify(data.included_features)
        : JSON.stringify([]),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  if (pkg.subscription_type === "paid") {
    await createProduct(pkg);
    const refreshedPkg = await getPackageById(pkg.id);

    if (refreshedPkg.billing_cycle === "monthly") {
      await createPrice(refreshedPkg, "monthly", "GBP");
    } else {
      await createPrice(refreshedPkg, "yearly", "GBP");
    }

    if (refreshedPkg.discount > 0) {
      await createCoupon(refreshedPkg);
    }
  }

  logger.info("Package created", {
    packageId: pkg.id,
    createdBy: currentUser.id,
  });
  return await getPackageById(pkg.id);
};

const updatePackage = async (packageId, updateData, currentUser) => {
  const existing = await getPackageById(packageId);

  const updated = await db
    .updateTable("packages")
    .set({
      ...updateData,
      included_features: updateData.included_features
        ? JSON.stringify(updateData.included_features)
        : existing.included_features,
      updated_at: new Date(),
    })
    .where("id", "=", packageId)
    .returningAll()
    .executeTakeFirst();

  const existingBillingCycle = existing.billing_cycle;
  const updatedBillingCycle = updated.billing_cycle;

  if (updated.subscription_type === "paid") {
    await updateProduct(updated);
    let didSwitchCycle = false;

    if (
      existingBillingCycle === "monthly" &&
      updatedBillingCycle === "yearly"
    ) {
      didSwitchCycle = true;
      if (existing.stripe_price_monthly_id)
        await archivePrice(existing.stripe_price_monthly_id);
      await createPrice(updated, "yearly", "GBP");
      await db
        .updateTable("packages")
        .set({ stripe_price_monthly_id: null, updated_at: new Date() })
        .where("id", "=", packageId)
        .execute();
    } else if (
      existingBillingCycle === "yearly" &&
      updatedBillingCycle === "monthly"
    ) {
      didSwitchCycle = true;
      if (existing.stripe_price_yearly_id)
        await archivePrice(existing.stripe_price_yearly_id);
      await createPrice(updated, "monthly", "GBP");
      await db
        .updateTable("packages")
        .set({ stripe_price_yearly_id: null, updated_at: new Date() })
        .where("id", "=", packageId)
        .execute();
    } else if (
      updatedBillingCycle === "monthly" &&
      existing.price_monthly !== updated.price_monthly
    ) {
      if (existing.stripe_price_monthly_id)
        await archivePrice(existing.stripe_price_monthly_id);
      await createPrice(updated, "monthly", "GBP");
    } else if (
      updatedBillingCycle === "yearly" &&
      existing.price_yearly !== updated.price_yearly
    ) {
      if (existing.stripe_price_yearly_id)
        await archivePrice(existing.stripe_price_yearly_id);
      await createPrice(updated, "yearly", "GBP");
    }

    if (updatedBillingCycle === "monthly" && !updated.stripe_price_monthly_id) {
      await createPrice(updated, "monthly", "GBP");
    }
    if (updatedBillingCycle === "yearly" && !updated.stripe_price_yearly_id) {
      await createPrice(updated, "yearly", "GBP");
    }

    if (updatedBillingCycle === "monthly" && existing.stripe_price_yearly_id) {
      if (!didSwitchCycle) await archivePrice(existing.stripe_price_yearly_id);
      await db
        .updateTable("packages")
        .set({ stripe_price_yearly_id: null, updated_at: new Date() })
        .where("id", "=", packageId)
        .execute();
    } else if (
      updatedBillingCycle === "yearly" &&
      existing.stripe_price_monthly_id
    ) {
      if (!didSwitchCycle) await archivePrice(existing.stripe_price_monthly_id);
      await db
        .updateTable("packages")
        .set({ stripe_price_monthly_id: null, updated_at: new Date() })
        .where("id", "=", packageId)
        .execute();
    }

    let couponRemoved = false;
    let couponChanged = false;

    if (existing.discount > 0 && updated.discount === 0) {
      if (existing.stripe_coupon_id)
        await deleteCoupon(existing.stripe_coupon_id);
      couponRemoved = true;
      couponChanged = true;
    } else if (existing.discount === 0 && updated.discount > 0) {
      await createCoupon(updated);
      couponChanged = true;
    } else if (
      existing.discount > 0 &&
      updated.discount > 0 &&
      existing.discount !== updated.discount
    ) {
      if (existing.stripe_coupon_id)
        await deleteCoupon(existing.stripe_coupon_id);
      await createCoupon(updated);
      couponChanged = true;
    }

    const latestPkg = await getPackageById(packageId);
    const newPriceId =
      updatedBillingCycle === "monthly"
        ? latestPkg.stripe_price_monthly_id
        : latestPkg.stripe_price_yearly_id;
    const newCouponId = latestPkg.stripe_coupon_id;

    const priceChanged =
      existing.price_monthly !== updated.price_monthly ||
      existing.price_yearly !== updated.price_yearly ||
      didSwitchCycle;

    const billingCycleChanged = existingBillingCycle !== updatedBillingCycle;
    const trialChanged = existing.trial_days !== updated.trial_days;
    const shouldSyncSubscriptions =
      priceChanged || couponChanged || billingCycleChanged || trialChanged;

    if (shouldSyncSubscriptions && newPriceId) {
      const stripePrices = await stripe.prices.list({
        product: existing.stripe_product_id,
        active: true,
        limit: 100,
      });

      const relevantPriceIds = new Set(
        [
          ...stripePrices.data.map((p) => p.id),
          existing.stripe_price_monthly_id,
          existing.stripe_price_yearly_id,
        ].filter(Boolean),
      );

      const dbSubscriptions = await db
        .selectFrom("subscriptions")
        .selectAll()
        .where("package_id", "=", packageId)
        .where((eb) =>
          eb.or([
            eb("status", "=", "active"),
            eb("status", "=", "trialing"),
            eb("status", "=", "paused"),
          ]),
        )
        .where("stripe_subscription_id", "is not", null)
        .execute();

      if (dbSubscriptions.length > 0) {
        await Promise.all(
          dbSubscriptions.map(async (sub) => {
            const stripeSub = await retrieveSubscription(
              sub.stripe_subscription_id,
            );
            if (!stripeSub) return;

            const subPriceId = stripeSub.items.data[0]?.price?.id;
            if (!relevantPriceIds.has(subPriceId)) {
              logger.info(
                `Skipping ${sub.stripe_subscription_id} — price not related to product`,
              );
              return;
            }

            const existingItem = stripeSub.items.data[0];

            let trialOrAnchor = {};

            if (trialChanged) {
              if (updated.trial_days && updated.trial_days > 0) {
                const newTrialEnd =
                  Math.floor(Date.now() / 1000) +
                  updated.trial_days * 24 * 60 * 60;

                if (billingCycleChanged) {
                  trialOrAnchor = {
                    trial_end: newTrialEnd,
                  };
                } else {
                  trialOrAnchor = { trial_end: newTrialEnd };
                }
              } else if (!updated.trial_days || updated.trial_days === 0) {
                if (sub.status === "trialing") {
                  trialOrAnchor = { trial_end: "now" };

                  if (billingCycleChanged) {
                    trialOrAnchor = {
                      trial_end: "now",
                      billing_cycle_anchor: "now",
                      proration_behavior: "create_prorations",
                    };
                  }
                } else if (billingCycleChanged) {
                  trialOrAnchor = {
                    billing_cycle_anchor: "now",
                    proration_behavior: "create_prorations",
                  };
                }
              }
            } else if (billingCycleChanged) {
              trialOrAnchor = {
                billing_cycle_anchor: "now",
                proration_behavior: "create_prorations",
              };
            }

            const updatedStripeSub = await stripe.subscriptions.update(
              sub.stripe_subscription_id,
              {
                items: [{ id: existingItem.id, price: newPriceId }],
                discounts: couponRemoved
                  ? []
                  : newCouponId
                    ? [{ coupon: newCouponId }]
                    : undefined,
                ...(trialOrAnchor.trial_end && trialOrAnchor.trial_end !== "now"
                  ? { proration_behavior: "none" }
                  : { proration_behavior: "create_prorations" }),
                ...trialOrAnchor,
              },
            );

            let newStatus;
            if (
              sub.status === "paused" ||
              updatedStripeSub.pause_collection?.behavior === "void"
            ) {
              newStatus = "paused";
            } else {
              newStatus = normalizeSubscriptionStatus(updatedStripeSub.status);
            }

            let newEndDate = sub.end_date;
            if (
              trialChanged &&
              updated.trial_days > 0 &&
              updatedStripeSub.trial_end
            ) {
              newEndDate = new Date(updatedStripeSub.trial_end * 1000);
            } else if (updatedStripeSub.current_period_end) {
              newEndDate = new Date(updatedStripeSub.current_period_end * 1000);
            }

            await db
              .updateTable("subscriptions")
              .set({
                status: newStatus,
                end_date: newEndDate,
                updated_at: new Date(),
              })
              .where("id", "=", sub.id)
              .execute();

            const pendingInvoices = await db
              .selectFrom("invoices")
              .selectAll()
              .where("user_id", "=", sub.user_id)
              .where("package_id", "=", packageId)
              .where("status", "=", "pending")
              .execute();

            await Promise.all(
              pendingInvoices.map(async (inv) => {
                const newPrice =
                  priceChanged || billingCycleChanged
                    ? updatedBillingCycle === "monthly"
                      ? updated.price_monthly
                      : updated.price_yearly
                    : (() => {
                        const existingItems = JSON.parse(inv.items || "[]");
                        return existingItems[0]?.price ?? inv.subtotal;
                      })();

                const quantity = 1;
                const newSubtotal = newPrice * quantity;

                const newDiscountAmount =
                  updated.discount > 0
                    ? (newSubtotal * updated.discount) / 100
                    : 0;
                const newTotal = newSubtotal - newDiscountAmount;

                let newDueDate = inv.due_date;
                if (billingCycleChanged) {
                  newDueDate = new Date();
                  if (updatedBillingCycle === "monthly") {
                    newDueDate.setMonth(newDueDate.getMonth() + 1);
                  } else {
                    newDueDate.setFullYear(newDueDate.getFullYear() + 1);
                  }
                }

                const updatedInvoiceItems = [
                  {
                    package_id: packageId,
                    name: updated.name,
                    description: updated.description,
                    billing_cycle: updatedBillingCycle,
                    price: newPrice,
                    stripe_price_id: newPriceId,
                    quantity,
                    subtotal: newSubtotal,
                    discount_percentage: updated.discount,
                    discount_amount: newDiscountAmount,
                  },
                ];

                await db
                  .updateTable("invoices")
                  .set({
                    items: JSON.stringify(updatedInvoiceItems),
                    subtotal: newSubtotal,
                    total: newTotal,
                    due_date: newDueDate,
                    updated_at: new Date(),
                  })
                  .where("id", "=", inv.id)
                  .execute();

                logger.info(
                  `Updated invoice ${inv.id} | price: ${newPrice} | discount: ${updated.discount}% (${newDiscountAmount}) | total: ${newTotal}`,
                );
              }),
            );

            logger.info(
              `Synced subscription ${sub.stripe_subscription_id} | status: ${newStatus} | price: ${priceChanged} | coupon: ${couponChanged} | cycle: ${billingCycleChanged} | trial: ${trialChanged}`,
            );
          }),
        );

        logger.info(
          `Synced package update to ${dbSubscriptions.length} subscription(s) for package: ${packageId}`,
        );
      }
    }
  }

  logger.info("Package updated", { packageId, updatedBy: currentUser.id });
  return await getPackageById(packageId);
};

const deletePackage = async (packageId, currentUser) => {
  const pkg = await getPackageById(packageId);

  const relatedSubscriptions = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("package_id", "=", packageId)
    .where("stripe_subscription_id", "is not", null)
    .execute();

  if (relatedSubscriptions.length > 0) {
    await Promise.all(
      relatedSubscriptions.map(async (sub) => {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
          logger.info(
            `Cancelled Stripe subscription ${sub.stripe_subscription_id}`,
          );
        } catch (err) {
          logger.warn(
            `Could not cancel ${sub.stripe_subscription_id}: ${err.message}`,
          );
        }
      }),
    );
  }

  await db
    .updateTable("subscriptions")
    .set({ status: "canceled", auto_renew: false, updated_at: new Date() })
    .where("package_id", "=", packageId)
    .execute();

  await db
    .updateTable("invoices")
    .set({ status: "canceled", updated_at: new Date() })
    .where("package_id", "=", packageId)
    .where((eb) =>
      eb.or([
        eb("status", "=", "pending"),
        eb("status", "=", "processing"),
        eb("status", "=", "trial"),
      ]),
    )
    .execute();

  if (pkg.stripe_price_monthly_id)
    await archivePrice(pkg.stripe_price_monthly_id);
  if (pkg.stripe_price_yearly_id)
    await archivePrice(pkg.stripe_price_yearly_id);

  if (pkg.stripe_coupon_id) await deleteCoupon(pkg.stripe_coupon_id);

  if (pkg.stripe_product_id) await archiveProduct(pkg.stripe_product_id);

  await db.deleteFrom("packages").where("id", "=", packageId).execute();

  logger.info("Package deleted", { packageId, deletedBy: currentUser.id });
};

const selectPackage = async (packageId, userId) => {
  const pkg = await db
    .selectFrom("packages")
    .selectAll()
    .where("id", "=", packageId)
    .executeTakeFirst();
  if (!pkg) throw new NotFoundError("Package not found");
  if (pkg.status !== "active")
    throw new BadRequestError("Package is not active");

  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  await db.deleteFrom("user_packages").where("user_id", "=", userId).execute();

  const selectedPackage = await db
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
    .returningAll()
    .executeTakeFirst();

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
      discount_percentage: `${pkg.discount}%}`,
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

  logger.info("Package selected and draft invoice created", {
    packageId: pkg.id,
    userId: user.id,
    invoiceNumber,
  });

  return selectedPackage;
};

module.exports = {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  selectPackage,
};
