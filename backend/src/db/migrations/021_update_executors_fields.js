/**
 * Migration: Update executors table with Figma fields
 * 
 * Adds:
 * - executor_type (individual/professional)
 * - title (Mr/Mrs/Ms/Dr)
 * - phone_country_code
 * - is_alternate (alternate executor checkbox)
 * - business_name (for professional advisors)
 * - role_title (Solicitor/Accountant/Manager for professionals)
 */

const { sql } = require('kysely');

const up = async (db) => {
  // Executor type: individual or professional advisor
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS executor_type varchar(20) DEFAULT 'individual'`.execute(db);
  
  // Title for individuals
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS title varchar(20)`.execute(db);
  
  // Phone country code
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS phone_country_code varchar(10)`.execute(db);
  
  // Alternate executor flag (different from backup)
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS is_alternate boolean DEFAULT false`.execute(db);
  
  // Professional advisor fields
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS business_name varchar(255)`.execute(db);
  await sql`ALTER TABLE executors ADD COLUMN IF NOT EXISTS role_title varchar(100)`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS executor_type`.execute(db);
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS title`.execute(db);
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS phone_country_code`.execute(db);
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS is_alternate`.execute(db);
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS business_name`.execute(db);
  await sql`ALTER TABLE executors DROP COLUMN IF EXISTS role_title`.execute(db);
};

module.exports = { up, down };
