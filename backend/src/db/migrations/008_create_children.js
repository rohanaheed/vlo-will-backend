/**
 * Migration: Create children table
 */

const up = async (db) => {
  await db.schema
    .createTable('children')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('full_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('date_of_birth', 'date')
    .addColumn('is_minor', 'boolean', (col) => col.defaultTo(false))
    .addColumn('is_dependent', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_children_will_id')
    .ifNotExists()
    .on('children')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('children').ifExists().execute();
};

module.exports = { up, down };
