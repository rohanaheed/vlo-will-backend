/**
 * Migration: Create executors table
 */

const up = async (db) => {
  await db.schema
    .createTable('executors')
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
    .addColumn('relationship_to_testator', 'varchar(100)')
    .addColumn('email', 'varchar(255)')
    .addColumn('phone', 'varchar(20)')
    .addColumn('is_spouse', 'boolean', (col) => col.defaultTo(false))
    .addColumn('is_backup', 'boolean', (col) => col.defaultTo(false))
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index for will lookups
  await db.schema
    .createIndex('idx_executors_will_id')
    .ifNotExists()
    .on('executors')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('executors').ifExists().execute();
};

module.exports = { up, down };
