/**
 * Migration: Create email verification tokens table
 */

const up = async (db) => {
  await db.schema
    .createTable('email_verification_tokens')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('token', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_email_verification_tokens_user_unused')
    .ifNotExists()
    .on('email_verification_tokens')
    .columns(['user_id', 'used_at'])
    .execute();

  await db.schema
    .createIndex('idx_email_verification_tokens_token')
    .ifNotExists()
    .on('email_verification_tokens')
    .column('token')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('email_verification_tokens').ifExists().execute();
};

module.exports = { up, down };
