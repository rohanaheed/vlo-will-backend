const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Get config values (can't import config here to avoid circular deps)
const nodeEnv = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || './logs';
const logMaxSize = process.env.LOG_MAX_SIZE || '20m';
const logMaxFiles = process.env.LOG_MAX_FILES || '14d';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define formats
const formatTimestamp = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss',
});

// Console format (colorized, human-readable)
const consoleFormat = winston.format.combine(
  formatTimestamp,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length 
      ? ` | ${Object.entries(meta).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' | ')}`
      : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

// File format (JSON for production, easier to parse)
const fileFormat = winston.format.combine(
  formatTimestamp,
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: nodeEnv === 'development' ? 'debug' : logLevel,
    format: consoleFormat,
  })
);

// File transports (production only)
if (nodeEnv === 'production') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: logMaxSize,
      maxFiles: logMaxFiles,
      zippedArchive: true,
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: logMaxSize,
      maxFiles: '7d',
      zippedArchive: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  levels,
  defaultMeta: { service: 'will-be-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
  exitOnError: false,
});

// Add request context method
logger.withContext = (context) => {
  return {
    error: (message, ...args) => logger.error(message, { ...context, ...args[0] }),
    warn: (message, ...args) => logger.warn(message, { ...context, ...args[0] }),
    info: (message, ...args) => logger.info(message, { ...context, ...args[0] }),
    http: (message, ...args) => logger.http(message, { ...context, ...args[0] }),
    debug: (message, ...args) => logger.debug(message, { ...context, ...args[0] }),
  };
};

module.exports = logger;
