/**
 * Migration: Create debts table
 */

const { sql } = require('kysely');

const up = async (db) => {
  await db.schema
    .createTable('debts')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('amount', sql`decimal(15,2)`)
    .addColumn('creditor_name', 'varchar(255)')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_debts_will_id')
    .ifNotExists()
    .on('debts')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('debts').ifExists().execute();
};

module.exports = { up, down };
