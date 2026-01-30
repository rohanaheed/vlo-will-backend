const express = require('express');
const rolesController = require('./roles.controller');
const rolesValidation = require('./roles.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireSuperAdmin } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private (roles:read permission)
 */
router.get(
  '/',
  requirePermission('roles:read'),
  rolesController.getRoles
);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Private (roles:read permission)
 */
router.get(
  '/:id',
  requirePermission('roles:read'),
  validate(rolesValidation.getRoleByIdSchema),
  rolesController.getRoleById
);

/**
 * @route   POST /api/v1/roles
 * @desc    Create new role
 * @access  Private (super_admin only)
 */
router.post(
  '/',
  requireSuperAdmin(),
  validate(rolesValidation.createRoleSchema),
  rolesController.createRole
);

/**
 * @route   PUT /api/v1/roles/:id
 * @desc    Update role
 * @access  Private (super_admin only)
 */
router.put(
  '/:id',
  requireSuperAdmin(),
  validate(rolesValidation.updateRoleSchema),
  rolesController.updateRole
);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    Delete role
 * @access  Private (super_admin only)
 */
router.delete(
  '/:id',
  requireSuperAdmin(),
  validate(rolesValidation.deleteRoleSchema),
  rolesController.deleteRole
);

/**
 * @route   POST /api/v1/roles/:id/permissions
 * @desc    Assign permissions to role
 * @access  Private (super_admin only)
 */
router.post(
  '/:id/permissions',
  requireSuperAdmin(),
  validate(rolesValidation.assignPermissionsSchema),
  rolesController.assignPermissions
);

/**
 * @route   DELETE /api/v1/roles/:id/permissions
 * @desc    Remove permissions from role
 * @access  Private (super_admin only)
 */
router.delete(
  '/:id/permissions',
  requireSuperAdmin(),
  validate(rolesValidation.removePermissionsSchema),
  rolesController.removePermissions
);

module.exports = router;
