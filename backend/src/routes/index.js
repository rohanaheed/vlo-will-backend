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

// Wills routes (includes unified step endpoints)
// 
// RECOMMENDED: Use unified step endpoints for multi-step form:
//   GET  /api/v1/wills/:id/steps/:stepNumber  - Get step data
//   PUT  /api/v1/wills/:id/steps/:stepNumber  - Save step data + auto-advance
//
// This reduces API calls from 2 (save data + update step) to 1
//
router.use(`${API_PREFIX}/wills`, willsRoutes);

// Legacy individual endpoints (still available for granular operations)
router.use(`${API_PREFIX}/wills/:willId/testator`, testatorsRoutes);
router.use(`${API_PREFIX}/wills/:willId/executors`, executorsRoutes);
router.use(`${API_PREFIX}/wills/:willId/spouse`, spousesRoutes);

// Admin routes
// router.use(`${API_PREFIX}/admin`, adminRoutes);

// Subscriptions routes
// router.use(`${API_PREFIX}/subscriptions`, subscriptionsRoutes);

module.exports = router;
