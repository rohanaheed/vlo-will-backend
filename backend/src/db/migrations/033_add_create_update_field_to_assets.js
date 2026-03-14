const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`.execute(db);
  await sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE assets DROP COLUMN IF EXISTS created_at`.execute(db);
  await sql`ALTER TABLE assets DROP COLUMN IF EXISTS updated_at`.execute(db);
};

module.exports = { up, down };