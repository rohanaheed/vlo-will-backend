/**
 * Migration: Create Islamic will related tables
 */

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
  // Create enums
  await createEnumIfNotExists(db, 'islamic_school', ['hanafi', 'maliki', 'shafii', 'hanbali', 'jafari']);
  await createEnumIfNotExists(db, 'heir_relationship', [
    'husband', 'wife', 'son', 'daughter', 'father', 'mother',
    'full_brother', 'full_sister', 'paternal_brother', 'paternal_sister',
    'maternal_brother', 'maternal_sister', 'grandfather', 'grandmother',
    'grandson', 'granddaughter'
  ]);

  // Create islamic_will_details table
  await db.schema
    .createTable('islamic_will_details')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('school_of_thought', sql`islamic_school`)
    .addColumn('declaration_of_faith', 'text')
    .addColumn('unfulfilled_obligations', 'jsonb') // missed prayers, fasting, zakat, hajj
    .addColumn('kaffarah_description', 'text')
    .addColumn('kaffarah_amount', sql`decimal(12,2)`)
    .addColumn('unpaid_mahr', sql`decimal(12,2)`)
    .addColumn('sadaqa_jariyah_details', 'text')
    .addColumn('loan_forgiveness_details', 'text')
    .addColumn('charitable_bequest_percentage', sql`decimal(5,2)`) // max 33.33%
    .addColumn('appointed_scholar_name', 'varchar(255)')
    .addColumn('appointed_scholar_contact', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create islamic_heirs table
  await db.schema
    .createTable('islamic_heirs')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('islamic_will_details_id', 'uuid', (col) => 
      col.references('islamic_will_details.id').onDelete('cascade').notNull()
    )
    .addColumn('relationship', sql`heir_relationship`, (col) => col.notNull())
    .addColumn('full_name', 'varchar(255)')
    .addColumn('is_alive', 'boolean', (col) => col.defaultTo(true))
    .addColumn('calculated_share', sql`decimal(10,6)`) // Auto-calculated based on Faraid
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_islamic_heirs_details_id')
    .ifNotExists()
    .on('islamic_heirs')
    .column('islamic_will_details_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('islamic_heirs').ifExists().execute();
  await db.schema.dropTable('islamic_will_details').ifExists().execute();
  await db.schema.dropType('heir_relationship').ifExists().execute();
  await db.schema.dropType('islamic_school').ifExists().execute();
};

module.exports = { up, down };
