const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

// Get testator for a will
const getTestator = async (willId, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  return db
    .selectFrom('testators')
    .selectAll()
    .where('will_id', '=', willId)
    .executeTakeFirst();
};

// Create or update testator
const upsertTestator = async (willId, data, userId, userRole) => {
  await willsService.getWillById(willId, userId, userRole);

  if (!data || Object.keys(data).length === 0) return null;

  const {
    ...testatorData
  } = data;

  return db.transaction().execute(async (trx) => {

    // Create or update testator
    const existing = await trx
      .selectFrom('testators')
      .select('id')
      .where('will_id', '=', willId)
      .executeTakeFirst();

    let testator;

    if (existing) {
      testator = await trx
        .updateTable('testators')
        .set({
          ...testatorData,
          updated_at: new Date(),
        })
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirst();

      logger.info('Testator updated', {
        testatorId: existing.id,
        willId,
      });
    } else {
      const testatorId = generateUUID();

      testator = await trx
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

      logger.info('Testator created', {
        testatorId,
        willId,
      });
    }

    return testator;
  });
};

module.exports = {
  getTestator,
  upsertTestator,
};
