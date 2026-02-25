const express = require("express");
const paymentController = require("./payment.controller");
const { authenticate } = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimiter");
const router = express.Router();

router.use(authenticate);

const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many payment requests from this IP, please try again later",
});

router.post(
  "/process-payment",
  paymentLimiter,
  paymentController.processPayment,
);

module.exports = router;
