const { db } = require('../config/database');
const { generateUUID } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @returns {Promise<Object>} Created audit log
 */
const createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    const auditLog = await db
      .insertInto('audit_logs')
      .values({
        id: generateUUID(),
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues ? JSON.stringify(sanitizeAuditData(oldValues)) : null,
        new_values: newValues ? JSON.stringify(sanitizeAuditData(newValues)) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date(),
      })
      .returning(['id', 'action', 'entity_type', 'created_at'])
      .executeTakeFirst();

    logger.debug('Audit log created', {
      auditId: auditLog.id,
      userId,
      action,
      entityType,
      entityId,
    });

    return auditLog;
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Failed to create audit log', {
      error: error.message,
      userId,
      action,
      entityType,
      entityId,
    });
    return null;
  }
};

/**
 * Sanitize data before storing in audit log
 * Removes sensitive fields
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeAuditData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password',
    'password_hash',
    'token',
    'refresh_token',
    'access_token',
    'api_key',
    'secret',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
    'national_id',
    'passport_number',
  ];

  const sanitized = { ...data };

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Middleware to automatically audit write operations
 * @param {string} entityType - Type of entity being modified
 * @param {string} action - Action being performed
 * @returns {Function} Express middleware
 */
const auditMiddleware = (entityType, action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = async (body) => {
      // Only audit successful write operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || body?.data?.id || null;

        await createAuditLog({
          userId: req.user?.id,
          action,
          entityType,
          entityId,
          oldValues: req.originalData || null,
          newValues: req.body,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Store original data for update operations
 * @param {Function} getOriginalData - Function to fetch original data
 * @returns {Function} Express middleware
 */
const captureOriginalData = (getOriginalData) => {
  return async (req, res, next) => {
    try {
      const originalData = await getOriginalData(req);
      req.originalData = originalData;
    } catch (error) {
      logger.warn('Failed to capture original data for audit', {
        error: error.message,
        path: req.path,
      });
    }
    next();
  };
};

module.exports = {
  createAuditLog,
  sanitizeAuditData,
  auditMiddleware,
  captureOriginalData,
};
