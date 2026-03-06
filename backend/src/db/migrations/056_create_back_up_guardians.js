const up = async (db) => {
    await db.schema
    .createTable("backup_guardians")
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('beneficiary_id', 'uuid', (col) => col.references('beneficiary.id').onDelete('cascade').notNull())
    .addColumn('title', 'varchar(50)')
    .addColumn('full_name', 'varchar(255)')
    .addColumn('role_type', 'varchar(50)')
    .addColumn('relationship_to_testator', 'varchar(50)')
    .addColumn('date_of_birth', 'date')
    .addColumn('building_number', 'varchar(50)')
    .addColumn('building_name', 'varchar(100)')
    .addColumn('street', 'varchar(255)')
    .addColumn('town', 'varchar(100)')
    .addColumn('city', 'varchar(100)')
    .addColumn('county', 'varchar(100)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(100)')
    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamp')
    .addColumn('updated_at', 'timestamp')
    .execute()

    await db.schema
    .createIndex('idx_backup_guardians_beneficiary_id')
    .on('backup_guardians')
    .column('beneficiary_id')
    .execute();
}

const down = async (db) => {
    await db.schema
    .dropTable('backup_guardians')
    .execute();
}

module.exports = { up, down }
