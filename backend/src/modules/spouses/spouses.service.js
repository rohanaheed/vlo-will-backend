const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

/**
 * Get spouse for a will
 */
const getSpouse = async (willId, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  const spouse = await db
    .selectFrom('spouses')
    .selectAll()
    .where('will_id', '=', willId)
    .executeTakeFirst();

  return spouse;
};

/**
 * Create or update spouse
 */
const upsertSpouse = async (willId, spouseData, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  const existingSpouse = await db
    .selectFrom('spouses')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  let spouse;

  if (existingSpouse) {
    spouse = await db
      .updateTable('spouses')
      .set({
        ...spouseData,
        updated_at: new Date(),
      })
      .where('id', '=', existingSpouse.id)
      .returningAll()
      .executeTakeFirst();

    logger.info('Spouse updated', { spouseId: existingSpouse.id, willId });
  } else {
    const spouseId = generateUUID();
    spouse = await db
      .insertInto('spouses')
      .values({
        id: spouseId,
        will_id: willId,
        ...spouseData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    logger.info('Spouse created', { spouseId, willId });
  }

  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  return spouse;
};

module.exports = {
  getSpouse,
  upsertSpouse,
};
