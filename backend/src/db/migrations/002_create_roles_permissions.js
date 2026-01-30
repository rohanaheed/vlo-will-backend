/**
 * Migration: Create roles and permissions tables
 */

const up = async (db) => {
  // Create roles table
  await db.schema
    .createTable('roles')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('is_system', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create permissions table
  await db.schema
    .createTable('permissions')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('module', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create role_permissions junction table
  await db.schema
    .createTable('role_permissions')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('role_id', 'uuid', (col) => 
      col.references('roles.id').onDelete('cascade').notNull()
    )
    .addColumn('permission_id', 'uuid', (col) => 
      col.references('permissions.id').onDelete('cascade').notNull()
    )
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addUniqueConstraint('unique_role_permission', ['role_id', 'permission_id'])
    .execute();

  // Add foreign key from users to roles
  try {
    await db.schema
      .alterTable('users')
      .addForeignKeyConstraint('fk_users_role_id', ['role_id'], 'roles', ['id'])
      .onDelete('set null')
      .execute();
  } catch (e) {
    // Constraint might already exist
  }

  // Create indexes
  await db.schema
    .createIndex('idx_permissions_module')
    .ifNotExists()
    .on('permissions')
    .column('module')
    .execute();

  await db.schema
    .createIndex('idx_role_permissions_role_id')
    .ifNotExists()
    .on('role_permissions')
    .column('role_id')
    .execute();
};

const down = async (db) => {
  // Remove foreign key first
  try {
    await db.schema
      .alterTable('users')
      .dropConstraint('fk_users_role_id')
      .execute();
  } catch (e) {
    // Constraint might not exist
  }

  await db.schema.dropTable('role_permissions').ifExists().execute();
  await db.schema.dropTable('permissions').ifExists().execute();
  await db.schema.dropTable('roles').ifExists().execute();
};

module.exports = { up, down };
