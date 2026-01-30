/**
 * Migration: Create charities table
 */

const { sql } = require('kysely');

const up = async (db) => {
  await db.schema
    .createTable('charities')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('address_line_2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('registration_number', 'varchar(100)')
    .addColumn('gift_amount', sql`decimal(12,2)`)
    .addColumn('gift_percentage', sql`decimal(5,2)`)
    .addColumn('gift_description', 'text')
    .addColumn('is_alternate', 'boolean', (col) => col.defaultTo(false))
    .addColumn('alternate_for_id', 'uuid')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Add self-referencing foreign key for alternates
  try {
    await db.schema
      .alterTable('charities')
      .addForeignKeyConstraint('fk_charities_alternate', ['alternate_for_id'], 'charities', ['id'])
      .onDelete('set null')
      .execute();
  } catch (e) {
    // Constraint might already exist
  }

  // Create index
  await db.schema
    .createIndex('idx_charities_will_id')
    .ifNotExists()
    .on('charities')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('charities').ifExists().execute();
};

module.exports = { up, down };
