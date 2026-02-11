const { sql } = require('kysely');

const up = async (db) => {
  await db.schema
    .alterTable('wills')
    .dropColumn('is_for_self')
    .dropColumn('marital_status')
    .dropColumn('not_for_self_explanation')
    .dropColumn('signing_place')
    .dropColumn('execution_place')
    .dropColumn('revocation_clause_date')
    .dropColumn('additional_clauses')
    .execute();

  await sql`
    ALTER TABLE wills
    ALTER COLUMN will_type SET DEFAULT 'general',
    ALTER COLUMN will_type SET NOT NULL
  `.execute(db);
};

const down = async (db) => {
  await db.schema
    .alterTable('wills')
    .addColumn('is_for_self', 'boolean', (col) => col.defaultTo(false))
    .addColumn('marital_status', 'varchar(255)')
    .addColumn('not_for_self_explanation', 'text')
    .addColumn('signing_place', 'varchar(255)')
    .addColumn('execution_place', 'varchar(255)')
    .addColumn('revocation_clause_date', 'date')
    .addColumn('additional_clauses', 'text')
    .execute();

  await sql`
    ALTER TABLE wills
    ALTER COLUMN will_type DROP DEFAULT
  `.execute(db);
};

module.exports = { up, down };
