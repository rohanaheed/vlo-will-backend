const nodemailer = require('nodemailer');
const { config } = require('./index');
const logger = require('../utils/logger');

let transporter = null;

const initializeEmailTransporter = () => {
  if (config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      // host: config.email.host,
      // port: config.email.port,
      // secure: config.email.port === 465,
      service:'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('Email transporter ready');
      }
    });
  } else {
    logger.warn('Email configuration incomplete, email sending disabled');
  }

  return transporter;
};

const getTransporter = () => {
  if (!transporter) {
    initializeEmailTransporter();
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const emailTransporter = getTransporter();

  if (!emailTransporter) {
    logger.warn(`Email not sent (transporter not configured): ${subject} to ${to}`);
    return null;
  }

  try {
    const info = await emailTransporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent successfully: ${subject} to ${to}`, { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error(`Failed to send email: ${subject} to ${to}`, error);
    throw error;
  }
};

module.exports = {
  initializeEmailTransporter,
  getTransporter,
  sendEmail,
};
