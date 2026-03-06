const { config } = require("../../config");
const { db } = require("../../db");
const { NotFoundError } = require("../../utils/errors");
const logger = require("../../utils/logger");
const crypto = require("crypto");
const {
  retrievePaymentMethod,
  updateStripePaymentMethod,
  createOrGetCustomer,
} = require("../../utils/stripe");

const { generateUUID } = require("../../utils/helpers");
const { getStripe } = require("../../config/stripe");
const stripe = getStripe();

const algorithm = "aes-256-cbc";
const secret = config.encryption.secret;

if (!secret) {
  throw new Error("Encryption key not found in environment variables");
}

const key = crypto
  .createHash("sha512")
  .update(secret)
  .digest("hex")
  .substring(0, 32);

const encrypt = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(data, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + encrypted;
};
const decrypt = (data) => {
  const inputIV = data.slice(0, 32);
  const encrypted = data.slice(32);
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key),
    Buffer.from(inputIV, "hex"),
  );
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
};

const maskCard = (cardNumber) => {
  try {
    const decrypted = decrypt(cardNumber);
    return `${decrypted.slice(0, 4)}-****-****-****`;
  } catch {
    return "****-****-****-****";
  }
};

const createPaymentMethod = async (data, userId) => {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const customer = await createOrGetCustomer(user);
  await stripe.paymentMethods.attach(data.stripe_payment_method_id, {
    customer: customer.id,
  });

  const stripePM = await retrievePaymentMethod(data.stripe_payment_method_id);

  await db
    .updateTable("payment_methods")
    .set({
      is_default: false,
      updated_at: new Date(),
    })
    .where("user_id", "=", user.id)
    .where("is_default", "=", true)
    .execute();

  const created = await db
    .insertInto("payment_methods")
    .values({
      id: generateUUID(),
      user_id: user.id,
      stripe_payment_method_id: stripePM.id,
      full_name: stripePM.billing_details.name,
      email: stripePM.billing_details.email,
      card_number: encrypt(stripePM.card.last4),
      cvv: "***",
      zip_code: stripePM.billing_details.address.postal_code,
      exp_month: stripePM.card.exp_month,
      exp_year: stripePM.card.exp_year,
      brand: stripePM.card.brand,
      method_type: "stripe",
      payment_type: stripePM.type,
      is_default: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  const activeSubscriptions = await db
    .selectFrom("subscriptions")
    .selectAll()
    .where("user_id", "=", user.id)
    .where((eb) =>
      eb.or([eb("status", "=", "active"), eb("status", "=", "trialing")]),
    )
    .where("stripe_subscription_id", "is not", null)
    .execute();

  if (activeSubscriptions.length > 0) {
    await Promise.all(
      activeSubscriptions.map((sub) =>
        stripe.subscriptions.update(sub.stripe_subscription_id, {
          default_payment_method: stripePM.id,
        }),
      ),
    );
    logger.info(
      `Synced payment method to ${activeSubscriptions.length} subscription(s) for user: ${user.id}`,
    );
  }

  const maskPaymentMethod = {
    ...created,
    card_number: `****-****-****-${decrypt(created.card_number)}`,
    cvv: "***",
    exp_month: "**",
    exp_year: "****",
  };
  logger.info("Payment method created", {
    userId: user.id,
    paymentMethodId: created.id,
  });

  return maskPaymentMethod;
};

const updatePaymentMethod = async (id, data, userId) => {
  const existing = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError("Payment method not found");
  }

  if (
    data.stripe_payment_method_id &&
    data.stripe_payment_method_id !== existing.stripe_payment_method_id
  ) {
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();

    const stripePM = await retrievePaymentMethod(data.stripe_payment_method_id);

    await stripe.paymentMethods.attach(stripePM.id, {
      customer: user.stripe_customer_id,
    });

    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: stripePM.id,
      },
    });

    await db
      .updateTable("payment_methods")
      .set({
        is_active: false,
        is_default: false,
        updated_at: new Date(),
      })
      .where("user_id", "=", userId)
      .where("is_default", "=", true)
      .execute();

    const newPaymentMethod = await db
      .insertInto("payment_methods")
      .values({
        id: generateUUID(),
        user_id: user.id,
        stripe_payment_method_id: stripePM.id,
        full_name: stripePM.billing_details.name,
        email: stripePM.billing_details.email,
        zip_code: stripePM.billing_details.address?.postal_code,
        card_number: encrypt(stripePM.card.last4),
        cvv: "***",
        exp_month: stripePM.card.exp_month,
        exp_year: stripePM.card.exp_year,
        brand: stripePM.card.brand,
        method_type: "stripe",
        payment_type: stripePM.type,
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();
    const activeSubscriptions = await db
      .selectFrom("subscriptions")
      .selectAll()
      .where("user_id", "=", user.id)
      .where((eb) =>
        eb.or([eb("status", "=", "active"), eb("status", "=", "trialing")]),
      )
      .where("stripe_subscription_id", "is not", null)
      .execute();

    if (activeSubscriptions.length > 0) {
      await Promise.all(
        activeSubscriptions.map((sub) =>
          stripe.subscriptions.update(sub.stripe_subscription_id, {
            default_payment_method: stripePM.id,
          }),
        ),
      );
      logger.info(
        `Synced payment method to ${activeSubscriptions.length} subscription(s) for user: ${user.id}`,
      );
    }
    const maskPaymentMethod = {
      ...newPaymentMethod,
      card_number: `****-****-****-${decrypt(newPaymentMethod.card_number)}`,
      cvv: "***",
      exp_month: "**",
      exp_year: "****",
    };
    logger.info("Payment method updated", {
      userId: user.id,
      paymentMethodId: newPaymentMethod.id,
    });
    return maskPaymentMethod;
  }

  await updateStripePaymentMethod(existing.stripe_payment_method_id, data);

  const updated = await db
    .updateTable("payment_methods")
    .set({
      full_name: data.full_name,
      email: data.email,
      zip_code: data.zip_code,
      updated_at: new Date(),
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  const maskPaymentMethod = {
    ...updated,
    card_number: `****-****-****-${decrypt(updated.card_number)}`,
    cvv: "***",
    exp_month: "**",
    exp_year: "****",
  };
  logger.info("Payment method updated", {
    userId: userId,
    paymentMethodId: updated.id,
  });
  return maskPaymentMethod;
};

const getAllPaymentMethods = async (query, userId, userRole) => {
  const { page, limit, offset } = parsePaginationParams(query);

  const { sortBy, sortOrder } = parseSortParams(query, [
    "created_at",
    "updated_at",
    "is_default",
    "is_active",
  ]);

  let baseQuery = db
    .selectFrom("payment_methods")
    .select([
      "id",
      "user_id",
      "stripe_payment_method_id",
      "full_name",
      "email",
      "zip_code",
      "last4",
      "exp_month",
      "exp_year",
      "brand",
      "method_type",
      "is_default",
      "is_active",
      "created_at",
      "updated_at",
    ]);

  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    baseQuery = baseQuery.where("user_id", "=", userId);
  }

  // Optional filters
  if (query.is_active !== undefined) {
    baseQuery = baseQuery.where("is_active", "=", query.is_active === "true");
  }

  if (query.method_type) {
    baseQuery = baseQuery.where("method_type", "=", query.method_type);
  }

  let countQuery = db
    .selectFrom("payment_methods")
    .select(db.fn.count("id").as("count"));

  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    countQuery = countQuery.where("user_id", "=", userId);
  }

  if (query.is_active !== undefined) {
    countQuery = countQuery.where("is_active", "=", query.is_active === "true");
  }

  if (query.method_type) {
    countQuery = countQuery.where("method_type", "=", query.method_type);
  }

  const countResult = await countQuery.executeTakeFirst();
  const totalItems = parseInt(countResult?.count || 0, 10);

  const paymentMethods = await baseQuery
    .orderBy(sortBy, sortOrder)
    .limit(limit)
    .offset(offset)
    .execute();

  return {
    paymentMethods,
    pagination: calculatePagination(totalItems, page, limit),
  };
};

const getPaymentMethodById = async (id, userId) => {
  const paymentMethod = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!paymentMethod) {
    throw new NotFoundError("Payment Method not found");
  }

  const maskPaymentMethod = {
    ...paymentMethod,
    card_number: `****-****-****-${decrypt(paymentMethod.card_number)}`,
    cvv: "***",
    exp_month: "**",
    exp_year: "****",
  };

  return maskPaymentMethod;
};

const getUserPaymentMethods = async (userId) => {
  const methods = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("is_default", "desc")
    .orderBy("is_active", "desc")
    .orderBy("created_at", "desc")
    .execute();

  const maskPaymentMethods = methods.map((method) => ({
    ...method,
    card_number: `****-****-****-${decrypt(method.card_number)}`,
    cvv: "***",
    exp_month: "**",
    exp_year: "****",
  }));
  return maskPaymentMethods;
};

const getDefaultPaymentMethods = async (userId) => {
  const methods = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("user_id", "=", userId)
    .where("is_default", "=", true)
    .executeTakeFirst();

  const maskPaymentMethod = {
    ...methods,
    card_number: `****-****-****-${decrypt(methods.card_number)}`,
    cvv: "***",
    exp_month: "**",
    exp_year: "****",
  };

  return maskPaymentMethod;
};

const deletePaymentMethod = async (id, userId) => {
  const existing = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError("Payment method not found");
  }

  await stripe.paymentMethods.detach(
    existing.stripe_payment_method_id
  );

  return { message: "Payment method removal initiated" };
};

module.exports = {
  createPaymentMethod,
  getAllPaymentMethods,
  getPaymentMethodById,
  getUserPaymentMethods,
  getDefaultPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
};
