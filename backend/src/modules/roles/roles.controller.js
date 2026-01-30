const rolesService = require('./roles.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

/**
 * Get all roles
 * GET /api/v1/roles
 */
const getRoles = async (req, res, next) => {
  try {
    const roles = await rolesService.getRoles();

    return sendSuccess(res, { roles }, 'Roles retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get role by ID with permissions
 * GET /api/v1/roles/:id
 */
const getRoleById = async (req, res, next) => {
  try {
    const role = await rolesService.getRoleById(req.params.id);

    return sendSuccess(res, { role }, 'Role retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new role
 * POST /api/v1/roles
 */
const createRole = async (req, res, next) => {
  try {
    const role = await rolesService.createRole(req.body);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'role',
      entityId: role.id,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendCreated(res, { role }, 'Role created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update role
 * PUT /api/v1/roles/:id
 */
const updateRole = async (req, res, next) => {
  try {
    const originalRole = await rolesService.getRoleById(req.params.id);
    const role = await rolesService.updateRole(req.params.id, req.body);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'role',
      entityId: req.params.id,
      oldValues: originalRole,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { role }, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete role
 * DELETE /api/v1/roles/:id
 */
const deleteRole = async (req, res, next) => {
  try {
    const role = await rolesService.getRoleById(req.params.id);
    await rolesService.deleteRole(req.params.id);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'role',
      entityId: req.params.id,
      oldValues: role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Assign permissions to role
 * POST /api/v1/roles/:id/permissions
 */
const assignPermissions = async (req, res, next) => {
  try {
    const originalRole = await rolesService.getRoleById(req.params.id);
    const role = await rolesService.assignPermissions(req.params.id, req.body.permission_ids);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.PERMISSION_CHANGED,
      entityType: 'role',
      entityId: req.params.id,
      oldValues: { permissions: originalRole.permissions },
      newValues: { added_permissions: req.body.permission_ids },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { role }, 'Permissions assigned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Remove permissions from role
 * DELETE /api/v1/roles/:id/permissions
 */
const removePermissions = async (req, res, next) => {
  try {
    const originalRole = await rolesService.getRoleById(req.params.id);
    const role = await rolesService.removePermissions(req.params.id, req.body.permission_ids);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.PERMISSION_CHANGED,
      entityType: 'role',
      entityId: req.params.id,
      oldValues: { permissions: originalRole.permissions },
      newValues: { removed_permissions: req.body.permission_ids },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { role }, 'Permissions removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
};
