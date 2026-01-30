/**
 * Migration: Create beneficiaries table
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
  // Create beneficiary type enum
  await createEnumIfNotExists(db, 'beneficiary_type', ['individual', 'charity']);

  await db.schema
    .createTable('beneficiaries')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('beneficiary_type', sql`beneficiary_type`, (col) => col.notNull())
    .addColumn('full_name', 'varchar(255)')
    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('address_line_2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('relationship_to_testator', 'varchar(100)')
    .addColumn('share_percentage', sql`decimal(5,2)`)
    .addColumn('specific_gift_description', 'text')
    .addColumn('is_remainder_beneficiary', 'boolean', (col) => col.defaultTo(false))
    .addColumn('inheritance_age', 'integer')
    .addColumn('pass_to_children_if_deceased', 'boolean', (col) => col.defaultTo(true))
    .addColumn('is_alternate', 'boolean', (col) => col.defaultTo(false))
    .addColumn('alternate_for_id', 'uuid')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Add self-referencing foreign key for alternates (try/catch for if exists)
  try {
    await db.schema
      .alterTable('beneficiaries')
      .addForeignKeyConstraint('fk_beneficiaries_alternate', ['alternate_for_id'], 'beneficiaries', ['id'])
      .onDelete('set null')
      .execute();
  } catch (e) {
    // Constraint might already exist
  }

  // Create indexes
  await db.schema
    .createIndex('idx_beneficiaries_will_id')
    .ifNotExists()
    .on('beneficiaries')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('beneficiaries').ifExists().execute();
  await db.schema.dropType('beneficiary_type').ifExists().execute();
};

module.exports = { up, down };
