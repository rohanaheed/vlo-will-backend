/**
 * Migration: Add step locking and payment fields to wills table
 */

const { sql } = require('kysely');

/**
 * Helper to add column if not exists
 */
const addColumnIfNotExists = async (db, table, column, type, defaultValue = null) => {
  try {
    let query = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`;
    if (defaultValue !== null) {
      query += ` DEFAULT ${defaultValue}`;
    }
    await sql.raw(query).execute(db);
  } catch (e) {
    // Column might already exist
  }
};

const up = async (db) => {
  // Add columns one by one with IF NOT EXISTS
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS highest_completed_step integer DEFAULT 0 NOT NULL`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false NOT NULL`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS paid_at timestamptz`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS payment_id uuid`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS edit_unlocked boolean DEFAULT false NOT NULL`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0 NOT NULL`.execute(db);

  // Add foreign key for payment_id (try/catch for if exists)
  try {
    await db.schema
      .alterTable('wills')
      .addForeignKeyConstraint('fk_wills_payment_id', ['payment_id'], 'payments', ['id'])
      .onDelete('set null')
      .execute();
  } catch (e) {
    // Constraint might already exist
  }
};

const down = async (db) => {
  try {
    await db.schema
      .alterTable('wills')
      .dropConstraint('fk_wills_payment_id')
      .execute();
  } catch (e) {
    // Constraint might not exist
  }

  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS highest_completed_step`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS is_paid`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS paid_at`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS payment_id`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS edit_unlocked`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS edit_count`.execute(db);
};

module.exports = { up, down };
