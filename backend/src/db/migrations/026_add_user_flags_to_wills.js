// Migration to ass user flags to will

const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS is_spouse boolean DEFAULT false`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS have_children boolean DEFAULT false`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS wants_backup boolean DEFAULT false`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS has_charity boolean DEFAULT false`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS is_spouse`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS have_children`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS wants_backup`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS has_charity`.execute(db);
};

module.exports = { up, down };
