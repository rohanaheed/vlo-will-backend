/**
 * Migration: Create assets table
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
  // Create asset type enum
  await createEnumIfNotExists(db, 'asset_type', ['property', 'bank_account', 'investment', 'vehicle', 'other']);

  await db.schema
    .createTable('assets')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('asset_type', sql`asset_type`, (col) => col.notNull())
    // Property fields
    .addColumn('property_address', 'text')
    .addColumn('property_legal_description', 'text')
    // Bank fields
    .addColumn('bank_name', 'varchar(255)')
    .addColumn('account_number', 'varchar(100)')
    // Investment fields
    .addColumn('investment_description', 'text')
    // Vehicle fields
    .addColumn('vehicle_details', 'text')
    // General
    .addColumn('description', 'text')
    .addColumn('estimated_value', sql`decimal(15,2)`)
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_assets_will_id')
    .ifNotExists()
    .on('assets')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('assets').ifExists().execute();
  await db.schema.dropType('asset_type').ifExists().execute();
};

module.exports = { up, down };
