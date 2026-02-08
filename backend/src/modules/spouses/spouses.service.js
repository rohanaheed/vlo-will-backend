const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
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

// Get all spouses for a will
const getSpouses = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const spouses = await db
    .selectFrom('spouses')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();

  return spouses;
};

// Get spouse by ID
const getSpouseById = async (willId, spouseId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const spouse = await db
    .selectFrom('spouses')
    .selectAll()
    .where('id', '=', spouseId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!spouse) {
    throw new NotFoundError('Spouse not found or does not belong to this will');
  }

  return spouse;
};

// Create new spouse
const createSpouse = async (willId, spouseData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('spouses')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newSpouse = await db
    .insertInto('spouses')
    .values({
      id: generateUUID(),
      will_id: willId,
      is_spouse: true,
      title: spouseData.title,
      full_name: spouseData.full_name,
      building_number: spouseData.building_number,
      building_name: spouseData.building_name,
      street: spouseData.street,
      town: spouseData.town,
      city: spouseData.city,
      county: spouseData.county,
      postcode: spouseData.postcode,
      country: spouseData.country,
      phone_country_code: spouseData.phone_country_code,
      phone: spouseData.phone,
      date_of_birth: spouseData.date_of_birth,
      relationship_to_testator: spouseData.relationship_to_testator,
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newSpouse;
};

// Update spouse
const updateSpouse = async (willId, spouseId, spouseData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  await getSpouseById(willId, spouseId, userId, userRole);

  const updatedSpouse = await db
    .updateTable('spouses')
    .set({
      title: spouseData.title,
      full_name: spouseData.full_name,
      building_number: spouseData.building_number,
      building_name: spouseData.building_name,
      street: spouseData.street,
      town: spouseData.town,
      city: spouseData.city,
      county: spouseData.county,
      postcode: spouseData.postcode,
      country: spouseData.country,
      phone_country_code: spouseData.phone_country_code,
      phone: spouseData.phone,
      date_of_birth: spouseData.date_of_birth,
      relationship_to_testator: spouseData.relationship_to_testator,
      updated_at: new Date(),
    })
    .where('id', '=', spouseId)
    .returningAll()
    .executeTakeFirst();

  return updatedSpouse;
};

// Delete spouse
const deleteSpouse = async (willId, spouseId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  await getSpouseById(willId, spouseId, userId, userRole);

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('spouses')
      .where('id', '=', spouseId)
      .execute();

    const remainingSpouses = await trx
      .selectFrom('spouses')
      .select(['id'])
      .where('will_id', '=', willId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingSpouses.length; i++) {
      await trx
        .updateTable('spouses')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingSpouses[i].id)
        .execute();
    }
  });
};

// Reorder spouses
const reorderSpouses = async (willId, spouseIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const spouses = await db
    .selectFrom('spouses')
    .select(['id'])
    .where('will_id', '=', willId)
    .execute();

  const spouseIdSet = new Set(spouses.map((s) => s.id));
  const requestedIdSet = new Set(spouseIds);

  if (spouseIdSet.size !== requestedIdSet.size || 
      ![...spouseIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid spouse IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < spouseIds.length; i++) {
      await trx
        .updateTable('spouses')
        .set({ order_index: i + 1 })
        .where('id', '=', spouseIds[i])
        .execute();
    }
  });

  return getSpouses(willId, userId, userRole);
};

module.exports = {
  getSpouses,
  getSpouseById,
  createSpouse,
  updateSpouse,
  deleteSpouse,
  reorderSpouses
};