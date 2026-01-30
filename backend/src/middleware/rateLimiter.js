const rateLimit = require('express-rate-limit');
const { config } = require('../config');
const { TooManyRequestsError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Common validation options - disable false positive warnings
 * We use default keyGenerator which handles IPv6 properly
 */
const validationOptions = {
  validate: {
    xForwardedForHeader: false,
    default: true,
  },
};

/**
 * Default rate limiter for general API endpoints
 */
const defaultLimiter = rateLimit({
  ...validationOptions,
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn('Rate limit exceeded', {
      path: req.path,
      requestId: req.requestId,
    });
    next(new TooManyRequestsError());
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for auth endpoints (login, register, etc.)
 * More restrictive to prevent brute force attacks
 */
const authLimiter = rateLimit({
  ...validationOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn('Auth rate limit exceeded', {
      email: req.body?.email,
      path: req.path,
      requestId: req.requestId,
    });
    next(new TooManyRequestsError('Too many authentication attempts, please try again after 15 minutes'));
  },
});

/**
 * Password reset rate limiter
 * Very restrictive to prevent email spam
 */
const passwordResetLimiter = rateLimit({
  ...validationOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset requests, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn('Password reset rate limit exceeded', {
      email: req.body?.email,
      requestId: req.requestId,
    });
    next(new TooManyRequestsError('Too many password reset requests, please try again after an hour'));
  },
});

/**
 * Email verification rate limiter
 */
const emailVerificationLimiter = rateLimit({
  ...validationOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: 'Too many verification attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn('Email verification rate limit exceeded', {
      requestId: req.requestId,
    });
    next(new TooManyRequestsError('Too many verification attempts, please try again later'));
  },
});

/**
 * PDF generation rate limiter
 * Prevent abuse of resource-intensive operations
 */
const pdfLimiter = rateLimit({
  ...validationOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 PDFs per hour
  message: 'Too many PDF generation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    logger.warn('PDF generation rate limit exceeded', {
      userId: req.user?.id,
      requestId: req.requestId,
    });
    next(new TooManyRequestsError('Too many PDF generation requests, please try again later'));
  },
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
const createLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
  } = options;

  return rateLimit({
    ...validationOptions,
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      logger.warn('Custom rate limit exceeded', {
        path: req.path,
        requestId: req.requestId,
      });
      next(new TooManyRequestsError(message));
    },
  });
};

module.exports = {
  defaultLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  pdfLimiter,
  createLimiter,
};
