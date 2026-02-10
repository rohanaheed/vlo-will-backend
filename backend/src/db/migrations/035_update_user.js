const up = async (db) => {
    await db.schema
        .alterTable('users')
        .dropColumn('first_name')
        .dropColumn('last_name')
        .dropColumn('phone')
        .addColumn('name', 'varchar(255)')
        .execute();
}

const down = async (db) => {
    await db.schema
    .alterTable('users')
    .dropColumn('name')
    .addColumn('first_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('phone', 'varchar(20)')
    .execute();
}

module.exports = { up, down };