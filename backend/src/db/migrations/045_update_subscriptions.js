const up = async (db) => {
    await db.schema
    .alterTable('subscriptions')
    .dropColumn('plan_type')
    .dropColumn('current_period_start')
    .dropColumn('current_period_end')
    .dropColumn('stripe_customer_id')
    
    .addColumn('package_id', 'uuid', (col) => col.references('packages.id').onDelete('cascade').notNull())
    .addColumn('start_date', 'timestamptz')
    .addColumn('end_date', 'timestamptz')
    .addColumn('auto_renew', 'boolean', (col) => col.defaultTo(true))
    .execute()
}

const down = async (db) => {
    await db.schema
    .dropTable('subscriptions')
    .execute()
}

module.exports = { up, down}