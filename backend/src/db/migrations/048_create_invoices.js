const { sql } = require('kysely')

const up = async (db) => {
    await db.schema
    .createTable('invoices')
    .addColumn('id','uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('invoice_number', 'varchar(50)', (col) => col.unique())
    .addColumn('invoice_date', 'timestamptz')
    .addColumn('due_date', 'timestamptz')
    .addColumn('items', 'jsonb')
    .addColumn('vat_amount', sql`numeric(10,2)`)
    .addColumn('subtotal', sql`numeric(10,2)`)
    .addColumn('total', sql`numeric(10,2)`)
    .addColumn('description', 'text')
    .addColumn('currency', 'varchar(50)')
    .addColumn('status', 'varchar(50)')
    .addColumn('invoice_pdf', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now'))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now'))
    .execute()
}

const down = async(db) => {
    await db.schema
    .dropTable('invoices')
    .execute()
}

module.exports = { up, down }