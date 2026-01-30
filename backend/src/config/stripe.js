const Stripe = require('stripe');
const { config } = require('./index');
const logger = require('../utils/logger');

let stripe = null;

const initializeStripe = () => {
  if (config.stripe.secretKey) {
    stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
    logger.info('Stripe initialized');
  } else {
    logger.warn('Stripe secret key not configured');
  }
  return stripe;
};

const getStripe = () => {
  if (!stripe) {
    initializeStripe();
  }
  return stripe;
};

module.exports = {
  initializeStripe,
  getStripe,
};
