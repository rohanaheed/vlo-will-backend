// Migration to add google_id column to users table for Google OAuth
const up = async (db) => {
  // Add google_id Column to users table
  await db.schema
    .alterTable('users')
    .addColumn('google_id', 'varchar(255)')
    .execute();

  // Create unique index on google_id 
  await db.schema
    .createIndex('idx_users_google_id')
    .ifNotExists()
    .on('users')
    .column('google_id')
    .execute();
};

const down = async (db) => {
  await db.schema
    .alterTable('users')
    .dropColumn('google_id')
    .execute();
};

module.exports = { up, down };
