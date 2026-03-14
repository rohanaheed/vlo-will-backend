const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS type varchar(255)`.execute(db);
  await sql`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token varchar(255)`.execute(db);
  await sql`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS otp varchar(255)`.execute(db);
  await sql`ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE password_resets DROP COLUMN IF EXISTS type`.execute(db);
  await sql`ALTER TABLE password_resets DROP COLUMN IF EXISTS token`.execute(db);
  await sql`ALTER TABLE password_resets DROP COLUMN IF EXISTS otp`.execute(db);
  await sql`ALTER TABLE password_resets DROP COLUMN IF EXISTS updated_at`.execute(db);
};

module.exports = { up, down };