const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TABLE invoices DROP COLUMN IF EXISTS package_id`.execute(db);
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL`.execute(db);

  await sql`ALTER TABLE subscriptions DROP COLUMN IF EXISTS package_id`.execute(db);
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE invoices DROP COLUMN IF EXISTS package_id`.execute(db);

  await sql`ALTER TABLE subscriptions DROP COLUMN IF EXISTS package_id`.execute(db);
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS package_id varchar(255) NOT NULL`.execute(db);
};

module.exports = { up, down };
