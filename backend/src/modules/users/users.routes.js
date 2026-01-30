const express = require('express');
const usersController = require('./users.controller');
const usersValidation = require('./users.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireSuperAdmin } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (paginated)
 * @access  Private (users:read permission)
 */
router.get(
  '/',
  requirePermission('users:read'),
  validate(usersValidation.getUsersQuerySchema),
  usersController.getUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (users:read permission or own profile)
 */
router.get(
  '/:id',
  validate(usersValidation.getUserByIdSchema),
  usersController.getUserById
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (users:update permission or own profile)
 */
router.put(
  '/:id',
  validate(usersValidation.updateUserSchema),
  usersController.updateUser
);

/**
 * @route   PUT /api/v1/users/:id/role
 * @desc    Assign role to user
 * @access  Private (super_admin only)
 */
router.put(
  '/:id/role',
  requireSuperAdmin(),
  validate(usersValidation.assignRoleSchema),
  usersController.assignRole
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Private (users:delete permission)
 */
router.delete(
  '/:id',
  requirePermission('users:delete'),
  validate(usersValidation.deleteUserSchema),
  usersController.deleteUser
);

module.exports = router;
