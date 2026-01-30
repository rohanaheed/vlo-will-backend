/**
 * Migration: Create testators table
 */

const up = async (db) => {
  await db.schema
    .createTable('testators')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('full_name', 'varchar(255)')
    .addColumn('first_name', 'varchar(100)')
    .addColumn('middle_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('date_of_birth', 'date')
    .addColumn('father_name', 'varchar(255)')
    .addColumn('husband_name', 'varchar(255)')
    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('address_line_2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('has_property_abroad', 'boolean', (col) => col.defaultTo(false))
    .addColumn('national_id', 'varchar(100)')
    .addColumn('passport_number', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create spouses table
  await db.schema
    .createTable('spouses')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('full_name', 'varchar(255)')
    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('address_line_2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('is_same_address', 'boolean', (col) => col.defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('spouses').ifExists().execute();
  await db.schema.dropTable('testators').ifExists().execute();
};

module.exports = { up, down };
