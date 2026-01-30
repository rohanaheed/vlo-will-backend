const { db, pool, testConnection, closeConnection } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Connect to database and verify connection
 * @returns {Promise<boolean>}
 */
const connectDatabase = async () => {
  try {
    await testConnection();
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
  try {
    await closeConnection();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  db,
  pool,
  connectDatabase,
  disconnectDatabase,
};
