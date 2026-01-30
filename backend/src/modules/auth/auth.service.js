const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../../db');
const { config } = require('../../config');
const { sendEmail } = require('../../config/email');
const { generateUUID, generateToken, hashToken } = require('../../utils/helpers');
const { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } = require('../../utils/errors');
const { ROLE_IDS } = require('../../db/seeds/001_roles');
const logger = require('../../utils/logger');

const SALT_ROUNDS = 12;

/**
 * Register a new user
 */
const register = async ({ email, password, first_name, last_name, phone }) => {
  // Check if user already exists
  const existingUser = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();

  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const userId = generateUUID();
  const user = await db
    .insertInto('users')
    .values({
      id: userId,
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      role_id: ROLE_IDS.USER,
      is_active: true,
      is_email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning([
      'id',
      'email',
      'first_name',
      'last_name',
      'phone',
      'is_active',
      'is_email_verified',
      'created_at',
    ])
    .executeTakeFirst();

  // Generate email verification token
  const verificationToken = generateToken();
  // TODO: Store token and send verification email

  logger.info('New user registered', { userId: user.id, email });

  return user;
};

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

/**
 * Login user (after passport authentication)
 */
const login = async (user) => {
  const tokens = generateTokens(user.id);

  // Get user with role info
  const userWithRole = await db
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
      'roles.name as role_name',
    ])
    .where('users.id', '=', user.id)
    .executeTakeFirst();

  logger.info('User logged in', { userId: user.id, email: user.email });

  return {
    user: userWithRole,
    tokens,
  };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Check if user still exists and is active
    const user = await db
      .selectFrom('users')
      .select(['id', 'is_active'])
      .where('id', '=', payload.sub)
      .executeTakeFirst();

    if (!user || !user.is_active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const tokens = generateTokens(user.id);

    return tokens;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (email) => {
  const user = await db
    .selectFrom('users')
    .select(['id', 'email', 'first_name'])
    .where('email', '=', email)
    .executeTakeFirst();

  // Don't reveal if user exists
  if (!user) {
    logger.warn('Password reset requested for non-existent email', { email });
    return;
  }

  // Generate reset token
  const token = generateToken();
  const hashedToken = hashToken(token);

  // Store token (expires in 1 hour)
  await db
    .insertInto('password_resets')
    .values({
      id: generateUUID(),
      user_id: user.id,
      token: hashedToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date(),
    })
    .execute();

  // Send reset email
  const resetLink = `${config.frontendUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Hi ${user.first_name},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Hi ${user.first_name}, Reset your password here: ${resetLink}`,
  });

  logger.info('Password reset email sent', { userId: user.id, email });
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  // Find valid token
  const resetRecord = await db
    .selectFrom('password_resets')
    .select(['id', 'user_id', 'expires_at', 'used_at'])
    .where('token', '=', hashedToken)
    .executeTakeFirst();

  if (!resetRecord) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  if (resetRecord.used_at) {
    throw new BadRequestError('Reset token already used');
  }

  if (new Date() > resetRecord.expires_at) {
    throw new BadRequestError('Reset token expired');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      updated_at: new Date(),
    })
    .where('id', '=', resetRecord.user_id)
    .execute();

  // Mark token as used
  await db
    .updateTable('password_resets')
    .set({ used_at: new Date() })
    .where('id', '=', resetRecord.id)
    .execute();

  logger.info('Password reset successful', { userId: resetRecord.user_id });
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Get current password hash
  const user = await db
    .selectFrom('users')
    .select(['id', 'password_hash'])
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await db
    .updateTable('users')
    .set({
      password_hash: passwordHash,
      updated_at: new Date(),
    })
    .where('id', '=', userId)
    .execute();

  logger.info('Password changed', { userId });
};

/**
 * Verify email address
 */
const verifyEmail = async (token) => {
  // TODO: Implement email verification with stored tokens
  // For now, this is a placeholder
  throw new BadRequestError('Email verification not implemented yet');
};

/**
 * Get current user profile
 */
const getCurrentUser = async (userId) => {
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

module.exports = {
  register,
  login,
  generateTokens,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  getCurrentUser,
};
