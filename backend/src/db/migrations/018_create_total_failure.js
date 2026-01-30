/**
 * Migration: Create total failure clause related tables
 */

const { sql } = require('kysely');

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
  // Create distribution type enum
  await createEnumIfNotExists(db, 'distribution_type', ['equal_family', 'custom']);

  // Create total_failure_clauses table
  await db.schema
    .createTable('total_failure_clauses')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('distribution_type', sql`distribution_type`, (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create wipeout_beneficiaries table (for custom distribution)
  await db.schema
    .createTable('wipeout_beneficiaries')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('total_failure_clause_id', 'uuid', (col) => 
      col.references('total_failure_clauses.id').onDelete('cascade').notNull()
    )
    .addColumn('beneficiary_type', sql`beneficiary_type`, (col) => col.notNull())
    .addColumn('full_name', 'varchar(255)')
    .addColumn('address', 'text')
    .addColumn('share_percentage', sql`decimal(5,2)`)
    .addColumn('is_alternate', 'boolean', (col) => col.defaultTo(false))
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_wipeout_beneficiaries_clause_id')
    .ifNotExists()
    .on('wipeout_beneficiaries')
    .column('total_failure_clause_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('wipeout_beneficiaries').ifExists().execute();
  await db.schema.dropTable('total_failure_clauses').ifExists().execute();
  await db.schema.dropType('distribution_type').ifExists().execute();
};

module.exports = { up, down };
