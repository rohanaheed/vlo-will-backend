/**
 * Migration: Create users table
 */

const up = async (db) => {
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('first_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('phone', 'varchar(20)')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('is_email_verified', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('email_verified_at', 'timestamptz')
    .addColumn('role_id', 'uuid')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index on email for faster lookups
  await db.schema
    .createIndex('idx_users_email')
    .ifNotExists()
    .on('users')
    .column('email')
    .execute();

  // Create index on role_id for faster joins
  await db.schema
    .createIndex('idx_users_role_id')
    .ifNotExists()
    .on('users')
    .column('role_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('users').ifExists().execute();
};

module.exports = { up, down };
