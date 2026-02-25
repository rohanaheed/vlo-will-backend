const express = require("express");
const subscriptionController = require("./subscriptions.controller");
const { authenticate } = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimiter");
const { validate } = require("../../middleware/validate");
const subscriptionValidation = require("./subscriptions.validation");
const router = express.Router();

router.use(authenticate);
const subscriptionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many subscription write requests, please try again later",
});

router.get("/", subscriptionController.getUserSubscriptions);
router.post(
  "/",
  subscriptionLimiter,
  validate(subscriptionValidation.createSubscriptionSchema),
  subscriptionController.createUserSubscription,
);
router.put(
  "/:id/update-subscription",
  subscriptionLimiter,
  validate(subscriptionValidation.updateSubscriptionSchema),
  subscriptionController.updateUserSubscription,
);
router.put(
  "/:id/pause-subscription",
  subscriptionLimiter,
  subscriptionController.pauseUserSubscription,
);
router.put(
  "/:id/resume-subscription",
  subscriptionLimiter,
  subscriptionController.resumeUserSubscription,
);
router.put(
  "/:id/cancel-subscription",
  subscriptionLimiter,
  subscriptionController.cancelUserSubscription,
);

module.exports = router;
