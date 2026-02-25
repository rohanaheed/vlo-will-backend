const up = async (db) => {
    await db.schema
    .createTable('user_packages')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('package_id', 'uuid', (col) => col.references('packages.id').onDelete('cascade').notNull())
    .addColumn('status', 'varchar(255)', (col) => col.defaultTo('active').notNull())
    .addColumn('billing_cycle', 'varchar(255)', (col) => col.defaultTo('monthly').notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now').notNull())
    .execute();

    await db.schema
    .createIndex('idx_user_packages_id')
    .ifNotExists()
    .on('user_packages')
    .columns(['user_id', 'package_id'])
    .execute();
}

const down = async (db) => {
    await db.schema
    .dropTable('user_packages')
    .execute();
}

module.exports = { up, down };