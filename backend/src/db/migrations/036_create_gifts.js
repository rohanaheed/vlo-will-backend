const up = async (db) => {
    await db.schema
    .createTable('gifts')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => col.notNull().references('wills.id').onDelete('cascade'))
    .addColumn('beneficiary_name', 'varchar(255)')
    .addColumn('asset_type_beneficiary', 'varchar(255)')
    .addColumn('gift_type_beneficiary', 'varchar(255)')
    .addColumn('gift_description_beneficiary', 'varchar(1000)')
    .addColumn('additional_information_beneficiary', 'text')
    .addColumn('is_charity', 'boolean', (col) => col.defaultTo(false))
    .addColumn('organization_name', 'varchar(255)')
    .addColumn('asset_type_charity', 'varchar(255)')
    .addColumn('gift_type_charity', 'varchar(255)')
    .addColumn('gift_description_charity', 'varchar(1000)')
    .addColumn('additional_information_charity', 'text')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

     await db.schema
    .createIndex('idx_gifts_will_id')
    .ifNotExists()
    .on('gifts')
    .column('will_id')
    .execute();
}

const down = async (db) => {
    await db.schema.dropTable('gifts').execute();
}

module.exports = { up, down };