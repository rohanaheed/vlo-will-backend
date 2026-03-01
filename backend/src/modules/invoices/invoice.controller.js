const invoiceService = require("./invoice.service");
const { sendSuccess } = require("../../utils/response");

// Download Invoice PDF
const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { pdfBuffer, filename } = await invoiceService.downloadInvoice(
      id,
      userId,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });

    return res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    next(error);
  }
};

// Send Invoice via Email
const sendInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await invoiceService.sendInvoice(id, userId);

    return sendSuccess(res, result, "Invoice sent successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadInvoice,
  sendInvoice,
};
