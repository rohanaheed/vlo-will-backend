/**
 * Test database connection using backend/.env
 * Run from project root: node backend/scripts/test-db-connection.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set in backend/.env');
  process.exit(1);
}

// Hide password in log (show only postgres@host/db)
const safeUrl = url.replace(/:([^:@]+)@/, ':****@');
console.log('Using:', safeUrl);

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });

pool.query('SELECT 1 as ok')
  .then(() => {
    console.log('SUCCESS: Database connection works.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    if (err.message.includes('password')) {
      console.error('→ Check the password in backend/.env (DATABASE_URL)');
      console.error('→ If it has special chars (e.g. #, @, %), try a simple password or URL-encode them.');
    }
    if (err.message.includes('ECONNREFUSED')) {
      console.error('→ PostgreSQL is not running or not on localhost:5432');
    }
    process.exit(1);
  })
  .finally(() => pool.end());
