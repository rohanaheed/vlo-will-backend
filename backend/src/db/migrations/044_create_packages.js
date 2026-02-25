const { sql } = require('kysely')

const up = async (db) => {
  await db.schema
    .createTable('packages')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)')
    .addColumn('subscription_type', 'varchar(50)')
    .addColumn('currency', 'varchar(50)')
    .addColumn('billing_cycle', 'varchar(50)')
    .addColumn('price_monthly',  sql`numeric(10,2)`)
    .addColumn('price_yearly', sql`numeric(10,2)`)
    .addColumn('discount',  sql`numeric(10,2)`)
    .addColumn('trial_days', 'integer')
    .addColumn('before_day', 'integer')
    .addColumn('trial_message', 'text')
    .addColumn('status', 'varchar(50)')
    .addColumn('included_features', 'jsonb')
    .addColumn('stripe_product_id', 'varchar(255)')
    .addColumn('stripe_price_monthly_id', 'varchar(255)')
    .addColumn('stripe_price_yearly_id', 'varchar(255)')
    .addColumn('stripe_coupon_id', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now'))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now'))
    .execute()
}

const down = async (db) => {
  await db.schema
    .dropTable('packages')
    .execute()
}

module.exports = { up, down }