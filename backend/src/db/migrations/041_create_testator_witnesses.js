const up = async (db) => {
    await db.schema
    .createTable('testator_witnesses')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => col.references('wills.id').onDelete('cascade').notNull())

    .addColumn('title', 'varchar(255)')
    .addColumn('full_name', 'varchar(255)')
    .addColumn('date', 'varchar(255)')
    .addColumn('have_witness', 'boolean', (col) => col.defaultTo(false))
    .execute()

    await db.schema
    .createIndex('idx_testator_witnesses_will_id')
    .ifNotExists()
    .on('testator_witnesses')
    .column('will_id')
    .execute();
}

const down = async (db) => {
    await db.schema.dropTable('testator_witnesses').execute();
}

module.exports = { up, down }