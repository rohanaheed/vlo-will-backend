const up = async (db) => {
    await db.schema
    .createTable('payment_methods')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('first_name', 'varchar(255)')
    .addColumn('middle_name', 'varchar(255)')
    .addColumn('last_name', 'varchar(255)')
    .addColumn('card_number', 'varchar(255)')
    .addColumn('cvv', 'varchar(255)')
    .addColumn('expiry', 'varchar(255)')
    .addColumn('zip_code', 'varchar(255)')
    .addColumn('method_type', 'varchar(255)')
    .addColumn('is_default', 'boolean', (col) => col.defaultTo(true))
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true))
    .addColumn('stripe_payment_method_id', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now'))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now'))
    .execute()

    await db.schema
    .createIndex('idx_user_payment_method_id')
    .ifNotExists()
    .on('payment_methods')
    .columns(['user_id'])
    .execute()
}

const down = async (db) => {
    await db.schema
    .dropTable('payment_methods')
    .execute()
}

module.exports = { up, down}