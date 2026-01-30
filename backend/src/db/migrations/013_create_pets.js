/**
 * Migration: Create pets table
 */

const { sql } = require('kysely');

const up = async (db) => {
  await db.schema
    .createTable('pets')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar(100)')
    .addColumn('description', 'text')
    .addColumn('fund_amount', sql`decimal(12,2)`)
    .addColumn('let_executor_appoint_caretaker', 'boolean', (col) => col.defaultTo(true))
    .addColumn('caretaker_name', 'varchar(255)')
    .addColumn('caretaker_address', 'text')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_pets_will_id')
    .ifNotExists()
    .on('pets')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('pets').ifExists().execute();
};

module.exports = { up, down };
