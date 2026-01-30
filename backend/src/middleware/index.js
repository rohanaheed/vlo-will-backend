const { authenticate, optionalAuth, authenticateLocal, requireEmailVerified, requireActive } = require('./auth');
const { 
  requireRole, 
  requirePermission, 
  requireAnyPermission, 
  requireSuperAdmin, 
  requireAdmin, 
  requireOwnerOrAdmin,
  clearPermissionCache,
  clearAllPermissionCache,
} = require('./rbac');
const { validate, validateValue } = require('./validate');
const { notFoundHandler, errorHandler } = require('./errorHandler');
const { 
  defaultLimiter, 
  authLimiter, 
  passwordResetLimiter, 
  emailVerificationLimiter, 
  pdfLimiter,
  createLimiter,
} = require('./rateLimiter');
const { createAuditLog, auditMiddleware, captureOriginalData } = require('./audit');
const requestIdMiddleware = require('./requestId');

module.exports = {
  // Auth
  authenticate,
  optionalAuth,
  authenticateLocal,
  requireEmailVerified,
  requireActive,

  // RBAC
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireAdmin,
  requireOwnerOrAdmin,
  clearPermissionCache,
  clearAllPermissionCache,

  // Validation
  validate,
  validateValue,

  // Error handling
  notFoundHandler,
  errorHandler,

  // Rate limiting
  defaultLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  pdfLimiter,
  createLimiter,

  // Audit
  createAuditLog,
  auditMiddleware,
  captureOriginalData,

  // Request ID
  requestIdMiddleware,
};
