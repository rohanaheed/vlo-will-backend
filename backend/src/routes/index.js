const express = require('express');

// Import route modules
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const rolesRoutes = require('../modules/roles/roles.routes');
const permissionsRoutes = require('../modules/permissions/permissions.routes');
const willsRoutes = require('../modules/wills/wills.routes');
const testatorsRoutes = require('../modules/testators/testators.routes');
const executorsRoutes = require('../modules/executors/executors.routes');
const spousesRoutes = require('../modules/spouses/spouses.routes');
const beneficiariesRoutes = require('../modules/beneficiaries/beneficiaries.routes');
const assetsRoutes = require('../modules/assets/assets.routes');
const debtsRoutes = require('../modules/debts/debts.route');
const feedbackRoutes = require('../modules/feedback/feedback.routes')
const packagesRoutes = require('../modules/packages/packages.routes')
const paymentMethodRoutes = require('../modules/paymentmethods/paymentmethods.routes')
const paymentRoutes = require('../modules/payments/payment.routes')
const stripeWebhookRoutes = require('../modules/stripe/stripewebhook.routes')
const subscriptionRoutes = require('../modules/subscriptions/subscriptions.routes')

const router = express.Router();

// API version prefix
const API_PREFIX = '/api/v1';

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

router.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: 'v1',
  });
});

/**
 * Mount routes
 */

// Auth routes
router.use(`${API_PREFIX}/auth`, authRoutes);

// Users routes
router.use(`${API_PREFIX}/users`, usersRoutes);

// Roles routes
router.use(`${API_PREFIX}/roles`, rolesRoutes);

// Permissions routes
router.use(`${API_PREFIX}/permissions`, permissionsRoutes);

router.use(`${API_PREFIX}/wills`, willsRoutes);

// Legacy individual endpoints (still available for granular operations)
router.use(`${API_PREFIX}/wills/:willId/testators`, testatorsRoutes);
router.use(`${API_PREFIX}/wills/:willId/executors`, executorsRoutes);
router.use(`${API_PREFIX}/wills/:willId/spouses`, spousesRoutes);
router.use(`${API_PREFIX}/wills/:willId/beneficiary`, beneficiariesRoutes);
router.use(`${API_PREFIX}/wills/:willId/assets`, assetsRoutes);
router.use(`${API_PREFIX}/wills/:willId/debts`, debtsRoutes);

// Feedback Routes
router.use(`${API_PREFIX}/feedback`, feedbackRoutes);

// Packages Routes
router.use(`${API_PREFIX}/packages`, packagesRoutes)

// Payment Method Routes
router.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes)

// Payment Routes
router.use(`${API_PREFIX}/payments`, paymentRoutes)

// Stripe Webhook Routes
router.use(`${API_PREFIX}/stripe/webhook`, stripeWebhookRoutes);

// Subscription Routes
router.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes)
// Admin routes
// router.use(`${API_PREFIX}/admin`, adminRoutes);

// Subscriptions routes
// router.use(`${API_PREFIX}/subscriptions`, subscriptionsRoutes);

module.exports = router;
