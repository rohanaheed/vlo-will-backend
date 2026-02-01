const express = require('express');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');
const { validate } = require('../../middleware/validate');
const { authenticate, authenticateLocal } = require('../../middleware/auth');
const { authLimiter, passwordResetLimiter, emailVerificationLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate(authValidation.registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate(authValidation.loginSchema),
  authenticateLocal,
  authController.login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  validate(authValidation.refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(authValidation.forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/resend-password-reset
 * @desc    Resend password reset token
 * @access  Public
 */
router.post(
  '/resend-password-reset-email',
  passwordResetLimiter,
  validate(authValidation.resendPasswordResetSchema),
  authController.resendPasswordReset
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(authValidation.resetPasswordSchema),
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  emailVerificationLimiter,
  validate(authValidation.verifyEmailSchema),
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-verification-email
 * @desc    Resend email verification token
 * @access  Public
 */
router.post(
  '/resend-verification-email',
  emailVerificationLimiter,
  validate(authValidation.resendVerificationEmailSchema),
  authController.resendVerificationEmail
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(authValidation.changePasswordSchema),
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth login
 * @access  Public
 */
router.get(
  '/google',
  authLimiter,
  authController.googleLogin
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  '/google/callback',
  authController.googleCallback
);

module.exports = router;
