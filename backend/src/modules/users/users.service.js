const { db } = require('../../db');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const { parsePaginationParams, calculatePagination, parseSortParams } = require('../../utils/pagination');
const { ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Get all users with pagination
 */
const getUsers = async (query) => {
  const { page, limit, offset } = parsePaginationParams(query);
  const { sortBy, sortOrder } = parseSortParams(query, [
    'created_at', 'email', 'first_name', 'last_name'
  ]);

  // Build base query
  let baseQuery = db
    .selectFrom('users')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .select([
      'users.id',
      'users.email',
      'users.first_name',
      'users.last_name',
      'users.phone',
      'users.is_active',
      'users.is_email_verified',
      'users.created_at',
      'users.updated_at',
      'roles.name as role_name',
    ]);

  // Apply filters
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    baseQuery = baseQuery.where((eb) =>
      eb.or([
        eb('users.email', 'ilike', searchTerm),
        eb('users.first_name', 'ilike', searchTerm),
        eb('users.last_name', 'ilike', searchTerm),
      ])
    );
  }

  if (query.role) {
    baseQuery = baseQuery.where('roles.name', '=', query.role);
  }

  if (query.is_active !== undefined) {
    baseQuery = baseQuery.where('users.is_active', '=', query.is_active);
  }

  // Get total count
  const countResult = await db
    .selectFrom('users')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .select(db.fn.count('users.id').as('count'))
    .where((eb) => {
      const conditions = [];
      if (query.search) {
        const searchTerm = `%${query.search}%`;
        conditions.push(
          eb.or([
            eb('users.email', 'ilike', searchTerm),
            eb('users.first_name', 'ilike', searchTerm),
            eb('users.last_name', 'ilike', searchTerm),
          ])
        );
      }
      if (query.role) {
        conditions.push(eb('roles.name', '=', query.role));
      }
      if (query.is_active !== undefined) {
        conditions.push(eb('users.is_active', '=', query.is_active));
      }
      return conditions.length > 0 ? eb.and(conditions) : eb.val(true);
    })
    .executeTakeFirst();

  const totalItems = parseInt(countResult?.count || 0, 10);

  // Get users with pagination and sorting
  const users = await baseQuery
    .orderBy(`users.${sortBy}`, sortOrder)
    .limit(limit)
    .offset(offset)
    .execute();

  return {
    users,
    pagination: calculatePagination(totalItems, page, limit),
  };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await db
    .selectFrom('users')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .select([
      'users.id',
      'users.email',
      'users.first_name',
      'users.last_name',
      'users.phone',
      'users.is_active',
      'users.is_email_verified',
      'users.role_id',
      'users.created_at',
      'users.updated_at',
      'roles.name as role_name',
    ])
    .where('users.id', '=', userId)
    .executeTakeFirst();

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
};

/**
 * Update user
 */
const updateUser = async (userId, updateData, currentUser) => {
  // Check if user exists
  const existingUser = await getUserById(userId);

  // Prevent non-super-admin from modifying super admin
  if (
    existingUser.role_name === ROLES.SUPER_ADMIN &&
    currentUser.role_name !== ROLES.SUPER_ADMIN
  ) {
    throw new ForbiddenError('Cannot modify super admin user');
  }

  // Prevent users from deactivating themselves
  if (userId === currentUser.id && updateData.is_active === false) {
    throw new ForbiddenError('Cannot deactivate your own account');
  }

  const updatedUser = await db
    .updateTable('users')
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where('id', '=', userId)
    .returning([
      'id',
      'email',
      'first_name',
      'last_name',
      'phone',
      'is_active',
      'is_email_verified',
      'updated_at',
    ])
    .executeTakeFirst();

  logger.info('User updated', { userId, updatedBy: currentUser.id });

  return updatedUser;
};

/**
 * Assign role to user
 */
const assignRole = async (userId, roleId, currentUser) => {
  // Check if user exists
  const user = await getUserById(userId);

  // Check if role exists
  const role = await db
    .selectFrom('roles')
    .select(['id', 'name', 'is_system'])
    .where('id', '=', roleId)
    .executeTakeFirst();

  if (!role) {
    throw new NotFoundError('Role');
  }

  // Prevent assigning super_admin role unless current user is super admin
  if (role.name === ROLES.SUPER_ADMIN && currentUser.role_name !== ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Only super admin can assign super admin role');
  }

  // Prevent changing super admin's role
  if (user.role_name === ROLES.SUPER_ADMIN && currentUser.role_name !== ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot change super admin role');
  }

  // Prevent changing own role
  if (userId === currentUser.id) {
    throw new ForbiddenError('Cannot change your own role');
  }

  await db
    .updateTable('users')
    .set({
      role_id: roleId,
      updated_at: new Date(),
    })
    .where('id', '=', userId)
    .execute();

  logger.info('Role assigned to user', { userId, roleId, assignedBy: currentUser.id });

  return getUserById(userId);
};

/**
 * Delete user
 */
const deleteUser = async (userId, currentUser) => {
  const user = await getUserById(userId);

  // Prevent deleting super admin
  if (user.role_name === ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot delete super admin user');
  }

  // Prevent self-deletion
  if (userId === currentUser.id) {
    throw new ForbiddenError('Cannot delete your own account');
  }

  await db
    .deleteFrom('users')
    .where('id', '=', userId)
    .execute();

  logger.info('User deleted', { userId, deletedBy: currentUser.id });
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  assignRole,
  deleteUser,
};
