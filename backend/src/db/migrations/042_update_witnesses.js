const { sql } = require('kysely');

const up = async (db) => {
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS address_line_1`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS address_line_2`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS adress_line_2`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS will_id`.execute(db);

  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS witness_id uuid NOT NULL REFERENCES testator_witnesses(id) ON DELETE CASCADE`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS building_number varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS building_name varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS title varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS occupation varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS witness_signature varchar(255)`.execute(db);

  await db.schema
    .createIndex('idx_witnesses_witness_id')
    .ifNotExists()
    .on('witnesses')
    .column('witness_id')
    .execute();
};

const down = async (db) => {
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS witness_id`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS building_number`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS building_name`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS title`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS occupation`.execute(db);
  await sql`ALTER TABLE witnesses DROP COLUMN IF EXISTS witness_signature`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS address_line_1 varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS address_line_2 varchar(255)`.execute(db);
  await sql`ALTER TABLE witnesses ADD COLUMN IF NOT EXISTS will_id uuid REFERENCES wills(id) ON DELETE CASCADE`.execute(db);
};

module.exports = { up, down }
