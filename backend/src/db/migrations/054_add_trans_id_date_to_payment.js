const up = async (db) => {
    await db.schema
    .alterTable('payments')
    .addColumn('transaction_id', 'varchar(255)')
    .addColumn('payment_date', 'timestamptz', (col) => col.defaultTo('now'))
    .execute()
}

const down = async (db) => {
    await db.schema
    .alterTable('payments')
    .dropColumn('transaction_id')
    .dropColumn('payment_date')
    .execute()
}
module.exports = { up, down }