const up = async (db) => {
    await db.schema
    .alterTable('spouses')
    .addColumn('is_spouse', 'boolean', (col) => col.defaultTo(false))
    .execute();
}

const down = async (db) => {
    await db.schema
    .alterTable('spouses')
    .dropColumn('is_spouse')
    .execute();
}

module.exports = { up, down };