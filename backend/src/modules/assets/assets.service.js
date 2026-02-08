const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { ROLES } = require('../../utils/constants');

// Get Will and Verify User Role
const getWillWithAccess = async (willId, userId, userRole) => {
  const will = await db
    .selectFrom('wills')
    .selectAll()
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError('Will');
  }

  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    if (will.user_id !== userId) {
      throw new NotFoundError('Will');
    }
  }

  return will;
};

// Get Assets Record for a Will
const getAssetsRecord = async (willId) => {
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    throw new NotFoundError('Assets record not found for this will');
  }

  return assets;
};

// Verify asset item belongs to the Will assets record
const verifyItemBelongsToWill = async (willId, itemId, tableName, itemType) => {
  const assets = await getAssetsRecord(willId);

  const item = await db
    .selectFrom(tableName)
    .selectAll()
    .where('id', '=', itemId)
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  if (!item) {
    throw new NotFoundError(`${itemType} not found or does not belong to this will`);
  }

  return { item, assetsRecordId: assets.id };
};

// Property Assets CRUD
const getPropertyAssets = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const properties = await db
    .selectFrom('property_assets')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return properties;
};

const getPropertyAssetById = async (willId, propertyId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: property } = await verifyItemBelongsToWill(
    willId,
    propertyId,
    'property_assets',
    'Property'
  );

  return property;
};

const createPropertyAsset = async (willId, propertyData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('property_assets')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newProperty = await db
    .insertInto('property_assets')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      building_number: propertyData.building_number,
      building_name: propertyData.building_name,
      street: propertyData.street,
      town: propertyData.town,
      city: propertyData.city,
      county: propertyData.county,
      postcode: propertyData.postcode,
      country: propertyData.country,
      ownership_type: propertyData.ownership_type,
      estimated_value: propertyData.estimated_value,
      mortgage_outstanding: propertyData.mortgage_outstanding,
      property_type: propertyData.property_type,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newProperty;
};

const updatePropertyAsset = async (willId, propertyId, propertyData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, propertyId, 'property_assets', 'Property');

  const updatedProperty = await db
    .updateTable('property_assets')
    .set({
      building_number: propertyData.building_number,
      building_name: propertyData.building_name,
      street: propertyData.street,
      town: propertyData.town,
      city: propertyData.city,
      county: propertyData.county,
      postcode: propertyData.postcode,
      country: propertyData.country,
      ownership_type: propertyData.ownership_type,
      estimated_value: propertyData.estimated_value,
      mortgage_outstanding: propertyData.mortgage_outstanding,
      property_type: propertyData.property_type,
      updated_at: new Date(),
    })
    .where('id', '=', propertyId)
    .returningAll()
    .executeTakeFirst();

  return updatedProperty;
};

const deletePropertyAsset = async (willId, propertyId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    propertyId,
    'property_assets',
    'Property'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('property_assets')
      .where('id', '=', propertyId)
      .execute();

    const remainingProperties = await trx
      .selectFrom('property_assets')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingProperties.length; i++) {
      await trx
        .updateTable('property_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingProperties[i].id)
        .execute();
    }
  });
};

const reorderPropertyAssets = async (willId, propertyIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const properties = await db
    .selectFrom('property_assets')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const propertyIdSet = new Set(properties.map((p) => p.id));
  const requestedIdSet = new Set(propertyIds);

  if (propertyIdSet.size !== requestedIdSet.size || 
      ![...propertyIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid property IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < propertyIds.length; i++) {
      await trx
        .updateTable('property_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', propertyIds[i])
        .execute();
    }
  });

  return getPropertyAssets(willId, userId, userRole);
};

// Bank Accounts CRUD
const getBankAccounts = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const bankAccounts = await db
    .selectFrom('bank_accounts')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return bankAccounts;
};

const getBankAccountById = async (willId, accountId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: account } = await verifyItemBelongsToWill(
    willId,
    accountId,
    'bank_accounts',
    'Bank Account'
  );

  return account;
};

const createBankAccount = async (willId, accountData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('bank_accounts')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newAccount = await db
    .insertInto('bank_accounts')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      institution_name: accountData.institution_name,
      account_type: accountData.account_type,
      account_number: accountData.account_number,
      sort_code: accountData.sort_code,
      estimated_balance: accountData.estimated_balance,
      additional_information: accountData.additional_information,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newAccount;
};

const updateBankAccount = async (willId, accountId, accountData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, accountId, 'bank_accounts', 'Bank Account');

  const updatedAccount = await db
    .updateTable('bank_accounts')
    .set({
      institution_name: accountData.institution_name,
      account_type: accountData.account_type,
      account_number: accountData.account_number,
      sort_code: accountData.sort_code,
      estimated_balance: accountData.estimated_balance,
      additional_information: accountData.additional_information,
      updated_at: new Date(),
    })
    .where('id', '=', accountId)
    .returningAll()
    .executeTakeFirst();

  return updatedAccount;
};

const deleteBankAccount = async (willId, accountId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    accountId,
    'bank_accounts',
    'Bank Account'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('bank_accounts')
      .where('id', '=', accountId)
      .execute();

    const remainingAccounts = await trx
      .selectFrom('bank_accounts')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingAccounts.length; i++) {
      await trx
        .updateTable('bank_accounts')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingAccounts[i].id)
        .execute();
    }
  });
};

const reorderBankAccounts = async (willId, accountIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const accounts = await db
    .selectFrom('bank_accounts')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const accountIdSet = new Set(accounts.map((a) => a.id));
  const requestedIdSet = new Set(accountIds);

  if (accountIdSet.size !== requestedIdSet.size || 
      ![...accountIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid bank account IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < accountIds.length; i++) {
      await trx
        .updateTable('bank_accounts')
        .set({ order_index: i + 1 })
        .where('id', '=', accountIds[i])
        .execute();
    }
  });

  return getBankAccounts(willId, userId, userRole);
};

// Investments CRUD
const getInvestments = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const investments = await db
    .selectFrom('investments')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return investments;
};

const getInvestmentById = async (willId, investmentId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: investment } = await verifyItemBelongsToWill(
    willId,
    investmentId,
    'investments',
    'Investment'
  );

  return investment;
};

const createInvestment = async (willId, investmentData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('investments')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newInvestment = await db
    .insertInto('investments')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      investment_type: investmentData.investment_type,
      institution_name: investmentData.institution_name,
      account_number: investmentData.account_number,
      estimated_value: investmentData.estimated_value,
      additional_information: investmentData.additional_information,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newInvestment;
};

const updateInvestment = async (willId, investmentId, investmentData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, investmentId, 'investments', 'Investment');

  const updatedInvestment = await db
    .updateTable('investments')
    .set({
      investment_type: investmentData.investment_type,
      institution_name: investmentData.institution_name,
      account_number: investmentData.account_number,
      estimated_value: investmentData.estimated_value,
      additional_information: investmentData.additional_information,
      updated_at: new Date(),
    })
    .where('id', '=', investmentId)
    .returningAll()
    .executeTakeFirst();

  return updatedInvestment;
};

const deleteInvestment = async (willId, investmentId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    investmentId,
    'investments',
    'Investment'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('investments')
      .where('id', '=', investmentId)
      .execute();

    const remainingInvestments = await trx
      .selectFrom('investments')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingInvestments.length; i++) {
      await trx
        .updateTable('investments')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingInvestments[i].id)
        .execute();
    }
  });
};

const reorderInvestments = async (willId, investmentIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const investments = await db
    .selectFrom('investments')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const investmentIdSet = new Set(investments.map((i) => i.id));
  const requestedIdSet = new Set(investmentIds);

  if (investmentIdSet.size !== requestedIdSet.size || 
      ![...investmentIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid investment IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < investmentIds.length; i++) {
      await trx
        .updateTable('investments')
        .set({ order_index: i + 1 })
        .where('id', '=', investmentIds[i])
        .execute();
    }
  });

  return getInvestments(willId, userId, userRole);
};

// Valuable Items CRUD
const getValuableItems = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const valuableItems = await db
    .selectFrom('valuable_items')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return valuableItems;
};

const getValuableItemById = async (willId, itemId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: valuableItem } = await verifyItemBelongsToWill(
    willId,
    itemId,
    'valuable_items',
    'Valuable Item'
  );

  return valuableItem;
};

const createValuableItem = async (willId, itemData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('valuable_items')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newItem = await db
    .insertInto('valuable_items')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      item_type: itemData.item_type,
      description: itemData.description,
      estimated_value: itemData.estimated_value,
      location: itemData.location,
      additional_information: itemData.additional_information,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newItem;
};

const updateValuableItem = async (willId, itemId, itemData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, itemId, 'valuable_items', 'Valuable Item');

  const updatedItem = await db
    .updateTable('valuable_items')
    .set({
      item_type: itemData.item_type,
      description: itemData.description,
      estimated_value: itemData.estimated_value,
      location: itemData.location,
      additional_information: itemData.additional_information,
      updated_at: new Date(),
    })
    .where('id', '=', itemId)
    .returningAll()
    .executeTakeFirst();

  return updatedItem;
};

const deleteValuableItem = async (willId, itemId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    itemId,
    'valuable_items',
    'Valuable Item'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('valuable_items')
      .where('id', '=', itemId)
      .execute();

    const remainingItems = await trx
      .selectFrom('valuable_items')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingItems.length; i++) {
      await trx
        .updateTable('valuable_items')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingItems[i].id)
        .execute();
    }
  });
};

const reorderValuableItems = async (willId, itemIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const items = await db
    .selectFrom('valuable_items')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const itemIdSet = new Set(items.map((i) => i.id));
  const requestedIdSet = new Set(itemIds);

  if (itemIdSet.size !== requestedIdSet.size || 
      ![...itemIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid valuable item IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < itemIds.length; i++) {
      await trx
        .updateTable('valuable_items')
        .set({ order_index: i + 1 })
        .where('id', '=', itemIds[i])
        .execute();
    }
  });

  return getValuableItems(willId, userId, userRole);
};

// Digital Assets CRUD
const getDigitalAssets = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const digitalAssets = await db
    .selectFrom('digital_assets')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return digitalAssets;
};

const getDigitalAssetById = async (willId, assetId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: digitalAsset } = await verifyItemBelongsToWill(
    willId,
    assetId,
    'digital_assets',
    'Digital Asset'
  );

  return digitalAsset;
};

const createDigitalAsset = async (willId, assetData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('digital_assets')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newAsset = await db
    .insertInto('digital_assets')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      asset_type: assetData.asset_type,
      platform: assetData.platform,
      account_id: assetData.account_id,
      additional_information: assetData.additional_information,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newAsset;
};

const updateDigitalAsset = async (willId, assetId, assetData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, assetId, 'digital_assets', 'Digital Asset');

  const updatedAsset = await db
    .updateTable('digital_assets')
    .set({
      asset_type: assetData.asset_type,
      platform: assetData.platform,
      account_id: assetData.account_id,
      additional_information: assetData.additional_information,
      updated_at: new Date(),
    })
    .where('id', '=', assetId)
    .returningAll()
    .executeTakeFirst();

  return updatedAsset;
};

const deleteDigitalAsset = async (willId, assetId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    assetId,
    'digital_assets',
    'Digital Asset'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('digital_assets')
      .where('id', '=', assetId)
      .execute();

    const remainingAssets = await trx
      .selectFrom('digital_assets')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingAssets.length; i++) {
      await trx
        .updateTable('digital_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingAssets[i].id)
        .execute();
    }
  });
};

const reorderDigitalAssets = async (willId, assetIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const digitalAssets = await db
    .selectFrom('digital_assets')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const assetIdSet = new Set(digitalAssets.map((a) => a.id));
  const requestedIdSet = new Set(assetIds);

  if (assetIdSet.size !== requestedIdSet.size || 
      ![...assetIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid digital asset IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < assetIds.length; i++) {
      await trx
        .updateTable('digital_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', assetIds[i])
        .execute();
    }
  });

  return getDigitalAssets(willId, userId, userRole);
};

// Intellectual Assets CRUD
const getIntellectualAssets = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await db
    .selectFrom('assets')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!assets) {
    return [];
  }

  const intellectualAssets = await db
    .selectFrom('intellectual_assets')
    .selectAll()
    .where('assets_id', '=', assets.id)
    .orderBy('order_index', 'asc')
    .execute();

  return intellectualAssets;
};

const getIntellectualAssetById = async (willId, assetId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: intellectualAsset } = await verifyItemBelongsToWill(
    willId,
    assetId,
    'intellectual_assets',
    'Intellectual Asset'
  );

  return intellectualAsset;
};

const createIntellectualAsset = async (willId, assetData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const maxOrder = await db
    .selectFrom('intellectual_assets')
    .select(db.fn.max('order_index').as('max_order'))
    .where('assets_id', '=', assets.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newAsset = await db
    .insertInto('intellectual_assets')
    .values({
      id: generateUUID(),
      assets_id: assets.id,
      asset_type: assetData.asset_type,
      title: assetData.title,
      description: assetData.description,
      status: assetData.status,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newAsset;
};

const updateIntellectualAsset = async (willId, assetId, assetData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, assetId, 'intellectual_assets', 'Intellectual Asset');

  const updatedAsset = await db
    .updateTable('intellectual_assets')
    .set({
      asset_type: assetData.asset_type,
      title: assetData.title,
      description: assetData.description,
      status: assetData.status,
      updated_at: new Date(),
    })
    .where('id', '=', assetId)
    .returningAll()
    .executeTakeFirst();

  return updatedAsset;
};

const deleteIntellectualAsset = async (willId, assetId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { assetsRecordId } = await verifyItemBelongsToWill(
    willId,
    assetId,
    'intellectual_assets',
    'Intellectual Asset'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('intellectual_assets')
      .where('id', '=', assetId)
      .execute();

    const remainingAssets = await trx
      .selectFrom('intellectual_assets')
      .select(['id'])
      .where('assets_id', '=', assetsRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingAssets.length; i++) {
      await trx
        .updateTable('intellectual_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingAssets[i].id)
        .execute();
    }
  });
};

const reorderIntellectualAssets = async (willId, assetIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const assets = await getAssetsRecord(willId);

  const intellectualAssets = await db
    .selectFrom('intellectual_assets')
    .select(['id'])
    .where('assets_id', '=', assets.id)
    .execute();

  const assetIdSet = new Set(intellectualAssets.map((a) => a.id));
  const requestedIdSet = new Set(assetIds);

  if (assetIdSet.size !== requestedIdSet.size || 
      ![...assetIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid intellectual asset IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < assetIds.length; i++) {
      await trx
        .updateTable('intellectual_assets')
        .set({ order_index: i + 1 })
        .where('id', '=', assetIds[i])
        .execute();
    }
  });

  return getIntellectualAssets(willId, userId, userRole);
};

module.exports = {
  // Property Assets
  getPropertyAssets,
  getPropertyAssetById,
  createPropertyAsset,
  updatePropertyAsset,
  deletePropertyAsset,
  reorderPropertyAssets,
  // Bank Accounts
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  reorderBankAccounts,
  // Investments
  getInvestments,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  reorderInvestments,
  // Valuable Items
  getValuableItems,
  getValuableItemById,
  createValuableItem,
  updateValuableItem,
  deleteValuableItem,
  reorderValuableItems,
  // Digital Assets
  getDigitalAssets,
  getDigitalAssetById,
  createDigitalAsset,
  updateDigitalAsset,
  deleteDigitalAsset,
  reorderDigitalAssets,
  // Intellectual Assets
  getIntellectualAssets,
  getIntellectualAssetById,
  createIntellectualAsset,
  updateIntellectualAsset,
  deleteIntellectualAsset,
  reorderIntellectualAssets,
};