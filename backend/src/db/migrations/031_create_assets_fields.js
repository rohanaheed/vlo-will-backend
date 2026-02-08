
const { sql } = require('kysely')

const up = async (db) => {
  await db.schema
    .createTable('property_assets')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('building_number', 'varchar(255)')
    .addColumn('building_name', 'varchar(255)')
    .addColumn('street', 'varchar(255)')
    .addColumn('town', 'varchar(255)')
    .addColumn('county', 'varchar(255)')
    .addColumn('postcode', 'varchar(20)')
    .addColumn('country', 'varchar(255)')
    .addColumn('ownership_type', 'varchar(50)')
    .addColumn('estimated_value',sql`numeric(14,2)`)
    .addColumn('account_location', 'varchar(255)')
    .addColumn('is_mortgage', 'boolean', (col) => col.defaultTo(false))
    .addColumn('lender_name','varchar(255)')
    .addColumn('note','text')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

  await db.schema
    .createIndex('idx_property_assets_id')
    .ifNotExists()
    .on('property_assets')
    .column('assets_id')
    .execute();

  await db.schema
    .createTable('bank_accounts')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('bank_name', 'varchar(255)')
    .addColumn('account_type', 'varchar(50)')
    .addColumn('account_number', 'varchar(50)')
    .addColumn('account_location', 'varchar(255)')
    .addColumn('additional_information','text')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

  await db.schema
    .createIndex('idx_bank_accounts_id')
    .on('bank_accounts')
    .column('assets_id')
    .execute();

  await db.schema
    .createTable('investments')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('company_or_fund_name','varchar(255)')
    .addColumn('investment_type', 'varchar(50)')
    .addColumn('account_or_policy_number', 'varchar(100)')
    .addColumn('managed_by','varchar(255)')
    .addColumn('additional_information','text')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

  await db.schema
    .createIndex('idx_investments_id')
    .on('investments')
    .column('assets_id')
    .execute();

  await db.schema
   .createTable('valuable_items')
   .ifNotExists()
   .addColumn('id', 'uuid', (col) => col.primaryKey())
   .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('category','varchar(50)')
    .addColumn('description', 'text')
    .addColumn('location', 'varchar(255)')
    .addColumn('additional_information', 'text')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

    await db.schema
    .createIndex('idx_valuable_items_id')
    .on('valuable_items')
    .column('assets_id')
    .execute();

  await db.schema
   .createTable('digital_assets')
   .ifNotExists()
   .addColumn('id', 'uuid', (col) => col.primaryKey())
   .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('asset_type','varchar(50)')
    .addColumn('platform', 'varchar(255)')
    .addColumn('account_id', 'varchar(255)')
    .addColumn('additional_information', 'text')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

    await db.schema
    .createIndex('idx_digital_assets_id')
    .on('digital_assets')
    .column('assets_id')
    .execute();

  await db.schema
   .createTable('intellectual_assets')
   .ifNotExists()
   .addColumn('id', 'uuid', (col) => col.primaryKey())
   .addColumn('assets_id', 'uuid', (col) =>
      col.references('assets.id').onDelete('cascade').notNull()
    )

    .addColumn('asset_type','varchar(50)')
    .addColumn('title', 'varchar(255)')
    .addColumn('description', 'text')
    .addColumn('location', 'varchar(255)')
    .addColumn('status','varchar(50)')

    .addColumn('order_index', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

    await db.schema
    .createIndex('idx_intellectual_assets_id')
    .on('intellectual_assets')
    .column('assets_id')
    .execute();
};

const down = async (db) => {
    await db.schema.dropTable('property_assets').ifExists().execute();
    await db.schema.dropTable('bank_accounts').ifExists().execute();
    await db.schema.dropTable('investments').ifExists().execute();
    await db.schema.dropTable('valuable_items').ifExists().execute();
    await db.schema.dropTable('digital_assets').ifExists().execute();
    await db.schema.dropTable('intellectual_assets').ifExists().execute();

}
module.exports = { up, down };
