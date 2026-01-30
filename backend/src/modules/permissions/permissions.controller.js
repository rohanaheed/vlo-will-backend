const permissionsService = require('./permissions.service');
const { sendSuccess } = require('../../utils/response');

/**
 * Get all permissions
 * GET /api/v1/permissions
 */
const getPermissions = async (req, res, next) => {
  try {
    const permissions = await permissionsService.getPermissions();

    return sendSuccess(res, { permissions }, 'Permissions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions grouped by module
 * GET /api/v1/permissions/grouped
 */
const getPermissionsByModule = async (req, res, next) => {
  try {
    const permissions = await permissionsService.getPermissionsByModule();

    return sendSuccess(res, { permissions }, 'Permissions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPermissions,
  getPermissionsByModule,
};
