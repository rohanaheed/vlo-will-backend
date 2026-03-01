const logger = require("../../utils/logger");
const { sendSuccess, sendCreated } = require("../../utils/response");
const { BadRequestError } = require("../../utils/errors");
const {
  createSubscription,
  getSubscriptionByUser,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  updateSubscription,
} = require("./subscriptions.service");

const createUserSubscription = async (req, res, next) => {
  try {
    const body = req.body;
    const user = req.user.id;

    const subscription = await createSubscription(body, user);

    logger.info(`Subscription created for user ${user}`);
    return sendCreated(res, subscription);
  } catch (error) {
    logger.error("Error creating subscription", error);
    next(error);
  }
};

const getUserSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscriptions = await getSubscriptionByUser(userId);
    return res.status(200).json({ subscriptions });
  } catch (error) {
    logger.error("Error fetching user subscriptions:", error);
    next(error);
  }
};

const pauseUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const pausedSubscription = await pauseSubscription(userId, id);

    logger.info(`Subscription ${id} paused for user: ${userId}`);

    return sendSuccess(res, {
      message: "Subscription paused successfully",
      pausedSubscription,
    });
  } catch (error) {
    logger.error("Error pausing subscription:", error);
    next(error);
  }
};

const resumeUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const resumedSubscription = await resumeSubscription(userId, id);

    logger.info(`Subscription ${id} resumed for user: ${userId}`);
    return sendSuccess(res, {
      message: "Subscription resumed successfully",
      resumedSubscription,
    });
  } catch (error) {
    logger.error("Error resuming subscription:", error);
    next(error);
  }
};

const cancelUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const canceledSubscription = await cancelSubscription(userId, id);

    logger.info(`Subscription ${id} cancelled for user: ${userId}`);
    return sendSuccess(res, {
      message: "Subscription cancelled successfully",
      canceledSubscription,
    });
  } catch (error) {
    logger.error("Error cancelling subscription:", error);
    next(error);
  }
};

const updateUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { packageId, paymentMethodId, autoRenew } = req.body;

    if (!packageId) {
      throw new BadRequestError("packageId is required");
    }

    const updatedSubscription = await updateSubscription(
      userId,
      id,
      packageId,
      paymentMethodId,
      autoRenew,
    );
    logger.info(
      `Subscription ${id} updated to package ${updatedSubscription.name} for user: ${userId}`,
    );
    return sendSuccess(res, {
      message: "Subscription updated successfully",
      updatedSubscription,
    });
  } catch (error) {
    logger.error("Error updating subscription:", error);
    next(error);
  }
};

module.exports = {
  getUserSubscriptions,
  pauseUserSubscription,
  resumeUserSubscription,
  cancelUserSubscription,
  updateUserSubscription,
  createUserSubscription,
};
