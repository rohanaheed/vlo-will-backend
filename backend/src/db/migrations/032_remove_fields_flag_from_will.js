// Migrattion to remove is_spouse, have_children, wants_backup, has_chaity fields from wills table

const up = async (db) => {
    await db.schema.alterTable('wills')
    .dropColumn('is_spouse')
    .dropColumn('have_children')
    .dropColumn('wants_backup')
    .dropColumn('has_charity')
    .execute();
}

const down = async (db) => {
    await db.schema.alterTable('wills')
    .addColumn('is_spouse', 'boolean', (col) => col.defaultTo(false))
    .addColumn('have_children', 'boolean', (col) => col.defaultTo(false))
    .addColumn('wants_backup', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_chaity', 'boolean', (col) => col.defaultTo(false))
    .execute();
}

module.exports = { up, down };