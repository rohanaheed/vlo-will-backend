const morgan = require('morgan');
const logger = require('./logger');

// Custom token for request ID
morgan.token('request-id', (req) => req.requestId || '-');

// Custom token for user ID
morgan.token('user-id', (req) => req.user?.id || '-');

// Define log format
const format = ':request-id :remote-addr :user-id :method :url :status :res[content-length] - :response-time ms';

// Stream to Winston
const stream = {
  write: (message) => {
    // Remove trailing newline
    const logMessage = message.trim();
    logger.http(logMessage);
  },
};

// Skip logging for health checks in production
const skip = (req) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    // Skip health check endpoints
    return req.url === '/health' || req.url === '/api/health';
  }
  return false;
};

// Create Morgan middleware
const httpLogger = morgan(format, { stream, skip });

module.exports = httpLogger;
