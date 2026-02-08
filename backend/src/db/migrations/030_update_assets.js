// Migration to update assets to add boolean flags for asset types and old fields for specific asset details

const up = async (db) => {
  await db.schema.createTable('assets')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('has_property', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_bank_account', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_investment', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_valuable_item', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_digital_asset', 'boolean', (col) => col.defaultTo(false))
    .addColumn('has_intellectual_asset', 'boolean', (col) => col.defaultTo(false))
    .execute();

  await db.schema
    .createIndex('idx_assets_will_id')
    .ifNotExists()
    .on('assets')
    .column('will_id')
    .execute();
};

const down = async (db) => {
  await db.schema.alterTable('assets')
    .dropColumn('will_id')
    .dropColumn('has_property')
    .dropColumn('has_bank_account')
    .dropColumn('has_investment')
    .dropColumn('has_valuable_item')
    .dropColumn('has_digital_asset')
    .dropColumn('has_intellectual_asset')
    .execute();

  await db.schema
    .dropIndex('idx_assets_will_id')
    .on('assets')
    .execute();
};

module.exports = { up, down };

