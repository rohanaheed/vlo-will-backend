const up = async (db) => {
  await db.schema
    .createTable('beneficiary')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('have_children', 'boolean', (col) => col.defaultTo(false))
    .addColumn('wants_backup', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_charity', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

    await db.schema
    .createIndex('idx_beneficiary_will_id')
    .ifNotExists()
    .on('beneficiary')
    .column('will_id')
    .execute();
}
const down = async (db) => {
    await db.schema.dropTable('beneficiary').ifExists().execute()
}

module.exports = { up, down };