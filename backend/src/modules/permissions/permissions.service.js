const { db } = require('../../db');

/**
 * Get all permissions
 */
const getPermissions = async () => {
  const permissions = await db
    .selectFrom('permissions')
    .select(['id', 'name', 'description', 'module', 'created_at'])
    .orderBy('module', 'asc')
    .orderBy('name', 'asc')
    .execute();

  return permissions;
};

/**
 * Get permissions grouped by module
 */
const getPermissionsByModule = async () => {
  const permissions = await getPermissions();

  // Group by module
  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  return grouped;
};

module.exports = {
  getPermissions,
  getPermissionsByModule,
};
