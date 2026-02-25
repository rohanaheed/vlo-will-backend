const up = async (db) => {
  await db.schema
    .createTable('will_feedback')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => col.notNull().references('wills.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('ease_of_use', 'varchar(255)')
    .addColumn('improvement_area', 'varchar(255)')
    .addColumn('clarity_rating', 'varchar(255)')
    .addColumn('navigation_rating', 'varchar(255)')
    .addColumn('overall_rating', 'integer')
    .addColumn('review', 'text')
    .addColumn('is_public', 'boolean', (col) => col.defaultTo(false))
    .addColumn('attachments', 'jsonb', (col) => col.defaultTo('[]'))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now'))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now'))
    .execute();

    await db.schema
    .createIndex('idx_will_feedback_will_id')
    .ifNotExists()
    .on('will_feedback')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.dropTable('will_feedback').execute();
};

module.exports = { up, down };

