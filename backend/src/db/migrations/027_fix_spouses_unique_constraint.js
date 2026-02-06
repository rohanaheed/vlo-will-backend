// Migration to fix constraints on spouses and beneficiaries tables
const { sql } = require('kysely');

const up = async (db) => {

  await sql`
    ALTER TABLE spouses 
    DROP CONSTRAINT IF EXISTS spouses_will_id_key
  `.execute(db);
  await sql`
    ALTER TABLE beneficiaries 
    DROP CONSTRAINT IF EXISTS fk_beneficiaries_alternate
  `.execute(db);
  await sql`
    ALTER TABLE charities 
    DROP CONSTRAINT IF EXISTS fk_charities_alternate
  `.execute(db);
};

const down = async (db) => {
  await sql`
    ALTER TABLE spouses 
    ADD CONSTRAINT spouses_will_id_key UNIQUE (will_id)
  `.execute(db);
  await sql`
    ALTER TABLE beneficiaries
    ADD CONSTRAINT fk_beneficiaries_alternate 
    FOREIGN KEY (alternate_for_id) REFERENCES beneficiaries(id) ON DELETE SET NULL
  `.execute(db);

  await sql`
    ALTER TABLE charities
    ADD CONSTRAINT fk_charities_alternate 
    FOREIGN KEY (alternate_for_id) REFERENCES charities(id) ON DELETE SET NULL
  `.execute(db);
};

module.exports = { up, down };
