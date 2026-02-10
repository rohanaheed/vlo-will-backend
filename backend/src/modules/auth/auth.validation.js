const { z } = require('zod');

const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    name: z.string().min(1, 'Name is required').max(100).trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
  }),
};

const resendPasswordResetSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
  }),
};


const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
};

const resendVerificationEmailSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
  }),
};

const changePasswordSchema = {
  body: z.object({
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendPasswordResetSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  changePasswordSchema,
  refreshTokenSchema,
};
