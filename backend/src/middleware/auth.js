const passport = require('passport');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Authenticate request using JWT
 * Attaches user to req.user if authenticated
 */
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Authentication error:', err);
      return next(err);
    }

    if (!user) {
      const message = info?.message || 'Authentication required';
      logger.warn(`Authentication failed: ${message}`, {
        ip: req.ip,
        path: req.path,
        requestId: req.requestId,
      });
      return next(new UnauthorizedError(message));
    }

    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Optional authentication - attaches user if token present, continues if not
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

/**
 * Authenticate using local strategy (email/password)
 * Used for login endpoint
 */
const authenticateLocal = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Local authentication error:', err);
      return next(err);
    }

    if (!user) {
      const message = info?.message || 'Invalid credentials';
      logger.warn(`Login failed: ${message}`, {
        email: req.body?.email,
        ip: req.ip,
        requestId: req.requestId,
      });
      return next(new UnauthorizedError(message));
    }

    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Ensure email is verified
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.is_email_verified) {
    logger.warn('Access denied: Email not verified', {
      userId: req.user.id,
      requestId: req.requestId,
    });
    return next(new UnauthorizedError('Please verify your email address'));
  }

  next();
};

/**
 * Ensure user account is active
 */
const requireActive = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.is_active) {
    logger.warn('Access denied: Account inactive', {
      userId: req.user.id,
      requestId: req.requestId,
    });
    return next(new UnauthorizedError('Account is deactivated'));
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authenticateLocal,
  requireEmailVerified,
  requireActive,
};
