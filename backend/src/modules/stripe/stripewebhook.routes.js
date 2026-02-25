const express = require("express");
const stripeWebhookController = require("./stripewebhook.controller");
const router = express.Router();

router.post("/", stripeWebhookController.handleWebhook);

module.exports = router;
