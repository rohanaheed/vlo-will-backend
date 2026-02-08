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

// Get Beneficiary Record for a Will
const getBeneficiaryRecord = async (willId) => {
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    throw new NotFoundError('Beneficiary record not found for this will');
  }

  return beneficiary;
};

// Verify children/guardian/trustee/beneficiary/charity belongs to the Will beneficiary record
const verifyItemBelongsToWill = async (willId, beneficiaryId, itemId, tableName, itemType) => {
  const beneficiary = await getBeneficiaryRecord(willId);

  const item = await db
    .selectFrom(tableName)
    .selectAll()
    .where('id', '=', itemId)
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  if (!item) {
    throw new NotFoundError(`${itemType} not found or does not belong to this will`);
  }

  return { item, beneficiaryRecordId: beneficiary.id };
};

// Children CRUD
const getChildren = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    return [];
  }

  const children = await db
    .selectFrom('children')
    .selectAll()
    .where('beneficiary_id', '=', beneficiary.id)
    .orderBy('order_index', 'asc')
    .execute();

  return children;
};

const getChildById = async (willId, childId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: child } = await verifyItemBelongsToWill(
    willId,
    null,
    childId,
    'children',
    'Child'
  );

  return child;
};

const createChild = async (willId, childData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const maxOrder = await db
    .selectFrom('children')
    .select(db.fn.max('order_index').as('max_order'))
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newChild = await db
    .insertInto('children')
    .values({
      id: generateUUID(),
      beneficiary_id: beneficiary.id,
      title: childData.title,
      full_name: childData.full_name,
      gender: childData.gender,
      date_of_birth: childData.date_of_birth,
      relationship_to_testator: childData.relationship_to_testator,
      building_number: childData.building_number,
      building_name: childData.building_name,
      street: childData.street,
      town: childData.town,
      city: childData.city,
      county: childData.county,
      postcode: childData.postcode,
      country: childData.country,
      inheritance_age: childData.inheritance_age,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newChild;
};

const updateChild = async (willId, childId, childData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, null, childId, 'children', 'Child');

  const updatedChild = await db
    .updateTable('children')
    .set({
      title: childData.title,
      full_name: childData.full_name,
      gender: childData.gender,
      date_of_birth: childData.date_of_birth,
      relationship_to_testator: childData.relationship_to_testator,
      building_number: childData.building_number,
      building_name: childData.building_name,
      street: childData.street,
      town: childData.town,
      city: childData.city,
      county: childData.county,
      postcode: childData.postcode,
      country: childData.country,
      inheritance_age: childData.inheritance_age,
      updated_at: new Date(),
    })
    .where('id', '=', childId)
    .returningAll()
    .executeTakeFirst();

  return updatedChild;
};

const deleteChild = async (willId, childId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { beneficiaryRecordId } = await verifyItemBelongsToWill(
    willId,
    null,
    childId,
    'children',
    'Child'
  );

  await db.transaction().execute(async (trx) => {
    // Delete the child
    await trx
      .deleteFrom('children')
      .where('id', '=', childId)
      .execute();

    const remainingChildren = await trx
      .selectFrom('children')
      .select(['id'])
      .where('beneficiary_id', '=', beneficiaryRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingChildren.length; i++) {
      await trx
        .updateTable('children')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingChildren[i].id)
        .execute();
    }
  });
};

const reorderChildren = async (willId, childIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const children = await db
    .selectFrom('children')
    .select(['id'])
    .where('beneficiary_id', '=', beneficiary.id)
    .execute();

  const childIdSet = new Set(children.map((c) => c.id));
  const requestedIdSet = new Set(childIds);

  if (childIdSet.size !== requestedIdSet.size || 
      ![...childIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid child IDs provided for reordering');
  }

  // Update order_index
  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < childIds.length; i++) {
      await trx
        .updateTable('children')
        .set({ order_index: i + 1 })
        .where('id', '=', childIds[i])
        .execute();
    }
  });

  return getChildren(willId, userId, userRole);
};

// Guardians CRUD
const getGuardians = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    return [];
  }

  const guardians = await db
    .selectFrom('guardians')
    .selectAll()
    .where('beneficiary_id', '=', beneficiary.id)
    .orderBy('order_index', 'asc')
    .execute();

  return guardians;
};

const getGuardianById = async (willId, guardianId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: guardian } = await verifyItemBelongsToWill(
    willId,
    null,
    guardianId,
    'guardians',
    'Guardian'
  );

  return guardian;
};

const createGuardian = async (willId, guardianData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const maxOrder = await db
    .selectFrom('guardians')
    .select(db.fn.max('order_index').as('max_order'))
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newGuardian = await db
    .insertInto('guardians')
    .values({
      id: generateUUID(),
      beneficiary_id: beneficiary.id,
      title: guardianData.title,
      full_name: guardianData.full_name,
      date_of_birth: guardianData.date_of_birth,
      relationship_to_testator: guardianData.relationship_to_testator,
      building_number: guardianData.building_number,
      building_name: guardianData.building_name,
      street: guardianData.street,
      town: guardianData.town,
      city: guardianData.city,
      county: guardianData.county,
      postcode: guardianData.postcode,
      country: guardianData.country,
      phone_country_code: guardianData.phone_country_code,
      phone: guardianData.phone,
      email: guardianData.email,
      is_alternate: guardianData.is_alternate ?? false,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newGuardian;
};

const updateGuardian = async (willId, guardianId, guardianData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, null, guardianId, 'guardians', 'Guardian');

  const updatedGuardian = await db
    .updateTable('guardians')
    .set({
      title: guardianData.title,
      full_name: guardianData.full_name,
      date_of_birth: guardianData.date_of_birth,
      relationship_to_testator: guardianData.relationship_to_testator,
      building_number: guardianData.building_number,
      building_name: guardianData.building_name,
      street: guardianData.street,
      town: guardianData.town,
      city: guardianData.city,
      county: guardianData.county,
      postcode: guardianData.postcode,
      country: guardianData.country,
      phone_country_code: guardianData.phone_country_code,
      phone: guardianData.phone,
      email: guardianData.email,
      is_alternate: guardianData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', guardianId)
    .returningAll()
    .executeTakeFirst();

  return updatedGuardian;
};

const deleteGuardian = async (willId, guardianId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { beneficiaryRecordId } = await verifyItemBelongsToWill(
    willId,
    null,
    guardianId,
    'guardians',
    'Guardian'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('guardians')
      .where('id', '=', guardianId)
      .execute();

    const remainingGuardians = await trx
      .selectFrom('guardians')
      .select(['id'])
      .where('beneficiary_id', '=', beneficiaryRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingGuardians.length; i++) {
      await trx
        .updateTable('guardians')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingGuardians[i].id)
        .execute();
    }
  });
};

const reorderGuardians = async (willId, guardianIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const guardians = await db
    .selectFrom('guardians')
    .select(['id'])
    .where('beneficiary_id', '=', beneficiary.id)
    .execute();

  const guardianIdSet = new Set(guardians.map((g) => g.id));
  const requestedIdSet = new Set(guardianIds);

  if (guardianIdSet.size !== requestedIdSet.size || 
      ![...guardianIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid guardian IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < guardianIds.length; i++) {
      await trx
        .updateTable('guardians')
        .set({ order_index: i + 1 })
        .where('id', '=', guardianIds[i])
        .execute();
    }
  });

  return getGuardians(willId, userId, userRole);
};

// Trustees CRUD
const getTrustees = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    return [];
  }

  const trustees = await db
    .selectFrom('trustees')
    .selectAll()
    .where('beneficiary_id', '=', beneficiary.id)
    .orderBy('order_index', 'asc')
    .execute();

  return trustees;
};

const getTrusteeById = async (willId, trusteeId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: trustee } = await verifyItemBelongsToWill(
    willId,
    null,
    trusteeId,
    'trustees',
    'Trustee'
  );

  return trustee;
};

const createTrustee = async (willId, trusteeData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const maxOrder = await db
    .selectFrom('trustees')
    .select(db.fn.max('order_index').as('max_order'))
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newTrustee = await db
    .insertInto('trustees')
    .values({
      id: generateUUID(),
      beneficiary_id: beneficiary.id,
      role_type: trusteeData.role_type,
      title: trusteeData.title,
      full_name: trusteeData.full_name,
      date_of_birth: trusteeData.date_of_birth,
      relationship_to_testator: trusteeData.relationship_to_testator,
      building_number: trusteeData.building_number,
      building_name: trusteeData.building_name,
      street: trusteeData.street,
      town: trusteeData.town,
      city: trusteeData.city,
      county: trusteeData.county,
      postcode: trusteeData.postcode,
      country: trusteeData.country,
      phone_country_code: trusteeData.phone_country_code,
      phone: trusteeData.phone,
      email: trusteeData.email,
      include_all_general_powers: trusteeData.include_all_general_powers,
      power_of_management: trusteeData.power_of_management,
      power_of_investment: trusteeData.power_of_investment,
      power_to_delegate: trusteeData.power_to_delegate,
      power_in_relation_to_property: trusteeData.power_in_relation_to_property,
      power_to_lend_and_borrow: trusteeData.power_to_lend_and_borrow,
      power_to_apply_income_for_minors: trusteeData.power_to_apply_income_for_minors,
      power_to_make_advancements: trusteeData.power_to_make_advancements,
      power_to_appropriate_assets: trusteeData.power_to_appropriate_assets,
      power_to_act_by_majority: trusteeData.power_to_act_by_majority,
      power_to_charge: trusteeData.power_to_charge,
      power_to_invest_in_non_interest_accounts: trusteeData.power_to_invest_in_non_interest_accounts,
      additional_powers: trusteeData.additional_powers,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newTrustee;
};

const updateTrustee = async (willId, trusteeId, trusteeData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, null, trusteeId, 'trustees', 'Trustee');

  const updatedTrustee = await db
    .updateTable('trustees')
    .set({
      role_type: trusteeData.role_type,
      title: trusteeData.title,
      full_name: trusteeData.full_name,
      date_of_birth: trusteeData.date_of_birth,
      relationship_to_testator: trusteeData.relationship_to_testator,
      building_number: trusteeData.building_number,
      building_name: trusteeData.building_name,
      street: trusteeData.street,
      town: trusteeData.town,
      city: trusteeData.city,
      county: trusteeData.county,
      postcode: trusteeData.postcode,
      country: trusteeData.country,
      phone_country_code: trusteeData.phone_country_code,
      phone: trusteeData.phone,
      email: trusteeData.email,
      include_all_general_powers: trusteeData.include_all_general_powers,
      power_of_management: trusteeData.power_of_management,
      power_of_investment: trusteeData.power_of_investment,
      power_to_delegate: trusteeData.power_to_delegate,
      power_in_relation_to_property: trusteeData.power_in_relation_to_property,
      power_to_lend_and_borrow: trusteeData.power_to_lend_and_borrow,
      power_to_apply_income_for_minors: trusteeData.power_to_apply_income_for_minors,
      power_to_make_advancements: trusteeData.power_to_make_advancements,
      power_to_appropriate_assets: trusteeData.power_to_appropriate_assets,
      power_to_act_by_majority: trusteeData.power_to_act_by_majority,
      power_to_charge: trusteeData.power_to_charge,
      power_to_invest_in_non_interest_accounts: trusteeData.power_to_invest_in_non_interest_accounts,
      additional_powers: trusteeData.additional_powers,
      updated_at: new Date(),
    })
    .where('id', '=', trusteeId)
    .returningAll()
    .executeTakeFirst();

  return updatedTrustee;
};

const deleteTrustee = async (willId, trusteeId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { beneficiaryRecordId } = await verifyItemBelongsToWill(
    willId,
    null,
    trusteeId,
    'trustees',
    'Trustee'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('trustees')
      .where('id', '=', trusteeId)
      .execute();

    const remainingTrustees = await trx
      .selectFrom('trustees')
      .select(['id'])
      .where('beneficiary_id', '=', beneficiaryRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingTrustees.length; i++) {
      await trx
        .updateTable('trustees')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingTrustees[i].id)
        .execute();
    }
  });
};

const reorderTrustees = async (willId, trusteeIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const trustees = await db
    .selectFrom('trustees')
    .select(['id'])
    .where('beneficiary_id', '=', beneficiary.id)
    .execute();

  const trusteeIdSet = new Set(trustees.map((t) => t.id));
  const requestedIdSet = new Set(trusteeIds);

  if (trusteeIdSet.size !== requestedIdSet.size || 
      ![...trusteeIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid trustee IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < trusteeIds.length; i++) {
      await trx
        .updateTable('trustees')
        .set({ order_index: i + 1 })
        .where('id', '=', trusteeIds[i])
        .execute();
    }
  });

  return getTrustees(willId, userId, userRole);
};

// Beneficiaries CRUD
const getBeneficiaries = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    return [];
  }

  const beneficiaries = await db
    .selectFrom('beneficiaries')
    .selectAll()
    .where('beneficiary_id', '=', beneficiary.id)
    .orderBy('order_index', 'asc')
    .execute();

  return beneficiaries;
};

const getBeneficiaryById = async (willId, beneficiaryId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: beneficiary } = await verifyItemBelongsToWill(
    willId,
    null,
    beneficiaryId,
    'beneficiaries',
    'Beneficiary'
  );

  return beneficiary;
};

const createBeneficiary = async (willId, beneficiaryData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const maxOrder = await db
    .selectFrom('beneficiaries')
    .select(db.fn.max('order_index').as('max_order'))
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newBeneficiary = await db
    .insertInto('beneficiaries')
    .values({
      id: generateUUID(),
      beneficiary_id: beneficiary.id,
      title: beneficiaryData.title,
      full_name: beneficiaryData.full_name,
      relationship_to_testator: beneficiaryData.relationship_to_testator,
      city: beneficiaryData.city,
      county: beneficiaryData.county,
      postcode: beneficiaryData.postcode,
      country: beneficiaryData.country,
      phone_country_code: beneficiaryData.phone_country_code,
      phone: beneficiaryData.phone,
      email: beneficiaryData.email,
      is_alternate: beneficiaryData.is_alternate ?? false,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newBeneficiary;
};

const updateBeneficiary = async (willId, beneficiaryId, beneficiaryData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, null, beneficiaryId, 'beneficiaries', 'Beneficiary');

  const updatedBeneficiary = await db
    .updateTable('beneficiaries')
    .set({
      title: beneficiaryData.title,
      full_name: beneficiaryData.full_name,
      relationship_to_testator: beneficiaryData.relationship_to_testator,
      city: beneficiaryData.city,
      county: beneficiaryData.county,
      postcode: beneficiaryData.postcode,
      country: beneficiaryData.country,
      phone_country_code: beneficiaryData.phone_country_code,
      phone: beneficiaryData.phone,
      email: beneficiaryData.email,
      is_alternate: beneficiaryData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', beneficiaryId)
    .returningAll()
    .executeTakeFirst();

  return updatedBeneficiary;
};

const deleteBeneficiary = async (willId, beneficiaryId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { beneficiaryRecordId } = await verifyItemBelongsToWill(
    willId,
    null,
    beneficiaryId,
    'beneficiaries',
    'Beneficiary'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('beneficiaries')
      .where('id', '=', beneficiaryId)
      .execute();

    const remainingBeneficiaries = await trx
      .selectFrom('beneficiaries')
      .select(['id'])
      .where('beneficiary_id', '=', beneficiaryRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingBeneficiaries.length; i++) {
      await trx
        .updateTable('beneficiaries')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingBeneficiaries[i].id)
        .execute();
    }
  });
};

const reorderBeneficiaries = async (willId, beneficiaryIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const beneficiaries = await db
    .selectFrom('beneficiaries')
    .select(['id'])
    .where('beneficiary_id', '=', beneficiary.id)
    .execute();

  const beneficiaryIdSet = new Set(beneficiaries.map((b) => b.id));
  const requestedIdSet = new Set(beneficiaryIds);

  if (beneficiaryIdSet.size !== requestedIdSet.size || 
      ![...beneficiaryIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid beneficiary IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < beneficiaryIds.length; i++) {
      await trx
        .updateTable('beneficiaries')
        .set({ order_index: i + 1 })
        .where('id', '=', beneficiaryIds[i])
        .execute();
    }
  });

  return getBeneficiaries(willId, userId, userRole);
};

// Charities CRUD
const getCharities = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await db
    .selectFrom('beneficiary')
    .select(['id'])
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    return [];
  }

  const charities = await db
    .selectFrom('charities')
    .selectAll()
    .where('beneficiary_id', '=', beneficiary.id)
    .orderBy('order_index', 'asc')
    .execute();

  return charities;
};

const getCharityById = async (willId, charityId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { item: charity } = await verifyItemBelongsToWill(
    willId,
    null,
    charityId,
    'charities',
    'Charity'
  );

  return charity;
};

const createCharity = async (willId, charityData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const maxOrder = await db
    .selectFrom('charities')
    .select(db.fn.max('order_index').as('max_order'))
    .where('beneficiary_id', '=', beneficiary.id)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newCharity = await db
    .insertInto('charities')
    .values({
      id: generateUUID(),
      beneficiary_id: beneficiary.id,
      name: charityData.name,
      registration_number: charityData.registration_number,
      address: charityData.address,
      gift_amount: charityData.gift_amount,
      gift_percentage: charityData.gift_percentage,
      gift_description: charityData.gift_description,
      is_alternate: charityData.is_alternate ?? false,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newCharity;
};

const updateCharity = async (willId, charityId, charityData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  await verifyItemBelongsToWill(willId, null, charityId, 'charities', 'Charity');

  const updatedCharity = await db
    .updateTable('charities')
    .set({
      name: charityData.name,
      registration_number: charityData.registration_number,
      address: charityData.address,
      gift_amount: charityData.gift_amount,
      gift_percentage: charityData.gift_percentage,
      gift_description: charityData.gift_description,
      is_alternate: charityData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', charityId)
    .returningAll()
    .executeTakeFirst();

  return updatedCharity;
};

const deleteCharity = async (willId, charityId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const { beneficiaryRecordId } = await verifyItemBelongsToWill(
    willId,
    null,
    charityId,
    'charities',
    'Charity'
  );

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('charities')
      .where('id', '=', charityId)
      .execute();

    const remainingCharities = await trx
      .selectFrom('charities')
      .select(['id'])
      .where('beneficiary_id', '=', beneficiaryRecordId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingCharities.length; i++) {
      await trx
        .updateTable('charities')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingCharities[i].id)
        .execute();
    }
  });
};

const reorderCharities = async (willId, charityIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);
  
  const beneficiary = await getBeneficiaryRecord(willId);

  const charities = await db
    .selectFrom('charities')
    .select(['id'])
    .where('beneficiary_id', '=', beneficiary.id)
    .execute();

  const charityIdSet = new Set(charities.map((c) => c.id));
  const requestedIdSet = new Set(charityIds);

  if (charityIdSet.size !== requestedIdSet.size || 
      ![...charityIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid charity IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < charityIds.length; i++) {
      await trx
        .updateTable('charities')
        .set({ order_index: i + 1 })
        .where('id', '=', charityIds[i])
        .execute();
    }
  });

  return getCharities(willId, userId, userRole);
};

module.exports = {
  // Children
  getChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
  reorderChildren,
  // Guardians
  getGuardians,
  getGuardianById,
  createGuardian,
  updateGuardian,
  deleteGuardian,
  reorderGuardians,
  // Trustees
  getTrustees,
  getTrusteeById,
  createTrustee,
  updateTrustee,
  deleteTrustee,
  reorderTrustees,
  // Beneficiaries
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  reorderBeneficiaries,
  // Charities
  getCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity,
  reorderCharities,
};