/**
 * Migration: Create funeral_wishes table
 */

const up = async (db) => {
  await db.schema
    .createTable('funeral_wishes')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('wishes_details', 'text')
    .addColumn('expense_clause', 'text')
    // Islamic specific
    .addColumn('islamic_burial_wishes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create witnesses table
  await db.schema
    .createTable('witnesses')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('full_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('address_line_2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_witnesses_will_id')
    .ifNotExists()
    .on('witnesses')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('witnesses').ifExists().execute();
  await db.schema.dropTable('funeral_wishes').ifExists().execute();
};

module.exports = { up, down };
