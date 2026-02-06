const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError } = require('../../utils/errors');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

// Children CRUD
const getChildren = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('children')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

const getChildById = async (willId, childId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const child = await db
    .selectFrom('children')
    .selectAll()
    .where('id', '=', childId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!child) {
    throw new NotFoundError('Child');
  }

  return child;
};

const createChild = async (willId, childData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('children')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;
  const childId = generateUUID();

  const child = await db
    .insertInto('children')
    .values({
      id: childId,
      will_id: willId,
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
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Child created', { childId, willId });

  return child;
};

const updateChild = async (willId, childId, updateData, userId, userRole) => {
  await getChildById(willId, childId, userId, userRole);

  const child = await db
    .updateTable('children')
    .set({
      title: updateData.title,
      full_name: updateData.full_name,
      gender: updateData.gender,
      date_of_birth: updateData.date_of_birth,
      relationship_to_testator: updateData.relationship_to_testator,
      building_number: updateData.building_number,
      building_name: updateData.building_name,
      street: updateData.street,
      town: updateData.town,
      city: updateData.city,
      county: updateData.county,
      postcode: updateData.postcode,
      country: updateData.country,
      inheritance_age: updateData.inheritance_age,
      updated_at: new Date(),
    })
    .where('id', '=', childId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Child updated', { childId, willId });

  return child;
};

const deleteChild = async (willId, childId, userId, userRole) => {
  await getChildById(willId, childId, userId, userRole);

  await db
    .deleteFrom('children')
    .where('id', '=', childId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Child deleted', { childId, willId });
};

const reorderChildren = async (willId, childIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < childIds.length; i++) {
    await db
      .updateTable('children')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', childIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Children reordered', { willId, childIds });

  return getChildren(willId, userId, userRole);
};

// Guardians CRUD
const getGuardians = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('guardians')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

const getGuardianById = async (willId, guardianId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const guardian = await db
    .selectFrom('guardians')
    .selectAll()
    .where('id', '=', guardianId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!guardian) {
    throw new NotFoundError('Guardian');
  }

  return guardian;
};

const createGuardian = async (willId, guardianData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('guardians')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;
  const guardianId = generateUUID();

  const guardian = await db
    .insertInto('guardians')
    .values({
      id: guardianId,
      will_id: willId,
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
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Guardian created', { guardianId, willId });

  return guardian;
};

const updateGuardian = async (willId, guardianId, updateData, userId, userRole) => {
  await getGuardianById(willId, guardianId, userId, userRole);

  const guardian = await db
    .updateTable('guardians')
    .set({
      title: updateData.title,
      full_name: updateData.full_name,
      date_of_birth: updateData.date_of_birth,
      relationship_to_testator: updateData.relationship_to_testator,
      building_number: updateData.building_number,
      building_name: updateData.building_name,
      street: updateData.street,
      town: updateData.town,
      city: updateData.city,
      county: updateData.county,
      postcode: updateData.postcode,
      country: updateData.country,
      phone_country_code: updateData.phone_country_code,
      phone: updateData.phone,
      email: updateData.email,
      is_alternate: updateData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', guardianId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Guardian updated', { guardianId, willId });

  return guardian;
};

const deleteGuardian = async (willId, guardianId, userId, userRole) => {
  await getGuardianById(willId, guardianId, userId, userRole);

  await db
    .deleteFrom('guardians')
    .where('id', '=', guardianId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Guardian deleted', { guardianId, willId });
};

const reorderGuardians = async (willId, guardianIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < guardianIds.length; i++) {
    await db
      .updateTable('guardians')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', guardianIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Guardians reordered', { willId, guardianIds });

  return getGuardians(willId, userId, userRole);
};

// Trustees CRUD
const getTrustees = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('trustees')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

const getTrusteeById = async (willId, trusteeId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const trustee = await db
    .selectFrom('trustees')
    .selectAll()
    .where('id', '=', trusteeId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!trustee) {
    throw new NotFoundError('Trustee');
  }

  return trustee;
};

const createTrustee = async (willId, trusteeData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('trustees')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;
  const trusteeId = generateUUID();

  const trustee = await db
    .insertInto('trustees')
    .values({
      id: trusteeId,
      will_id: willId,
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
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Trustee created', { trusteeId, willId });

  return trustee;
};

const updateTrustee = async (willId, trusteeId, updateData, userId, userRole) => {
  await getTrusteeById(willId, trusteeId, userId, userRole);

  const trustee = await db
    .updateTable('trustees')
    .set({
      role_type: updateData.role_type,
      title: updateData.title,
      full_name: updateData.full_name,
      date_of_birth: updateData.date_of_birth,
      relationship_to_testator: updateData.relationship_to_testator,
      building_number: updateData.building_number,
      building_name: updateData.building_name,
      street: updateData.street,
      town: updateData.town,
      city: updateData.city,
      county: updateData.county,
      postcode: updateData.postcode,
      country: updateData.country,
      phone_country_code: updateData.phone_country_code,
      phone: updateData.phone,
      email: updateData.email,
      include_all_general_powers: updateData.include_all_general_powers,
      power_of_management: updateData.power_of_management,
      power_of_investment: updateData.power_of_investment,
      power_to_delegate: updateData.power_to_delegate,
      power_in_relation_to_property: updateData.power_in_relation_to_property,
      power_to_lend_and_borrow: updateData.power_to_lend_and_borrow,
      power_to_apply_income_for_minors: updateData.power_to_apply_income_for_minors,
      power_to_make_advancements: updateData.power_to_make_advancements,
      power_to_appropriate_assets: updateData.power_to_appropriate_assets,
      power_to_act_by_majority: updateData.power_to_act_by_majority,
      power_to_charge: updateData.power_to_charge,
      power_to_invest_in_non_interest_accounts: updateData.power_to_invest_in_non_interest_accounts,
      additional_powers: updateData.additional_powers,
      updated_at: new Date(),
    })
    .where('id', '=', trusteeId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Trustee updated', { trusteeId, willId });

  return trustee;
};

const deleteTrustee = async (willId, trusteeId, userId, userRole) => {
  await getTrusteeById(willId, trusteeId, userId, userRole);

  await db
    .deleteFrom('trustees')
    .where('id', '=', trusteeId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Trustee deleted', { trusteeId, willId });
};

const reorderTrustees = async (willId, trusteeIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < trusteeIds.length; i++) {
    await db
      .updateTable('trustees')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', trusteeIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Trustees reordered', { willId, trusteeIds });

  return getTrustees(willId, userId, userRole);
};

// Beneficiaries CRUD
const getBeneficiaries = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('beneficiaries')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

const getBeneficiaryById = async (willId, beneficiaryId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const beneficiary = await db
    .selectFrom('beneficiaries')
    .selectAll()
    .where('id', '=', beneficiaryId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!beneficiary) {
    throw new NotFoundError('Beneficiary');
  }

  return beneficiary;
};

const createBeneficiary = async (willId, beneficiaryData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('beneficiaries')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;
  const beneficiaryId = generateUUID();

  const beneficiary = await db
    .insertInto('beneficiaries')
    .values({
      id: beneficiaryId,
      will_id: willId,
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
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Beneficiary created', { beneficiaryId, willId });

  return beneficiary;
};

const updateBeneficiary = async (willId, beneficiaryId, updateData, userId, userRole) => {
  await getBeneficiaryById(willId, beneficiaryId, userId, userRole);

  const beneficiary = await db
    .updateTable('beneficiaries')
    .set({
      title: updateData.title,
      full_name: updateData.full_name,
      relationship_to_testator: updateData.relationship_to_testator,
      city: updateData.city,
      county: updateData.county,
      postcode: updateData.postcode,
      country: updateData.country,
      phone_country_code: updateData.phone_country_code,
      phone: updateData.phone,
      email: updateData.email,
      is_alternate: updateData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', beneficiaryId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Beneficiary updated', { beneficiaryId, willId });

  return beneficiary;
};

const deleteBeneficiary = async (willId, beneficiaryId, userId, userRole) => {
  await getBeneficiaryById(willId, beneficiaryId, userId, userRole);

  await db
    .deleteFrom('beneficiaries')
    .where('id', '=', beneficiaryId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Beneficiary deleted', { beneficiaryId, willId });
};

const reorderBeneficiaries = async (willId, beneficiaryIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < beneficiaryIds.length; i++) {
    await db
      .updateTable('beneficiaries')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', beneficiaryIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Beneficiaries reordered', { willId, beneficiaryIds });

  return getBeneficiaries(willId, userId, userRole);
};

// Charities CRUD 
const getCharities = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('charities')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

const getCharityById = async (willId, charityId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const charity = await db
    .selectFrom('charities')
    .selectAll()
    .where('id', '=', charityId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!charity) {
    throw new NotFoundError('Charity');
  }

  return charity;
};

const createCharity = async (willId, charityData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('charities')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;
  const charityId = generateUUID();

  const charity = await db
    .insertInto('charities')
    .values({
      id: charityId,
      will_id: willId,
      name: charityData.name,
      registration_number: charityData.registration_number,
      address: charityData.address,
      gift_amount: charityData.gift_amount,
      gift_percentage: charityData.gift_percentage,
      gift_description: charityData.gift_description,
      is_alternate: charityData.is_alternate ?? false,
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Charity created', { charityId, willId });

  return charity;
};

const updateCharity = async (willId, charityId, updateData, userId, userRole) => {
  await getCharityById(willId, charityId, userId, userRole);

  const charity = await db
    .updateTable('charities')
    .set({
      name: updateData.name,
      registration_number: updateData.registration_number,
      address: updateData.address,
      gift_amount: updateData.gift_amount,
      gift_percentage: updateData.gift_percentage,
      gift_description: updateData.gift_description,
      is_alternate: updateData.is_alternate ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', charityId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Charity updated', { charityId, willId });

  return charity;
};

const deleteCharity = async (willId, charityId, userId, userRole) => {
  await getCharityById(willId, charityId, userId, userRole);

  await db
    .deleteFrom('charities')
    .where('id', '=', charityId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Charity deleted', { charityId, willId });
};

const reorderCharities = async (willId, charityIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < charityIds.length; i++) {
    await db
      .updateTable('charities')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', charityIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Charities reordered', { willId, charityIds });

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
