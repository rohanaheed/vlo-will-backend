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
const register = async ({ email, password, name }) => {
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
      name,
      role_id: ROLE_IDS.USER,
      is_active: true,
      is_email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning([
      'id',
      'email',
      'name',
      'is_active',
      'is_email_verified',
      'created_at',
    ])
    .executeTakeFirst();

  // Generate email verification token
  const verificationToken = generateToken();
  const hashedToken = hashToken(verificationToken);

  // Store verification token (expires in 24 hours)
  await db
    .insertInto('email_verification_tokens')
    .values({
      id: generateUUID(),
      user_id: userId,
      email: user.email,
      token: hashedToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
    })
    .execute();

  // Send verification email
  const verificationLink = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html: `
      <h1>Welcome to Will-Be!</h1>
      <p>Hi ${user.name},</p>
      <p>Thank you for registering. Please verify your email address to activate your account:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create this account, you can ignore this email.</p>
    `,
    text: `Hi ${user.name}, Verify your email here: ${verificationLink}`,
  });

  logger.info('Email verification token sent', { userId: user.id, email });

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
      'users.name',
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
    .select(['id', 'email', 'name'])
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
      <p>Hi ${user.name},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Hi ${user.name}, Reset your password here: ${resetLink}`,
  });

  logger.info('Password reset email sent', { userId: user.id, email });
};

/**
 * Resend password reset token
 */
const resendPasswordReset = async (email) => {
  const user = await db
    .selectFrom('users')
    .select(['id', 'email', 'name'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (!user) {
    // Don't reveal if user exists
    logger.warn('Password reset resend requested for non-existent email', { email });
    return;
  }

  // Check if there's an active password reset token
  const resetRecord = await db
    .selectFrom('password_resets')
    .select(['expires_at'])
    .where('user_id', '=', user.id)
    .where('used_at', 'is', null)
    .executeTakeFirst();

  // If there's an active token that hasn't expired, don't allow resend yet
  if (resetRecord && new Date() < resetRecord.expires_at) {
    throw new BadRequestError('Please wait before requesting a new password reset email');
  }

  // Delete any existing unused tokens
  await db
    .deleteFrom('password_resets')
    .where('user_id', '=', user.id)
    .where('used_at', 'is', null)
    .execute();

  // Create new reset token
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
      <p>Hi ${user.name},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Hi ${user.name}, Reset your password here: ${resetLink}`,
  });

  logger.info('Password reset email resent', { userId: user.id, email });
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
const changePassword = async (userId, newPassword) => {
  // Get current password hash
  const user = await db
    .selectFrom('users')
    .select(['id', 'password_hash'])
    .where('id', '=', userId)
    .executeTakeFirst();

  if (!user) {
    throw new NotFoundError('User');
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
  const hashedToken = hashToken(token);

  // Find valid token
  const verificationRecord = await db
    .selectFrom('email_verification_tokens')
    .select(['id', 'user_id', 'expires_at', 'used_at'])
    .where('token', '=', hashedToken)
    .executeTakeFirst();

  if (!verificationRecord) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  if (verificationRecord.used_at) {
    throw new BadRequestError('Verification token already used');
  }

  if (new Date() > verificationRecord.expires_at) {
    throw new BadRequestError('Verification token expired');
  }

  // Get user
  const user = await db
    .selectFrom('users')
    .select(['id', 'email'])
    .where('id', '=', verificationRecord.user_id)
    .executeTakeFirst();

  if (!user) {
    throw new NotFoundError('User');
  }

  // Update user - mark email as verified
  await db
    .updateTable('users')
    .set({
      is_email_verified: true,
      email_verified_at: new Date(),
      updated_at: new Date(),
    })
    .where('id', '=', verificationRecord.user_id)
    .execute();

  // Mark token as used
  await db
    .updateTable('email_verification_tokens')
    .set({ used_at: new Date() })
    .where('id', '=', verificationRecord.id)
    .execute();

  logger.info('Email verified successfully', { userId: verificationRecord.user_id, email: user.email });

  return {
    message: 'Email verified successfully. You can now login.',
    email: user.email,
  };
};

/**
 * Resend email verification token
 */
const resendVerificationEmail = async (email) => {
  const user = await db
    .selectFrom('users')
    .select(['id', 'email', 'name', 'is_email_verified'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (!user) {
    // Don't reveal if user exists
    logger.warn('Verification email requested for non-existent email', { email });
    return;
  }

  if (user.is_email_verified) {
    logger.warn('Verification email requested for already verified user', { userId: user.id, email });
    return;
  }

  // Check if there's an active verification token
  const verificationRecord = await db
    .selectFrom('email_verification_tokens')
    .select(['expires_at'])
    .where('user_id', '=', user.id)
    .where('used_at', 'is', null)
    .executeTakeFirst();

  // If there's an active token that hasn't expired, don't allow resend yet
  if (verificationRecord && new Date() < verificationRecord.expires_at) {
    throw new BadRequestError('Please wait before requesting a new verification email');
  }

  // Delete any existing unused tokens
  await db
    .deleteFrom('email_verification_tokens')
    .where('user_id', '=', user.id)
    .where('used_at', 'is', null)
    .execute();

  // Generate new verification token
  const verificationToken = generateToken();
  const hashedToken = hashToken(verificationToken);

  // Store verification token (expires in 24 hours)
  await db
    .insertInto('email_verification_tokens')
    .values({
      id: generateUUID(),
      user_id: user.id,
      email: user.email,
      token: hashedToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
    })
    .execute();

  // Send verification email
  const verificationLink = `${config.frontendPublicUrl}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html: `
      <h1>Verify Your Email</h1>
      <p>Hi ${user.name},</p>
      <p>Please verify your email address to complete your registration:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Hi ${user.name}, Verify your email here: ${verificationLink}`,
  });

  logger.info('Verification email resent', { userId: user.id, email });
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
      'users.name',
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
  resendPasswordReset,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
};
