const authService = require('./auth.service');
const { sendSuccess, sendCreated } = require('../../utils/response');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

/**
 * Register new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'user',
      entityId: user.id,
      newValues: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendCreated(res, { user }, 'Registration successful. Please verify your email.');
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    // User is already authenticated by passport middleware
    const result = await authService.login(req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: 'user',
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: 'user',
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // With JWT, we just return success
    // Client should discard the tokens
    return sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const tokens = await authService.refreshAccessToken(refresh_token);

    return sendSuccess(res, { tokens }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    return sendSuccess(
      res,
      null,
      'If your email is registered, you will receive a password reset link.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    return sendSuccess(res, null, 'Password reset successful. You can now login with your new password.');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email address
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    await authService.verifyEmail(token);

    return sendSuccess(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return sendSuccess(res, { user }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await authService.changePassword(req.user.id, current_password, new_password);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      entityType: 'user',
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  me,
  changePassword,
};
