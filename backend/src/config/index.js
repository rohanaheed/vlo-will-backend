const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN, 10) || 2,
    poolMax: parseInt(process.env.DATABASE_POOL_MAX, 10) || 10,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshExpiresInRememberMe: process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER_ME || '30d'
  },
  
  // Session
  session: {
    secret: process.env.SESSION_SECRET,
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    },
  },
  
  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@willbe.com',
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  frontendPublicUrl: process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3001',
  
  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },
};

// Validate required config in production
const validateConfig = () => {
  const requiredInProduction = [
    'jwt.secret',
    'jwt.refreshSecret',
    'session.secret',
    'database.url',
  ];

  if (config.nodeEnv === 'production') {
    const missing = [];
    
    requiredInProduction.forEach((key) => {
      const keys = key.split('.');
      let value = config;
      keys.forEach((k) => {
        value = value?.[k];
      });
      if (!value) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing required config in production: ${missing.join(', ')}`);
    }
  }
};

validateConfig();

module.exports = { config };
