const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { config } = require("../config/index")

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

const decrypt = (data) => {
  const inputIV = data.slice(0, 32);
  const encrypted = data.slice(32);

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key),
    Buffer.from(inputIV, "hex")
  );

  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
};

const generateInvoicePDF = async (invoiceData) => {
  const { invoice, user, payment, paymentMethod } = invoiceData;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const LightFontPath = path.resolve(__dirname, '../../public/fonts/NotoSans-Light.ttf');
  const BoldFontPath  = path.resolve(__dirname, '../../public/fonts/NotoSans-SemiBold.ttf');
  const logoPath      = path.resolve(__dirname, '../../public/images/law_nest_logo.png');

  const LightFontBytes = fs.readFileSync(LightFontPath);
  const BoldFontBytes  = fs.readFileSync(BoldFontPath);
  const regularFont    = await pdfDoc.embedFont(LightFontBytes);
  const boldFont       = await pdfDoc.embedFont(BoldFontBytes);

  // Load and embed logo
  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  const currencySymbol = '£';
  const navy     = rgb(0, 0.13, 0.27);
  const lightGray = rgb(0.92, 0.92, 0.92);
  const textColor = rgb(0, 0, 0);
  const tealLabel = rgb(0, 0.33, 0.53);

  const leftMargin  = 40;
  const rightMargin = 40;

  // Top Bar (navy left -> diagonal -> gray right)

  const topBarH = 12;
  const diagW   = 40;
  const bound   = width * 0.75;

  for (let x = 0; x < width; x++) {
    if (x < bound - diagW) {
      page.drawRectangle({ x, y: height - topBarH, width: 1, height: topBarH, color: navy });
    } else if (x < bound) {
      const p = (x - (bound - diagW)) / diagW;
      const h = topBarH * (1 - p);
      page.drawRectangle({ x, y: height - h,     width: 1, height: h,          color: navy });
      page.drawRectangle({ x, y: height - topBarH, width: 1, height: topBarH - h, color: lightGray });
    } else {
      page.drawRectangle({ x, y: height - topBarH, width: 1, height: topBarH, color: lightGray });
    }
  }

  let y = height - topBarH - 35;

  // Logo

  if (logoImage) {
    page.drawImage(logoImage, { x: leftMargin, y: y - 20, width: 110, height: 50 });
  } else {
    page.drawText('LAWNEST', { x: leftMargin, y: y, size: 16, font: boldFont, color: navy });
  }

  // Invoice Receipt title

  page.drawText('Invoice Receipt', {
    x: width - 210, y: y + 5, size: 20, font: boldFont, color: textColor,
  });

  y -= 55;

  // Invoice meta (right-aligned)

  const metaLabelX = width - 280;
  const metaValueX = width - 160;
  let metaY = y + 10;

  const drawMeta = (label, value) => {
    page.drawText(label, { x: metaLabelX, y: metaY, size: 9, font: regularFont, color: textColor });
    page.drawText(value, { x: metaValueX, y: metaY, size: 9, font: boldFont, color: textColor });
    metaY -= 14;
  };

  drawMeta('Invoice ID:', invoice.invoice_number || '');
  drawMeta('Date Issued:', invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : '');

  // Billing period
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  const firstItem = items[0] || {};
  if (firstItem.billing_cycle) {
    const start = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : '';
    const end   = invoice.due_date     ? new Date(invoice.due_date).toLocaleDateString('en-GB')     : '';
    drawMeta('Billing Period:', `${start} - ${end}`);
  } else if (invoice.due_date) {
    drawMeta('Due Date:', new Date(invoice.due_date).toLocaleDateString('en-GB'));
  }

  y = metaY - 20;

  // Billed From

  let leftY = y;
  page.drawText('Billed from:', { x: leftMargin, y: leftY, size: 11, font: boldFont, color: textColor });
  leftY -= 18;

  page.drawText('LawNest.Co.', { x: leftMargin, y: leftY, size: 9, font: boldFont, color: textColor });
  leftY -= 13;

  const fromLines = ['Model45 Broadway', 'High Street Uxbridge UB8 1LD'];
  for (const line of fromLines) {
    page.drawText(line, { x: leftMargin, y: leftY, size: 8, font: regularFont, color: textColor });
    leftY -= 12;
  }

  // Phone
  page.drawText('Phone: ', { x: leftMargin, y: leftY, size: 8, font: boldFont, color: textColor });
  page.drawText('+44 789 123456', { x: leftMargin + 35, y: leftY, size: 8, font: regularFont, color: textColor });
  leftY -= 12;

  // Email
  page.drawText('Email: ', { x: leftMargin, y: leftY, size: 8, font: boldFont, color: textColor });
  page.drawText('billing@lawnest.co.uk', { x: leftMargin + 32, y: leftY, size: 8, font: regularFont, color: textColor });
  leftY -= 12;

  // Billed To

  const billedToX = 310;
  let rightY = y;

  page.drawText('Billed to:', { x: billedToX, y: rightY, size: 11, font: boldFont, color: textColor });
  rightY -= 18;

  // Name
  page.drawText('Name: ', { x: billedToX, y: rightY, size: 8, font: boldFont, color: textColor });
  page.drawText(user?.name || 'Customer', { x: billedToX + 33, y: rightY, size: 8, font: regularFont, color: textColor });
  rightY -= 12;

  // Company
  if (user?.company) {
    page.drawText('Company: ', { x: billedToX, y: rightY, size: 8, font: boldFont, color: textColor });
    page.drawText(user.company, { x: billedToX + 50, y: rightY, size: 8, font: regularFont, color: textColor });
    rightY -= 12;
  }

  // Email
  if (user?.email) {
    page.drawText('Email: ', { x: billedToX, y: rightY, size: 8, font: boldFont, color: textColor });
    page.drawText(user.email, { x: billedToX + 33, y: rightY, size: 8, font: regularFont, color: textColor });
    rightY -= 12;
  }

  // Address
  if (user?.address) {
    page.drawText('Address: ', { x: billedToX, y: rightY, size: 8, font: boldFont, color: textColor });
    page.drawText(user.address, { x: billedToX + 44, y: rightY, size: 8, font: regularFont, color: textColor });
    rightY -= 12;
  }

  y = Math.min(leftY, rightY) - 10;

  // Payment Summary heading

  page.drawText('Payment Summary', { x: leftMargin, y: y, size: 10, font: boldFont, color: textColor });
  y -= 20;

  // Table header

  const col1 = leftMargin + 5;
  const col2 = 255;
  const col3 = 310;
  const col4 = 390;
  const col5 = 480;

  page.drawRectangle({
    x: leftMargin, y: y - 3,
    width: width - leftMargin - rightMargin,
    height: 18,
    color: lightGray,
  });

  page.drawText('Description', { x: col1, y: y + 2, size: 8, font: boldFont, color: textColor });
  page.drawText('Quantity',    { x: col2, y: y + 2, size: 8, font: boldFont, color: textColor });
  page.drawText('Unit Price',  { x: col3, y: y + 2, size: 8, font: boldFont, color: textColor });
  page.drawText('VAT',         { x: col4, y: y + 2, size: 8, font: boldFont, color: textColor });
  page.drawText('Amount',      { x: col5, y: y + 2, size: 8, font: boldFont, color: textColor });

  y -= 22;

  // Table rows

  for (const item of items) {
    const desc    = item.name || item.description || '';
    const qty     = item.quantity || 1;
    const price   = Number(item.price || 0);
    const sub     = Number(item.subtotal || 0);
    const vatPct  = Number(item.vat || 0);
    const vatAmt  = vatPct > 0 ? (sub * vatPct / 100) : 0;
    const vatText = vatPct > 0 ? `${vatPct}% (${currencySymbol}${vatAmt.toFixed(2)})` : '0%';

    page.drawText(desc,                                    { x: col1, y, size: 8, font: regularFont, color: textColor });
    page.drawText(String(qty),                             { x: col2 + 15, y, size: 8, font: regularFont, color: textColor });
    page.drawText(`${currencySymbol} ${price.toFixed(2)}`, { x: col3, y, size: 8, font: regularFont, color: textColor });
    page.drawText(vatText,                                 { x: col4, y, size: 8, font: regularFont, color: textColor });
    page.drawText(`${currencySymbol}${sub.toFixed(2)}`,    { x: col5, y, size: 8, font: regularFont, color: textColor });

    y -= 18;
  }

  y -= 10;

  // Totals (right-aligned)

  const totLabelX = 385;
  const totValueX = 480;

  const subtotal = Number(invoice.subtotal || 0);
  const tax      = Number(invoice.vat_amount || 0);
  const total    = Number(invoice.total || 0);

  page.drawText('Subtotal:', { x: totLabelX, y, size: 9, font: regularFont, color: textColor });
  page.drawText(`${currencySymbol}${subtotal.toFixed(2)}`, { x: totValueX, y, size: 9, font: boldFont, color: textColor });
  y -= 15;

  page.drawText(`Tax (20% VAT):`, { x: totLabelX, y, size: 9, font: regularFont, color: textColor });
  page.drawText(`${currencySymbol}${tax.toFixed(2)}`, { x: totValueX, y, size: 9, font: boldFont, color: textColor });
  y -= 15;

  page.drawText('Total Paid:', { x: totLabelX, y, size: 10, font: boldFont, color: textColor });
  page.drawText(`${currencySymbol}${total.toFixed(2)} GBP`, { x: totValueX, y, size: 10, font: boldFont, color: textColor });

  y -= 40;

  // Payment Details

  page.drawText('Payment Details:', { x: leftMargin, y, size: 11, font: boldFont, color: textColor });
  y -= 16;

  let cardDisplay = 'Card •••• ****';
  try {
    if (paymentMethod?.card_number) {
      const decrypted = decrypt(paymentMethod.card_number);
      const last4 = decrypted.slice(-4);
      const brand = paymentMethod?.brand
        ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
        : 'Card';
      cardDisplay = `${brand} •••• ${last4}`;
    }
  } catch (e) {
  }

  const details = [
    { label: 'Payment Method: ', value: cardDisplay },
    { label: 'Transaction ID: ', value: payment?.transaction_id || 'N/A' },
    { label: 'Payment Date: ',   value: payment?.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : 'N/A' },
    { label: 'Status: ',         value: invoice?.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'N/A' },
  ];

  for (const d of details) {
    const labelW = boldFont.widthOfTextAtSize(d.label, 8);
    page.drawText(d.label, { x: leftMargin, y, size: 8, font: boldFont, color: textColor });
    page.drawText(d.value, { x: leftMargin + labelW, y, size: 8, font: regularFont, color: textColor });
    y -= 13;
  }


  const bottomY = 120;

  page.drawRectangle({ x: leftMargin, y: bottomY - 50, width: 55, height: 55, color: rgb(0.93, 0.93, 0.93) });
  page.drawText('[QR Code]', { x: leftMargin + 8, y: bottomY - 25, size: 7, font: regularFont, color: textColor });

    // Signature

  const sigX = width - 170;

  page.drawLine({
    start: { x: sigX, y: bottomY },
    end:   { x: width - rightMargin, y: bottomY },
    thickness: 0.5,
    color: textColor,
  });

  page.drawText('LawNest', {
    x: sigX + 40, y: bottomY - 15, size: 10, font: boldFont, color: textColor,
  });
  page.drawText('Executive Director', {
    x: sigX + 25, y: bottomY - 28, size: 8, font: regularFont, color: textColor,
  });

  // Footer

  const footY = bottomY - 65;

  // "Thank you" line with bold "LawNest"
  const ty = footY;
  const pre  = 'Thank you for renewing your subscription with ';
  const bold = 'LawNest';
  const post = ' Ltd.';
  const preW  = regularFont.widthOfTextAtSize(pre, 7);
  const boldW = boldFont.widthOfTextAtSize(bold, 7);
  const totalFootW = preW + boldW + regularFont.widthOfTextAtSize(post, 7);
  const footStartX = (width - totalFootW) / 2;

  page.drawText(pre,  { x: footStartX,              y: ty, size: 7, font: regularFont, color: textColor });
  page.drawText(bold, { x: footStartX + preW,        y: ty, size: 7, font: boldFont,    color: textColor });
  page.drawText(post, { x: footStartX + preW + boldW, y: ty, size: 7, font: regularFont, color: textColor });

  // "For billing questions" with bold email
  const bq1 = 'For billing questions, contact: ';
  const bq2 = 'billing@lawnest.uk';
  const bq1W = regularFont.widthOfTextAtSize(bq1, 7);
  const bq2W = boldFont.widthOfTextAtSize(bq2, 7);
  const bqStartX = (width - bq1W - bq2W) / 2;
  page.drawText(bq1, { x: bqStartX,        y: ty - 12, size: 7, font: regularFont, color: textColor });
  page.drawText(bq2, { x: bqStartX + bq1W, y: ty - 12, size: 7, font: boldFont,    color: textColor });

  // "Visit" with bold URL
  const v1 = 'Visit: ';
  const v2 = 'www.lawnest.co.uk';
  const v1W = regularFont.widthOfTextAtSize(v1, 7);
  const v2W = boldFont.widthOfTextAtSize(v2, 7);
  const vStartX = (width - v1W - v2W) / 2;
  page.drawText(v1, { x: vStartX,       y: ty - 24, size: 7, font: regularFont, color: textColor });
  page.drawText(v2, { x: vStartX + v1W, y: ty - 24, size: 7, font: boldFont,    color: textColor });

  // Bottom Bar (gray left -> diagonal -> navy right)

  const botH = 12;
  const botBound = width * 0.25;
  const botDiag  = 40;

  for (let x = 0; x < width; x++) {
    if (x < botBound - botDiag) {
      page.drawRectangle({ x, y: 0, width: 1, height: botH, color: lightGray });
    } else if (x < botBound) {
      const p = (x - (botBound - botDiag)) / botDiag;
      const h = botH * (1 - p);
      page.drawRectangle({ x, y: 0, width: 1, height: h,      color: lightGray });
      page.drawRectangle({ x, y: h, width: 1, height: botH - h, color: navy });
    } else {
      page.drawRectangle({ x, y: 0, width: 1, height: botH, color: navy });
    }
  }

  return await pdfDoc.save();
};

module.exports = { generateInvoicePDF };
