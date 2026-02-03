/**
 * Migration: Update testators table with Figma fields
 * 
 * Adds to testators:
 * - title (Mr/Mrs/Ms/Dr)
 * - known_as (known by another name)
 * - gender
 * - building_number, building_name, street, town
 * - national_insurance_number
 * - phone_country_code, phone, email
 * - marital_status
 * - include_future_marriage_clause
 * - declaration_confirmed
 * 
 * Adds to wills:
 * - jurisdiction (England, Wales, Scotland, Northern Ireland)
 */

const { sql } = require('kysely');

const up = async (db) => {
  // Add new columns to testators table
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS title varchar(20)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS known_as varchar(255)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS gender varchar(50)`.execute(db);
  
  // Address fields
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS building_number varchar(50)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS building_name varchar(100)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS street varchar(255)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS town varchar(100)`.execute(db);
  
  // Contact & ID
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS national_insurance_number varchar(20)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS phone_country_code varchar(10)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS phone varchar(30)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS email varchar(255)`.execute(db);
  
  // Marital & Legal
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS marital_status varchar(50)`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS include_future_marriage_clause boolean DEFAULT false`.execute(db);
  await sql`ALTER TABLE testators ADD COLUMN IF NOT EXISTS declaration_confirmed boolean DEFAULT false`.execute(db);

  // Add jurisdiction to wills table
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS jurisdiction varchar(50) DEFAULT 'england'`.execute(db);
};

const down = async (db) => {
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS title`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS known_as`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS gender`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS building_number`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS building_name`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS street`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS town`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS national_insurance_number`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS phone_country_code`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS phone`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS email`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS marital_status`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS include_future_marriage_clause`.execute(db);
  await sql`ALTER TABLE testators DROP COLUMN IF EXISTS declaration_confirmed`.execute(db);
  
  // Remove from wills
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS jurisdiction`.execute(db);
};

module.exports = { up, down };
