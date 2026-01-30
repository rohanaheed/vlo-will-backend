/**
 * Migration: Create audit_logs and password_resets tables
 */

const up = async (db) => {
  // Create audit_logs table
  await db.schema
    .createTable('audit_logs')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('set null')
    )
    .addColumn('action', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'uuid')
    .addColumn('old_values', 'jsonb')
    .addColumn('new_values', 'jsonb')
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create password_resets table
  await db.schema
    .createTable('password_resets')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('token', 'varchar(255)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_audit_logs_user_id')
    .ifNotExists()
    .on('audit_logs')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_entity')
    .ifNotExists()
    .on('audit_logs')
    .columns(['entity_type', 'entity_id'])
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_created_at')
    .ifNotExists()
    .on('audit_logs')
    .column('created_at')
    .execute();

  await db.schema
    .createIndex('idx_password_resets_token')
    .ifNotExists()
    .on('password_resets')
    .column('token')
    .execute();

  await db.schema
    .createIndex('idx_password_resets_user_id')
    .ifNotExists()
    .on('password_resets')
    .column('user_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('password_resets').ifExists().execute();
  await db.schema.dropTable('audit_logs').ifExists().execute();
};

module.exports = { up, down };
