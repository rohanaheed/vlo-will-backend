const up = async (db) => {
  await db.schema
    .alterTable('assets')
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();
}

const down = async (db) => {
  await db.schema
    .alterTable('assets')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute();
}

module.exports = { up, down };