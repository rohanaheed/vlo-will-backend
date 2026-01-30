/**
 * Migration: Create wills table
 */

const { sql } = require('kysely');

/**
 * Helper to create enum type if not exists
 */
const createEnumIfNotExists = async (db, typeName, values) => {
  const valuesStr = values.map(v => `'${v}'`).join(', ');
  await sql`
    DO $$ BEGIN
      CREATE TYPE ${sql.raw(typeName)} AS ENUM (${sql.raw(valuesStr)});
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);
};

const up = async (db) => {
  // Create enum types (skip if already exists)
  await createEnumIfNotExists(db, 'will_type', ['general', 'islamic']);
  await createEnumIfNotExists(db, 'will_status', ['draft', 'in_progress', 'completed', 'signed']);
  await createEnumIfNotExists(db, 'marital_status', ['single', 'married', 'civil_partner']);

  // Create wills table
  await db.schema
    .createTable('wills')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('will_type', sql`will_type`, (col) => col.notNull())
    .addColumn('marital_status', sql`marital_status`, (col) => col.notNull())
    .addColumn('status', sql`will_status`, (col) => col.defaultTo('draft').notNull())
    .addColumn('current_step', 'integer', (col) => col.defaultTo(1).notNull())
    .addColumn('is_for_self', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('not_for_self_explanation', 'text')
    .addColumn('signing_date', 'date')
    .addColumn('signing_place', 'varchar(255)')
    .addColumn('execution_date', 'date')
    .addColumn('execution_place', 'varchar(255)')
    .addColumn('revocation_clause_date', 'date')
    .addColumn('additional_clauses', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_wills_user_id')
    .ifNotExists()
    .on('wills')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_wills_status')
    .ifNotExists()
    .on('wills')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_wills_will_type')
    .ifNotExists()
    .on('wills')
    .column('will_type')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('wills').ifExists().execute();
  await db.schema.dropType('marital_status').ifExists().execute();
  await db.schema.dropType('will_status').ifExists().execute();
  await db.schema.dropType('will_type').ifExists().execute();
};

module.exports = { up, down };
