const up = async (db) => {
    await db.schema
    .alterTable('payment_methods')
    .dropColumn('first_name')
    .dropColumn('middle_name')
    .dropColumn('last_name')
    .dropColumn('expiry')

    .addColumn('full_name','varchar(255)')
    .addColumn('exp_month','integer')
    .addColumn('exp_year','integer')
    .addColumn('brand','varchar(255)')
    .addColumn('payment_type','varchar(255)')
    .addColumn('billing_address','varchar(255)')
    .addColumn('email', 'varchar(255)')
    .execute()
}

const down = async (db) => {
    await db.schema
    .alterTable('payment_methods')
    .dropColumn('full_name')
    .dropColumn('exp_month')
    .dropColumn('exp_year')
    .dropColumn('brand')
    .dropColumn('payment_type')
    .dropColumn('billing_address')
    .dropColumn('email')
    .addColumn('first_name', 'varchar(255)')
    .addColumn('middle_name', 'varchar(255)')
    .addColumn('last_name', 'varchar(255)')
    .addColumn('expiry', 'varchar(255)')
    .execute()
}

module.exports = { up, down }