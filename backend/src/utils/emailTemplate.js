const generateInvoiceEmail = (data) => {
  const {
    customerName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    status,
    transactionId,
    paymentDate,
    pdfBuffer,
  } = data;

  const formattedDate = (date) =>
    new Date(date).toLocaleDateString("en-GB");

  let statusBlock = "";

  switch (status) {
    case "paid":
      statusBlock = `
        <h3 style="color:#2e7d32;">Payment Received</h3>
        <p>Your payment has been successfully received.</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Payment Date:</strong> ${formattedDate(paymentDate)}</p>
      `;
      break;

    case "unpaid":
      statusBlock = `
        <h3 style="color:#f57c00;">Payment Required</h3>
        <p>This invoice is currently unpaid.</p>
        <p>Please complete payment before the due date.</p>
      `;
      break;

    case "past_due":
      statusBlock = `
        <h3 style="color:#c62828;">Invoice Past Due</h3>
        <p>This invoice is overdue.</p>
        <p>Immediate payment is required.</p>
      `;
      break;

    case "pending":
      statusBlock = `
        <h3 style="color:#1565c0;">Payment Pending</h3>
        <p>Your payment is currently being processed.</p>
      `;
      break;

    case "draft":
      statusBlock = `
        <h3 style="color:#616161;">Draft Invoice</h3>
        <p>This invoice is in draft status.</p>
      `;
      break;

    default:
      statusBlock = `<p>Status: ${status}</p>`;
  }

  const html = `
  <div style="font-family: Arial, sans-serif; max-width:600px;">
    <h2>Invoice ${invoiceNumber}</h2>
    <p>Hi ${customerName},</p>

    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td><strong>Invoice Number:</strong></td>
        <td>${invoiceNumber}</td>
      </tr>
      <tr>
        <td><strong>Issue Date:</strong></td>
        <td>${formattedDate(invoiceDate)}</td>
      </tr>
      <tr>
        <td><strong>Due Date:</strong></td>
        <td>${formattedDate(dueDate)}</td>
      </tr>
      <tr>
        <td><strong>Total Amount:</strong></td>
        <td>£${Number(totalAmount).toFixed(2)} GBP</td>
      </tr>
    </table>

    <hr style="margin:20px 0;" />

    ${statusBlock}

    <p style="margin-top:20px;">
      A PDF copy of your invoice is attached.
    </p>

    <p>
      For billing support contact:
      <a href="mailto:billing@lawnest.co.uk">billing@lawnest.co.uk</a>
    </p>

    <p>Regards,<br/>LawNest Team</p>
  </div>
  `;

  const text = `
Invoice ${invoiceNumber}

Hi ${customerName},

Invoice Number: ${invoiceNumber}
Issue Date: ${formattedDate(invoiceDate)}
Due Date: ${formattedDate(dueDate)}
Total Amount: £${Number(totalAmount).toFixed(2)} GBP

Status: ${status}

LawNest Team
`;

  return {
    subject: `Invoice ${invoiceNumber} - ${status.toUpperCase()}`,
    html,
    text,
    attachments: pdfBuffer
      ? [
          {
            filename: `Invoice-${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [],
  };
};

module.exports = { generateInvoiceEmail }