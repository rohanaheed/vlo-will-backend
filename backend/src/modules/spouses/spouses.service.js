const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError } = require('../../utils/errors');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

// Get all spouses for a will
const getSpouses = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('spouses')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();
};

// Get spouse by ID
const getSpouseById = async (willId, spouseId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const spouse = await db
    .selectFrom('spouses')
    .selectAll()
    .where('id', '=', spouseId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!spouse) {
    throw new NotFoundError('Spouse');
  }

  return spouse;
};

// Create new spouse
const createSpouse = async (willId, spouseData, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('spouses')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;

  const spouseId = generateUUID();

  const spouse = await db
    .insertInto('spouses')
    .values({
      id: spouseId,
      will_id: willId,
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

  logger.info('Spouse created', { spouseId, willId });

  return spouse;
};

// Update spouse
const updateSpouse = async (willId, spouseId, updateData, userId, userRole) => {
  await getSpouseById(willId, spouseId, userId, userRole);

  const spouse = await db
    .updateTable('spouses')
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where('id', '=', spouseId)
    .returningAll()
    .executeTakeFirst();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Spouse updated', { spouseId, willId });

  return spouse;
};

// Delete spouse
const deleteSpouse = async (willId, spouseId, userId, userRole) => {
  await getSpouseById(willId, spouseId, userId, userRole);

  await db
    .deleteFrom('spouses')
    .where('id', '=', spouseId)
    .execute();

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Spouse deleted', { spouseId, willId });
};

// Reorder spouses
const reorderSpouses = async (willId, spouseIds, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  for (let i = 0; i < spouseIds.length; i++) {
    await db
      .updateTable('spouses')
      .set({
        order_index: i + 1,
        updated_at: new Date(),
      })
      .where('id', '=', spouseIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Spouses reordered', { willId, spouseIds });

  return getSpouses(willId, userId, userRole);
};

module.exports = {
  getSpouses,
  getSpouseById,
  createSpouse,
  updateSpouse,
  deleteSpouse,
  reorderSpouses,
};
