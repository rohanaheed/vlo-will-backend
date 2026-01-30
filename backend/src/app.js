const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const { initializePassport } = require('./config/passport');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { defaultLimiter } = require('./middleware/rateLimiter');
const requestIdMiddleware = require('./middleware/requestId');
const httpLogger = require('./utils/httpLogger');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? config.frontendUrl 
    : ['http://localhost:3000', 'http://localhost:3001', config.frontendUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Request ID middleware (must be early for logging)
app.use(requestIdMiddleware);

// HTTP request logging
app.use(httpLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Rate limiting (applied to all routes)
app.use(defaultLimiter);

// Initialize Passport
initializePassport();

// Mount routes
app.use(routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

logger.info('Express app initialized', {
  environment: config.nodeEnv,
  corsOrigin: config.frontendUrl,
});

module.exports = app;
