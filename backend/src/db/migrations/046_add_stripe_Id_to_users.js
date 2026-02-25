const up = async (db) => {
    await db.schema
    .alterTable('users')
    .addColumn('stripe_customer_id', 'varchar(255)')
    .execute()
}

const down = async (db) => {
    await db.schema
    .alterTable('users')
    .dropColumn('stripe_customer_id')
    .execute()
}

module.exports = { up, down}