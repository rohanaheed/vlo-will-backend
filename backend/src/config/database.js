const { Pool } = require('pg');
const { Kysely, PostgresDialect } = require('kysely');
const { config } = require('./index');
const logger = require('../utils/logger');

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New client connected to database pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Create Kysely instance
const db = new Kysely({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Test database connection
const testConnection = async () => {
  try {
    const result = await db.selectFrom('pg_catalog.pg_tables').select('tablename').limit(1).execute();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    throw error;
  }
};

// Close database connection
const closeConnection = async () => {
  await db.destroy();
  await pool.end();
  logger.info('Database connections closed');
};

module.exports = {
  db,
  pool,
  testConnection,
  closeConnection,
};
