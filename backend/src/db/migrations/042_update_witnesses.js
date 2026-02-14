const up = async (db) => {
    await db.schema
    .alterTable('witnesses')
    .dropColumn('address_line_1')
    .dropColumn('adress_line_2')
    .dropColumn('will_id')

    .addColumn('witness_id', 'uuid', (col) => col.notNull().references('testator_witnesses.id').onDelete('cascade'))
    .addColumn('building_number', 'varchar(255)')
    .addColumn('building_name', 'varchar(255)')
    .addColumn('title', 'varchar(255)')
    .addColumn('occupation', 'varchar(255)')
    .addColumn('witness_signature', 'varchar(255)')
    .execute()

    await db.schema
    .createIndex('idx_witnesses_witness_id')
    .ifNotExists()
    .on('witnesses')
    .column('witness_id')
    .execute()
}

const down = async (db) => {
    await db.schema
    .alterTable('witnesses')
    .dropColumn('witness_id')
    .dropColumn('building_number')
    .dropColumn('building_name')
    .dropColumn('title')
    .dropColumn('occupation')
    .dropColumn('witness_signature')

    .addColumn('address_line_1', 'varchar(255)')
    .addColumn('adress_line_2', 'varchar(255)')
    .addColumn('will_id', 'uuid', (col) => col.notNull().references('wills.id').onDelete('cascade'))
    .execute()
}

module.exports = { up, down }
