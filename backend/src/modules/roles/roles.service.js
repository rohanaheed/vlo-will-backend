const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../utils/errors');
const { clearAllPermissionCache } = require('../../middleware/rbac');
const logger = require('../../utils/logger');

/**
 * Get all roles
 */
const getRoles = async () => {
  const roles = await db
    .selectFrom('roles')
    .select(['id', 'name', 'description', 'is_system', 'created_at', 'updated_at'])
    .orderBy('name', 'asc')
    .execute();

  return roles;
};

/**
 * Get role by ID with permissions
 */
const getRoleById = async (roleId) => {
  const role = await db
    .selectFrom('roles')
    .select(['id', 'name', 'description', 'is_system', 'created_at', 'updated_at'])
    .where('id', '=', roleId)
    .executeTakeFirst();

  if (!role) {
    throw new NotFoundError('Role');
  }

  // Get permissions for this role
  const permissions = await db
    .selectFrom('role_permissions')
    .innerJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
    .select([
      'permissions.id',
      'permissions.name',
      'permissions.description',
      'permissions.module',
    ])
    .where('role_permissions.role_id', '=', roleId)
    .execute();

  return {
    ...role,
    permissions,
  };
};

/**
 * Create new role
 */
const createRole = async ({ name, description }) => {
  // Check if role name already exists
  const existingRole = await db
    .selectFrom('roles')
    .select('id')
    .where('name', '=', name)
    .executeTakeFirst();

  if (existingRole) {
    throw new ConflictError('Role name already exists');
  }

  const roleId = generateUUID();
  const role = await db
    .insertInto('roles')
    .values({
      id: roleId,
      name,
      description,
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(['id', 'name', 'description', 'is_system', 'created_at'])
    .executeTakeFirst();

  logger.info('Role created', { roleId, name });

  return role;
};

/**
 * Update role
 */
const updateRole = async (roleId, updateData) => {
  const existingRole = await getRoleById(roleId);

  // Prevent modifying system roles
  if (existingRole.is_system) {
    throw new ForbiddenError('Cannot modify system roles');
  }

  // Check for name conflict if updating name
  if (updateData.name && updateData.name !== existingRole.name) {
    const nameExists = await db
      .selectFrom('roles')
      .select('id')
      .where('name', '=', updateData.name)
      .where('id', '!=', roleId)
      .executeTakeFirst();

    if (nameExists) {
      throw new ConflictError('Role name already exists');
    }
  }

  const role = await db
    .updateTable('roles')
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where('id', '=', roleId)
    .returning(['id', 'name', 'description', 'is_system', 'updated_at'])
    .executeTakeFirst();

  logger.info('Role updated', { roleId });

  return role;
};

/**
 * Delete role
 */
const deleteRole = async (roleId) => {
  const role = await getRoleById(roleId);

  // Prevent deleting system roles
  if (role.is_system) {
    throw new ForbiddenError('Cannot delete system roles');
  }

  // Check if any users have this role
  const usersWithRole = await db
    .selectFrom('users')
    .select(db.fn.count('id').as('count'))
    .where('role_id', '=', roleId)
    .executeTakeFirst();

  if (parseInt(usersWithRole?.count || 0, 10) > 0) {
    throw new ConflictError('Cannot delete role that is assigned to users');
  }

  await db
    .deleteFrom('roles')
    .where('id', '=', roleId)
    .execute();

  logger.info('Role deleted', { roleId });
};

/**
 * Assign permissions to role
 */
const assignPermissions = async (roleId, permissionIds) => {
  // Verify role exists
  await getRoleById(roleId);

  // Verify all permissions exist
  const permissions = await db
    .selectFrom('permissions')
    .select('id')
    .where('id', 'in', permissionIds)
    .execute();

  if (permissions.length !== permissionIds.length) {
    throw new NotFoundError('One or more permissions');
  }

  // Insert new role_permissions (ignore duplicates)
  for (const permissionId of permissionIds) {
    await db
      .insertInto('role_permissions')
      .values({
        id: generateUUID(),
        role_id: roleId,
        permission_id: permissionId,
        created_at: new Date(),
      })
      .onConflict((oc) => 
        oc.columns(['role_id', 'permission_id']).doNothing()
      )
      .execute();
  }

  // Clear permission cache
  clearAllPermissionCache();

  logger.info('Permissions assigned to role', { roleId, permissionIds });

  return getRoleById(roleId);
};

/**
 * Remove permissions from role
 */
const removePermissions = async (roleId, permissionIds) => {
  // Verify role exists
  const role = await getRoleById(roleId);

  // Prevent modifying system roles
  if (role.is_system) {
    throw new ForbiddenError('Cannot modify system role permissions');
  }

  await db
    .deleteFrom('role_permissions')
    .where('role_id', '=', roleId)
    .where('permission_id', 'in', permissionIds)
    .execute();

  // Clear permission cache
  clearAllPermissionCache();

  logger.info('Permissions removed from role', { roleId, permissionIds });

  return getRoleById(roleId);
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
