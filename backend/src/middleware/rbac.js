const { db } = require('../config/database');
const { ForbiddenError, UnauthorizedError } = require('../utils/errors');
const { ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Cache for user permissions (simple in-memory cache)
 * In production, consider using Redis
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user permissions from database or cache
 * @param {string} userId - User ID
 * @param {string} roleId - Role ID
 * @returns {Promise<Set<string>>} Set of permission names
 */
const getUserPermissions = async (userId, roleId) => {
  const cacheKey = `${userId}:${roleId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  // Fetch permissions from database
  const permissions = await db
    .selectFrom('role_permissions')
    .innerJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
    .select('permissions.name')
    .where('role_permissions.role_id', '=', roleId)
    .execute();

  const permissionSet = new Set(permissions.map((p) => p.name));

  // Cache the permissions
  permissionCache.set(cacheKey, {
    permissions: permissionSet,
    timestamp: Date.now(),
  });

  return permissionSet;
};

/**
 * Clear permission cache for a user
 * @param {string} userId - User ID
 */
const clearPermissionCache = (userId) => {
  for (const key of permissionCache.keys()) {
    if (key.startsWith(userId)) {
      permissionCache.delete(key);
    }
  }
};

/**
 * Clear entire permission cache
 */
const clearAllPermissionCache = () => {
  permissionCache.clear();
};

/**
 * Check if user has required role(s)
 * @param {...string} roles - Required roles (any of)
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role_name;

    // Super admin bypasses all role checks
    if (userRole === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(userRole)) {
      logger.warn('Access denied: Insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        path: req.path,
        requestId: req.requestId,
      });
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    next();
  };
};

/**
 * Check if user has required permission(s)
 * @param {...string} permissions - Required permissions (all required)
 * @returns {Function} Express middleware
 */
const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const userRole = req.user.role_name;

      // Super admin bypasses all permission checks
      if (userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      const userPermissions = await getUserPermissions(req.user.id, req.user.role_id);

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every((permission) => 
        userPermissions.has(permission)
      );

      if (!hasAllPermissions) {
        logger.warn('Access denied: Insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredPermissions: permissions,
          userPermissions: Array.from(userPermissions),
          path: req.path,
          requestId: req.requestId,
        });
        return next(new ForbiddenError('You do not have permission to perform this action'));
      }

      // Attach permissions to request for later use
      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      logger.error('Error checking permissions:', error);
      next(error);
    }
  };
};

/**
 * Check if user has any of the required permissions
 * @param {...string} permissions - Required permissions (any of)
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const userRole = req.user.role_name;

      // Super admin bypasses all permission checks
      if (userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      const userPermissions = await getUserPermissions(req.user.id, req.user.role_id);

      // Check if user has any of the required permissions
      const hasAnyPermission = permissions.some((permission) => 
        userPermissions.has(permission)
      );

      if (!hasAnyPermission) {
        logger.warn('Access denied: No matching permissions', {
          userId: req.user.id,
          userRole,
          requiredPermissions: permissions,
          path: req.path,
          requestId: req.requestId,
        });
        return next(new ForbiddenError('You do not have permission to perform this action'));
      }

      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      logger.error('Error checking permissions:', error);
      next(error);
    }
  };
};

/**
 * Ensure user is super admin
 * @returns {Function} Express middleware
 */
const requireSuperAdmin = () => {
  return requireRole(ROLES.SUPER_ADMIN);
};

/**
 * Ensure user is admin or super admin
 * @returns {Function} Express middleware
 */
const requireAdmin = () => {
  return requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);
};

/**
 * Check if user owns the resource or has admin access
 * @param {Function} getResourceOwnerId - Function to get owner ID from request
 * @returns {Function} Express middleware
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const userRole = req.user.role_name;

      // Super admin and admin bypass ownership check
      if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
        return next();
      }

      const ownerId = await getResourceOwnerId(req);

      if (ownerId !== req.user.id) {
        logger.warn('Access denied: Not resource owner', {
          userId: req.user.id,
          ownerId,
          path: req.path,
          requestId: req.requestId,
        });
        return next(new ForbiddenError('You do not have permission to access this resource'));
      }

      next();
    } catch (error) {
      logger.error('Error checking resource ownership:', error);
      next(error);
    }
  };
};

module.exports = {
  getUserPermissions,
  clearPermissionCache,
  clearAllPermissionCache,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireAdmin,
  requireOwnerOrAdmin,
};
