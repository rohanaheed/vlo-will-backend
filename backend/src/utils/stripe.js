const { getStripe } = require("../config/stripe");
const logger = require("./logger");
const { db } = require("../db");

const stripe = getStripe();

const createOrGetCustomer = async (user) => {
  try {
    if (user.stripe_customer_id) {
      const existingUser = await stripe.customers.retrieve(
        user.stripe_customer_id,
      );
      return existingUser;
    }

    if (!user.stripe_customer_id) {
      const newUser = await stripe.customers.create({
        name: user.full_name,
        email: user.email,
        metadata: { userId: user.id },
      });

      await db
        .updateTable("users")
        .set({
          stripe_customer_id: newUser.id,
        })
        .where("id", "=", user.id)
        .execute();
      logger.info(`Stripe User ${newUser.id} created`);
      return newUser;
    }
  } catch (error) {
    logger.error(`Error creating or retrieving user ${user.full_name}:`, error);
    throw error;
  }
};

const deleteCustomer = async (userId) => {
  try {
    const deletedCustomer = await stripe.customers.del(userId);
    logger.info(`User ${userId} deleted from Stripe`);
    return deletedCustomer;
  } catch (error) {
    logger.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

const createProduct = async (data) => {
  try {
    const createProduct = await stripe.products.create({
      name: data.name,
      description: data.description,
      active: data.status === "active" ? true : false,
      metadata: {
        packageId: data.id,
        marketingFeature: JSON.stringify(data.marketing_features),
      },
    });

    await db
      .updateTable("packages")
      .set({ stripe_product_id: createProduct.id })
      .where("id", "=", data.id)
      .execute();

    logger.info(`Stripe Product for package ${createProduct.name} is created`);
    return createProduct;
  } catch (error) {
    logger.error(`Error creating product:`, error);
    throw error;
  }
};

const updateProduct = async (data) => {
  try {
    const updateProduct = await stripe.products.update(data.stripe_product_id, {
      name: data.name,
      description: data.description,
      active: data.status === "active" ? true : false,
      metadata: {
        packageId: data.id,
        marketingFeature: JSON.stringify(data.marketing_features),
      },
    });
    logger.info(`Stripe Product for ${updateProduct.name} is updated`);
    return updateProduct;
  } catch (error) {
    logger.error("Error updating product");
    throw error;
  }
};

const deleteProduct = async (productId) => {
  try {
    const deletedProduct = await stripe.products.del(productId);
    logger.info(`Product ${productId} deleted from Stripe`);
    return deletedProduct;
  } catch (error) {
    logger.error(`Error deleting product ${productId}:`, error);
    throw error;
  }
};

const archiveProduct = async (productId) => {
  try {
    const archivedProduct = await stripe.products.update(productId, {
      active: false,
    });
    logger.info(`Product ${productId} archived from Stripe`);
    return archivedProduct;
  } catch (error) {
    logger.error(`Error archiving product ${productId}:`, error);
    throw error;
  }
};

const createPrice = async (data, interval, currency) => {
  try {
    const createPrice = await stripe.prices.create({
      product: data.stripe_product_id,
      unit_amount: Math.round(data[`price_${interval}`] * 100),
      currency: currency.toLowerCase(),
      recurring: {
        interval: interval === "monthly" ? "month" : "year",
        interval_count: 1,
      },
      active: true,
    });

    await db
      .updateTable("packages")
      .set({ [`stripe_price_${interval}_id`]: createPrice.id })
      .where("id", "=", data.id)
      .execute();
    logger.info(`Stripe ${interval} price for package ${data.name} is created`);
    return createPrice;
  } catch (error) {
    logger.error("Error creating price", error);
    throw error;
  }
};

const archivePrice = async (priceId) => {
  try {
    const archivedPrice = await stripe.prices.update(priceId, {
      active: false,
    });
    logger.info(`Price ${priceId} archived from Stripe`);
    return archivedPrice;
  } catch (error) {
    logger.error(`Error archiving price ${priceId}:`, error);
    throw error;
  }
};

const createCoupon = async (data) => {
  try {
    const createCoupon = await stripe.coupons.create({
      name: data.name,
      percent_off: data.discount,
      duration: "forever",
      applies_to: {
        products: [data.stripe_product_id],
      },
    });

    await db
      .updateTable("packages")
      .set({
        stripe_coupon_id: createCoupon.id,
      })
      .where("id", "=", data.id)
      .execute();

    logger.info(`Stripe coupon for package ${data.name} is created`);
    return createCoupon;
  } catch (error) {
    logger.error("Error creating coupon:", error);
    throw error;
  }
};

const deleteCoupon = async (couponId) => {
  try {
    const deletedCoupon = await stripe.coupons.del(couponId);
    logger.info(`Coupon ${couponId} deleted from Stripe`);
    return deletedCoupon;
  } catch (error) {
    logger.error(`Error deleting coupon ${couponId}:`, error);
    throw error;
  }
};

const retrieveSubscription = async (subscriptionId) => {
  try {
    const getSubscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      {
        expand: ["latest_invoice.payment_intent"],
      },
    );
    logger.info(`Retrieved subscription ${subscriptionId}`);
    return getSubscription;
  } catch (error) {
    logger.error(`Error retrieving subscription ${subscriptionId}:`, error);
    throw error;
  }
};
const createSubscription = async (data) => {
  try {
    const user = await createOrGetCustomer(data.user);
    const isTrial = data.trial_days > 0;
    const trialOrAnchor =
      data.trial_days > 0
    ? { trial_period_days: data.trial_days }
    : {};
    const newSubscription = await stripe.subscriptions.create({
      customer: user.id,
      items: data.items.map((item) => ({
        price: item.priceId,
        quantity: item.quantity || 1,
      })),
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      ...trialOrAnchor,
      default_payment_method: data.payment_method,
      discounts: data.couponId ? [{ coupon: data.couponId }] : undefined,
      collection_method: "charge_automatically",
      metadata: {
        userId: data.user.id,
        packageId: data.packageId,
        packageName: data.packageName,
      },
    });

    if (!isTrial && newSubscription.latest_invoice) {
      const invoiceId =
        typeof newSubscription.latest_invoice === "string"
          ? newSubscription.latest_invoice
          : newSubscription.latest_invoice.id;

      await stripe.invoices.pay(invoiceId, { paid_out_of_band: true });

      const activeSubscription = await stripe.subscriptions.retrieve(
        newSubscription.id,
        { expand: ["latest_invoice.payment_intent"] },
      );

      logger.info(
        `Stripe subscription for user ${data.user.full_name} created and activated (paid out of band)`,
      );
      return activeSubscription;
    }

    logger.info(
      `Stripe subscription for user ${data.user.full_name} is created`,
    );
    return newSubscription;
  } catch (error) {
    logger.error("Error creating subscription", error);
    throw error;
  }
};

const updateStripeSubscription = async (data) => {
  try {
    const user = await createOrGetCustomer(data.user);
    const subscription = await retrieveSubscription(
      data.stripe_subscription_id,
    );
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const existingItemsMap = {};
    subscription.items.data.forEach((item) => {
      existingItemsMap[item.price.id] = item.id;
    });

    const newItemPriceIds = new Set(data.items.map((item) => item.priceId));

    const updatedItems = [];

    subscription.items.data.forEach((existingItem) => {
      if (!newItemPriceIds.has(existingItem.price.id)) {
        updatedItems.push({
          id: existingItem.id,
          deleted: true,
        });
      }
    });

    data.items.forEach((item) => {
      const existingItemId = existingItemsMap[item.priceId];

      if (existingItemId) {
        updatedItems.push({
          id: existingItemId,
          quantity: item.quantity || 1,
        });
      } else {
        updatedItems.push({
          price: item.priceId,
          quantity: item.quantity || 1,
        });
      }
    });

    const updatedSubscription = await stripe.subscriptions.update(
      data.stripe_subscription_id,
      {
        items: updatedItems,
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
        default_payment_method: data.payment_method ?? undefined,
        discounts: data.couponId ? [{ coupon: data.couponId }] : undefined,
        collection_method: "charge_automatically",
        ...data.trialOrAnchor,
        metadata: {
          userId: data.user.id,
          packageId: data.packageId,
          packageName: data.packageName,
        },
      },
    );

    logger.info(
      `Stripe subscription ${data.stripe_subscription_id} updated for user: ${user.id}`,
    );
    return updatedSubscription;
  } catch (error) {
    logger.error("Error updating subscription:", error);
    throw error;
  }
};

const cancelStripeSubscription = async (subscriptionId) => {
  try {
    const canceledSubscription =
      await stripe.subscriptions.cancel(subscriptionId);

    if (canceledSubscription.status === "canceled") {
      await db
        .updateTable("subscriptions")
        .set({ status: "canceled", auto_renew: false })
        .where("stripe_subscription_id", "=", subscriptionId)
        .execute();
    }

    logger.info(`Subscription ${subscriptionId} canceled`);
    return canceledSubscription;
  } catch (error) {
    logger.error(`Error canceling subscription ${subscriptionId}:`, error);
    throw error;
  }
};

const pauseStripeSubscription = async (subscriptionId) => {
  try {
    const pausedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        pause_collection: { behavior: "void" },
      },
    );
    if (pausedSubscription.pause_collection?.behavior === "void") {
      await db
        .updateTable("subscriptions")
        .set({ status: "paused", auto_renew: false })
        .where("stripe_subscription_id", "=", subscriptionId)
        .execute();
    }
    logger.info(`Subscription ${subscriptionId} paused`);
    return pausedSubscription;
  } catch (error) {
    logger.error(`Error pausing subscription ${subscriptionId}:`, error);
    throw error;
  }
};

const resumeStripeSubscription = async (subscriptionId) => {
  try {
    const resumedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        pause_collection: null,
      },
    );
    if (!resumedSubscription.pause_collection) {
      await db
        .updateTable("subscriptions")
        .set({ status: "active", auto_renew: true })
        .where("stripe_subscription_id", "=", subscriptionId)
        .execute();
    }
    logger.info(`Subscription ${subscriptionId} resumed`);
    return resumedSubscription;
  } catch (error) {
    logger.error(`Error resuming subscription ${subscriptionId}:`, error);
    throw error;
  }
};

const retrieveCustomerPaymentMethod = async (stripeuserId, paymentMethodId) => {
  try {
    const getCustomerPaymentMethod =
      await stripe.customers.retrievePaymentMethod(
        stripeuserId,
        paymentMethodId,
      );
    logger.info(`Retrieved payment method ${paymentMethodId}`);
    return getCustomerPaymentMethod;
  } catch (error) {
    logger.error(`Error retrieving payment method ${paymentMethodId}:`, error);
    throw error;
  }
};

const retrievePaymentMethod = async (paymentMethodId) => {
  try {
    const getPaymentMethod =
      await stripe.paymentMethods.retrieve(paymentMethodId);

    logger.info(`Retrieved payment method ${paymentMethodId}`);
    return getPaymentMethod;
  } catch (error) {
    logger.error(`Error retrieving payment method ${paymentMethodId}:`, error);
    throw error;
  }
};

const updateStripePaymentMethod = async (paymentMethodId, data) => {
  try {
    const updatedPaymentMethod = await stripe.paymentMethods.update(
      paymentMethodId,
      {
        billing_details: {
          name: data.full_name,
          email: data.email,
          address: {
            postal_code: data.zip_code,
          },
        },
      },
    );

    logger.info(`Payment method ${paymentMethodId} updated`);
    return updatedPaymentMethod;
  } catch (error) {
    logger.error(`Error updating payment method ${paymentMethodId}:`, error);
    throw error;
  }
};

module.exports = {
  createOrGetCustomer,
  deleteCustomer,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  createPrice,
  archivePrice,
  createCoupon,
  deleteCoupon,
  createSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  pauseStripeSubscription,
  resumeStripeSubscription,
  retrieveSubscription,
  retrieveCustomerPaymentMethod,
  updateStripePaymentMethod,
  retrievePaymentMethod,
};
