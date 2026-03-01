const { db } = require("../../db");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { generateInvoicePDF } = require("../../config/pdf");
const { generateInvoiceEmail } = require("../../utils/emailTemplate");
const { sendEmail } = require("../../config/email");
const logger = require("../../utils/logger");

// Get an invoice by ID (with ownership check)
const getInvoiceById = async (invoiceId, userId) => {
  const invoice = await db
    .selectFrom("invoices")
    .selectAll()
    .where("id", "=", invoiceId)
    .executeTakeFirst();

  if (!invoice) throw new NotFoundError("Invoice not found");

  if (invoice.user_id !== userId) {
    throw new BadRequestError("You do not have access to this invoice");
  }

  return invoice;
};

// Download invoice as PDF
const downloadInvoice = async (invoiceId, userId) => {
  const invoice = await getInvoiceById(invoiceId, userId);

  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  // Get the payment record for this invoice
  const payment = await db
    .selectFrom("payments")
    .selectAll()
    .where("invoice_id", "=", invoice.invoice_number)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  // Get the user's active payment method
  const paymentMethod = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("user_id", "=", userId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  const pdfBuffer = await generateInvoicePDF({
    invoice,
    user,
    payment: payment || {},
    paymentMethod: paymentMethod || {},
  });

  return {
    pdfBuffer,
    filename: `Invoice-${invoice.invoice_number}.pdf`,
  };
};

// Send invoice via email
const sendInvoice = async (invoiceId, userId) => {
  const invoice = await getInvoiceById(invoiceId, userId);

  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) throw new NotFoundError("User not found");

  if (!user.email) {
    throw new BadRequestError("User does not have an email address");
  }

  // Get the payment record for this invoice
  const payment = await db
    .selectFrom("payments")
    .selectAll()
    .where("invoice_id", "=", invoice.invoice_number)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  // Get the user's active payment method
  const paymentMethod = await db
    .selectFrom("payment_methods")
    .selectAll()
    .where("user_id", "=", userId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  const pdfBuffer = await generateInvoicePDF({
    invoice,
    user,
    payment: payment || {},
    paymentMethod: paymentMethod || {},
  });

  const emailTemplate = generateInvoiceEmail({
    customerName: user.name,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    totalAmount: invoice.total,
    status: invoice.status,
    transactionId: payment?.transaction_id,
    paymentDate: payment?.payment_date,
    pdfBuffer,
  });

  await sendEmail({
    to: user.email,
    ...emailTemplate,
  });

  logger.info(
    `Invoice ${invoice.invoice_number} sent to ${user.email} for user ${userId}`,
  );

  return { message: `Invoice sent to ${user.email}` };
};

module.exports = {
  getInvoiceById,
  downloadInvoice,
  sendInvoice,
};
