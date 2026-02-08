// Migration to add beneficiary_id to children, guardians, trustees, beneficiaries, and charities tables

const up = async (db) => {
  await db.schema.alterTable('children')
    .addColumn('beneficiary_id', 'uuid', (col) =>
      col.references('beneficiary.id').onDelete('cascade').notNull()
    )
    .dropColumn('will_id')
    .execute();

  await db.schema
    .createIndex('idx_children_beneficiary_id')
    .on('children')
    .column('beneficiary_id')
    .execute();


  // 2. GUARDIANS
  await db.schema.alterTable('guardians')
    .addColumn('beneficiary_id', 'uuid', (col) =>
      col.references('beneficiary.id').onDelete('cascade').notNull()
    )
    .dropColumn('will_id')
    .execute();

  await db.schema
    .createIndex('idx_guardians_beneficiary_id')
    .on('guardians')
    .column('beneficiary_id')
    .execute();


  // 3. TRUSTEES
  await db.schema.alterTable('trustees')
    .addColumn('beneficiary_id', 'uuid', (col) =>
      col.references('beneficiary.id').onDelete('cascade').notNull()
    )
    .dropColumn('will_id')
    .execute();

  await db.schema
    .createIndex('idx_trustees_beneficiary_id')
    .on('trustees')
    .column('beneficiary_id')
    .execute();


  // 4. BENEFICIARIES
  await db.schema.alterTable('beneficiaries')
    .addColumn('beneficiary_id', 'uuid', (col) =>
      col.references('beneficiary.id').onDelete('cascade').notNull()
    )
    .dropColumn('will_id')
    .execute();

  await db.schema
    .createIndex('idx_beneficiaries_beneficiary_id')
    .on('beneficiaries')
    .column('beneficiary_id')
    .execute();


  // 5. CHARITIES
  await db.schema.alterTable('charities')
    .addColumn('beneficiary_id', 'uuid', (col) =>
      col.references('beneficiary.id').onDelete('cascade').notNull()
    )
    .dropColumn('will_id')
    .execute();

  await db.schema
    .createIndex('idx_charities_beneficiary_id')
    .on('charities')
    .column('beneficiary_id')
    .execute();
};

const down = async (db) => {

  await db.schema.alterTable('children')
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id')
        .onDelete('cascade')
        .notNull()
    )
    .dropColumn('beneficiary_id')
    .execute();

  await db.schema
    .createIndex('idx_children_will_id')
    .on('children')
    .column('will_id')
    .execute();

  await db.schema.alterTable('guardians')
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id')
        .onDelete('cascade')
        .notNull()
    )
    .dropColumn('beneficiary_id')
    .execute();

  await db.schema
    .createIndex('idx_guardians_will_id')
    .on('guardians')
    .column('will_id')
    .execute();

  await db.schema.alterTable('trustees')
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id')
        .onDelete('cascade')
        .notNull()
    )
    .dropColumn('beneficiary_id')
    .execute();

  await db.schema
    .createIndex('idx_trustees_will_id')
    .on('trustees')
    .column('will_id')
    .execute();

  await db.schema.alterTable('beneficiaries')
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id')
        .onDelete('cascade')
        .notNull()
    )
    .dropColumn('beneficiary_id')
    .execute();

  await db.schema
    .createIndex('idx_beneficiaries_will_id')
    .on('beneficiaries')
    .column('will_id')
    .execute();

  await db.schema.alterTable('charities')
    .addColumn('will_id', 'uuid', (col) =>
      col.references('wills.id')
        .onDelete('cascade')
        .notNull()
    )
    .dropColumn('beneficiary_id')
    .execute();

  await db.schema
    .createIndex('idx_charities_will_id')
    .on('charities')
    .column('will_id')
    .execute();
};

module.exports = { up, down };


