const { ApiError } = require('../utils/errors');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Not found handler - for undefined routes
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.requestId,
  });

  return sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  const logContext = {
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  // Handle known API errors
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { ...logContext, stack: err.stack });
    } else {
      logger.warn(err.message, logContext);
    }

    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle Zod validation errors (if thrown directly)
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Zod validation error', { ...logContext, details });
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('Invalid JWT token', logContext);
    return sendError(res, 401, 'AUTHENTICATION_ERROR', 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('Expired JWT token', logContext);
    return sendError(res, 401, 'AUTHENTICATION_ERROR', 'Token expired');
  }

  // Handle database errors
  if (err.code === '23505') {
    // PostgreSQL unique violation
    logger.warn('Database unique constraint violation', { ...logContext, detail: err.detail });
    return sendError(res, 409, 'CONFLICT', 'Resource already exists');
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    logger.warn('Database foreign key violation', { ...logContext, detail: err.detail });
    return sendError(res, 400, 'BAD_REQUEST', 'Referenced resource not found');
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Malformed JSON in request body', logContext);
    return sendError(res, 400, 'BAD_REQUEST', 'Invalid JSON in request body');
  }

  // Log unexpected errors
  logger.error('Unexpected error', {
    ...logContext,
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  return sendError(res, 500, 'INTERNAL_ERROR', message);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
