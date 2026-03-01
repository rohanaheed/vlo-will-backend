const express = require("express");
const invoiceController = require("./invoice.controller");
const { authenticate } = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

const invoiceLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many invoice requests, please try again later",
});

router.use(authenticate);

// GET /invoices/:id/download — download invoice as PDF
router.get("/:id/download", invoiceLimiter, invoiceController.downloadInvoice);

// POST /invoices/:id/send — send invoice via email
router.post("/:id/send", invoiceLimiter, invoiceController.sendInvoice);

module.exports = router;
