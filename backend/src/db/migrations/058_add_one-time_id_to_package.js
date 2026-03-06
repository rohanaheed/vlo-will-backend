const { sql } = require('kysely')

const up = async (db) => {
    await db.schema
    .alterTable('packages')
    .addColumn('stripe_price_one_time_id', 'varchar(255)')
    .addColumn('price_one_time',  sql`numeric(10,2)`)
    .execute()

}

const down = async (db) => {
  await db.schema
    .alterTable('packages')
    .dropColumn('stripe_price_one_time_id')
    .dropColumn('price_one_time')
    .execute()
}
module.exports = { up, down }