/**
 * Migration: Add jurisdiction to wills/testators and expand spouses fields
 *
 * Adds:
 * - wills.jurisdiction (if missing)
 * - testators.jurisdiction
 * - spouses.building_number, spouses.building_name, spouses.phone_country_code,
 *   spouses.phone, spouses.date_of_birth, spouses.relationship_to_testator
 */

const { sql } = require('kysely');

const up = async (db) => {
  // Wills: jurisdiction
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS jurisdiction varchar(50) DEFAULT 'england'`.execute(db);

  // Testators: jurisdiction
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS jurisdiction varchar(50)`.execute(db);

  // Spouses: additional fields
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS title varchar(20)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS building_number varchar(50)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS building_name varchar(100)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS street varchar(255)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS town varchar(100)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS phone_country_code varchar(10)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS is_spouse boolean DEFAULT false`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS phone varchar(30)`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS date_of_birth date`.execute(db);
  await sql`ALTER TABLE spouses ADD COLUMN IF NOT EXISTS relationship_to_testator varchar(100)`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS title`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS date_of_birth`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS phone`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS phone_country_code`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS building_name`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS building_number`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS street`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS town`.execute(db);
  await sql`ALTER TABLE spouses DROP COLUMN IF EXISTS relationship_to_testator`.execute(db);

  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS jurisdiction`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS jurisdiction`.execute(db);
};

module.exports = { up, down };
