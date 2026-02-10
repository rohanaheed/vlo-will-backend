const up = async (db) => {
    await db.schema
    .createTable('residual_estates')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => col.notNull().references('wills.id').onDelete('cascade'))
    .addColumn('full_name', 'varchar(255)')
    .addColumn('relationship_to_testator', 'varchar(255)')
    .addColumn('description', 'varchar(1000)')
    .addColumn('additional_information', 'text')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

    await db.schema
    .createIndex('idx_residual_will_id')
    .ifNotExists()
    .on('residual_estates')
    .column('will_id')
    .execute();
}

const down = async (db) => {
    await db.schema.dropTable('residual_estates').execute();
}

module.exports = { up, down };