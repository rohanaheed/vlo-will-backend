const { sql } = require('kysely');

const createEnumIfNotExists = async (db, typeName, values) => {
  const valuesStr = values.map(v => `'${v}'`).join(', ');
  await sql`
    DO $$ BEGIN
      CREATE TYPE ${sql.raw(typeName)} AS ENUM (${sql.raw(valuesStr)});
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `.execute(db);
};

const up = async (db) => {
  await createEnumIfNotExists(db, 'body_disposition', ['burial','cremation','no_preference']);

  await createEnumIfNotExists(db, 'organ_donation_type', ['all','specific']);

  await db.schema
    .alterTable('funeral_wishes')
    .dropColumn('wishes_details')
    .dropColumn('expense_clause')
    .dropColumn('islamic_burial_wishes')

    .addColumn('body_disposition', sql`body_disposition`)
    .addColumn('burial_location', 'boolean', (col) => col.defaultTo(false))
    .addColumn('location', 'varchar(255)')
    .addColumn('specific_request', 'text')
    .addColumn('funeral_expense', 'boolean', (col) => col.defaultTo(false))
    .addColumn('payment_priority', 'varchar(255)')
    .addColumn('title', 'varchar(255)')
    .addColumn('provider_name', 'varchar(255)')
    .addColumn('policy_number', 'varchar(255)')
    .addColumn('holder_name', 'varchar(255)')
    .addColumn('coverage_amount', sql`numeric(14,2)`)
    .addColumn('phone_country_code', 'varchar(10)')
    .addColumn('phone', 'varchar(50)')
    .addColumn('email', 'varchar(255)')
    .addColumn('website_url', 'varchar(255)')
    .addColumn('document_location', 'varchar(255)')
    .addColumn('donate_organ', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('organ_donation_type', sql`organ_donation_type`)
    .addColumn('heart', 'boolean', (col) => col.defaultTo(false))
    .addColumn('lungs', 'boolean', (col) => col.defaultTo(false))
    .addColumn('kidneys', 'boolean', (col) => col.defaultTo(false))
    .addColumn('liver', 'boolean', (col) => col.defaultTo(false))
    .addColumn('corneas', 'boolean', (col) => col.defaultTo(false))
    .addColumn('pancreas', 'boolean', (col) => col.defaultTo(false))
    .addColumn('tissue', 'boolean', (col) => col.defaultTo(false))
    .addColumn('small_bowel', 'boolean', (col) => col.defaultTo(false))
    .addColumn('is_registered_donor', 'boolean', (col) => col.defaultTo(false))
    .addColumn('reference_number', 'varchar(255)')
    .addColumn('additional_notes', 'text')
    .execute();

  await db.schema
    .createIndex('idx_funeral_wishes_will_id')
    .ifNotExists()
    .on('funeral_wishes')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropIndex('idx_funeral_wishes_will_id').ifExists().execute();

  await db.schema.alterTable('funeral_wishes')
    .dropColumn('body_disposition')
    .dropColumn('burial_location')
    .dropColumn('location')
    .dropColumn('specific_request')
    .dropColumn('funeral_expense')
    .dropColumn('payment_priority')
    .dropColumn('provider_name')
    .dropColumn('policy_number')
    .dropColumn('holder_name')
    .dropColumn('coverage_amount')
    .dropColumn('phone_country_code')
    .dropColumn('phone')
    .dropColumn('email')
    .dropColumn('website_url')
    .dropColumn('document_location')
    .dropColumn('organ_donation_type')
    .dropColumn('heart')
    .dropColumn('lungs')
    .dropColumn('kidneys')
    .dropColumn('liver')
    .dropColumn('corneas')
    .dropColumn('pancreas')
    .dropColumn('tissue')
    .dropColumn('small_bowel')
    .dropColumn('registered_donor')
    .dropColumn('reference_number')
    .dropColumn('additional_notes')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute();
};

module.exports = { up, down };
