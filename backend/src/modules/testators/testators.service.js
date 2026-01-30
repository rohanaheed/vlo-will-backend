const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

/**
 * Get testator for a will
 */
const getTestator = async (willId, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  const testator = await db
    .selectFrom('testators')
    .selectAll()
    .where('will_id', '=', willId)
    .executeTakeFirst();

  return testator;
};

/**
 * Create or update testator
 */
const upsertTestator = async (willId, testatorData, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  // Check if testator exists
  const existingTestator = await db
    .selectFrom('testators')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  let testator;

  if (existingTestator) {
    // Update existing
    testator = await db
      .updateTable('testators')
      .set({
        ...testatorData,
        updated_at: new Date(),
      })
      .where('id', '=', existingTestator.id)
      .returningAll()
      .executeTakeFirst();

    logger.info('Testator updated', { testatorId: existingTestator.id, willId });
  } else {
    // Create new
    const testatorId = generateUUID();
    testator = await db
      .insertInto('testators')
      .values({
        id: testatorId,
        will_id: willId,
        ...testatorData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    logger.info('Testator created', { testatorId, willId });
  }

  // Update will's updated_at
  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  return testator;
};

module.exports = {
  getTestator,
  upsertTestator,
};
