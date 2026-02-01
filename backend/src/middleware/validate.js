const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Validate request using Zod schema
 * @param {Object} schema - Zod schema object with optional body, query, params keys
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const errors = [];

      // Validate body
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          req.query = result.data;
        }
      }

      // Validate params
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
        } else {
          req.params = result.data;
        }
      }

      if (errors.length > 0) {
        logger.debug('Validation failed', {
          path: req.path,
          method: req.method,
          errors,
          requestId: req.requestId,
        });
        return next(new ValidationError(errors));
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      next(error);
    }
  };
};

/**
 * Format Zod errors into a consistent structure
 * @param {Object} zodError - Zod error object
 * @param {string} location - Where the error occurred (body, query, params)
 * @returns {Array} Formatted errors
 */
const formatZodErrors = (zodError, location) => {
  const issues = zodError?.issues || [];

  return issues.map((err) => ({
    field: err.path && err.path.length > 0 ? err.path.join('.') : location,
    message: err.message,
    location,
    code: err.code,
  }));
};

/**
 * Validate single value with Zod schema
 * @param {Object} schema - Zod schema
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} { success, data, errors }
 */
const validateValue = (schema, value, fieldName = 'value') => {
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  const errors = (result.error?.issues || []).map((err) => ({
    field: fieldName,
    message: err.message,
    code: err.code,
  }));

  return { success: false, data: null, errors };
};

module.exports = {
  validate,
  validateValue,
  formatZodErrors,
};
