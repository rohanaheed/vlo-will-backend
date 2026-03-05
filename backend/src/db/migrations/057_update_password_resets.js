const up = async (db) => {
    await db.schema
    .alterTable('password_resets')
    .addColumn('type', 'varchar(255)')
    .addColumn('token', 'varchar(255)')
    .addColumn('otp', 'varchar(255)')
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now') )
    .execute();
}

const down = async (db) => {
    await db.schema
    .alterTable('password_resets')
    .dropColumn('type')
    .dropColumn('email')
    .dropColumn('otp')
    .dropColumn('updated_at')
    .execute();
}

module.exports = { up, down };