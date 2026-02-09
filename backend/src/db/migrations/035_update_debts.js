const up = async (db) => {
    await db.schema
    .alterTable('debts')
    .dropColumn('description')

    .addColumn('type_of_debt', 'varchar(255)')
    .addColumn('additional_information', 'text')
    .execute();

}

const down = async (db) => {
    await db.schema
    .alterTable('debts')
    .dropColumn('type_of_debt')
    .dropColumn('additional_information')
    .addColumn('description', 'text', (col) => col.notNull())
    .execute();
}

module.exports = { up, down };