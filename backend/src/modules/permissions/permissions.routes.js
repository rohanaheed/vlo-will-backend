const express = require('express');
const permissionsController = require('./permissions.controller');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/permissions
 * @desc    Get all permissions
 * @access  Private (roles:read permission)
 */
router.get(
  '/',
  requirePermission('roles:read'),
  permissionsController.getPermissions
);

/**
 * @route   GET /api/v1/permissions/grouped
 * @desc    Get permissions grouped by module
 * @access  Private (roles:read permission)
 */
router.get(
  '/grouped',
  requirePermission('roles:read'),
  permissionsController.getPermissionsByModule
);

module.exports = router;
