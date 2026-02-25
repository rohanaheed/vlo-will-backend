const express = require("express");
const paymentMethodsController = require("./paymentmethods.controller");
const paymentMethodsValidation = require("./paymentmethods.validation");
const { authenticate } = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimiter");
const { validate } = require("../../middleware/validate");
const router = express.Router();

router.use(authenticate);
const methodWriteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many payment method write requests, please try again later",
});

router.get(
  "/all-payment-methods",
  paymentMethodsController.getAllPaymentMethods,
);

router.get("/:id", paymentMethodsController.getPaymentMethodById);

router.get(
  "/:id/user-payment-methods",
  paymentMethodsController.getUserPaymentMethods,
);

router.get("/:id/default", paymentMethodsController.getDefaultPaymentMethods);

router.post(
  "/create-payment-method",
  validate(paymentMethodsValidation.createPaymentMethodSchema),
  methodWriteLimiter,
  paymentMethodsController.createPaymentMethod,
);

router.put(
  "/:id/update-payment-method",
  validate(paymentMethodsValidation.updatePaymentMethodSchema),
  methodWriteLimiter,
  paymentMethodsController.updatePaymentMethod,
);

router.delete(
  "/:id/delete-payment-method",
  paymentMethodsController.deletePaymentMethod,
);

module.exports = router;
