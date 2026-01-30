const usersService = require('./users.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('../../utils/response');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

/**
 * Get all users
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { users, pagination } = await usersService.getUsers(req.query);

    return sendPaginated(res, users, pagination, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);

    return sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const originalUser = await usersService.getUserById(req.params.id);
    const user = await usersService.updateUser(req.params.id, req.body, req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'user',
      entityId: req.params.id,
      oldValues: originalUser,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { user }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Assign role to user
 * PUT /api/v1/users/:id/role
 */
const assignRole = async (req, res, next) => {
  try {
    const originalUser = await usersService.getUserById(req.params.id);
    const user = await usersService.assignRole(req.params.id, req.body.role_id, req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.ROLE_ASSIGNED,
      entityType: 'user',
      entityId: req.params.id,
      oldValues: { role_id: originalUser.role_id },
      newValues: { role_id: req.body.role_id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { user }, 'Role assigned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    await usersService.deleteUser(req.params.id, req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'user',
      entityId: req.params.id,
      oldValues: user,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  assignRole,
  deleteUser,
};
