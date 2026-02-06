const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError } = require('../../utils/errors');
const willsService = require('../wills/wills.service');
const logger = require('../../utils/logger');

/**
 * IMPORTANT: Executor data management during will flow
 * 
 * When saving will step data (Step 2 or 3):
 * - DO NOT use this service directly
 * - Use wills.step.service.js → saveExecutors() instead
 * - The step service handles executor CRUD in a transaction with "replace all" strategy
 * 
 * This service is for direct executor CRUD operations outside the will step flow
 * (e.g., API endpoints for managing executors independently)
 */

/**
 * Get all executors for a will
 */
const getExecutors = async (willId, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  const executors = await db
    .selectFrom('executors')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('is_backup', 'asc')
    .orderBy('order_index', 'asc')
    .execute();

  return executors;
};

/**
 * Get executor by ID
 */
const getExecutorById = async (willId, executorId, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  const executor = await db
    .selectFrom('executors')
    .selectAll()
    .where('id', '=', executorId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!executor) {
    throw new NotFoundError('Executor');
  }

  return executor;
};

/**
 * Create new executor
 */
const createExecutor = async (willId, executorData, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  // Get current max order_index
  const maxOrder = await db
    .selectFrom('executors')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .where('is_backup', '=', executorData.is_backup || false)
    .executeTakeFirst();

  const orderIndex = (maxOrder?.max_order || 0) + 1;

  const executorId = generateUUID();
  const executor = await db
    .insertInto('executors')
    .values({
      id: executorId,
      will_id: willId,
      ...executorData,
      order_index: orderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  // Update will's updated_at
  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Executor created', { executorId, willId });

  return executor;
};

/**
 * Update executor
 */
const updateExecutor = async (willId, executorId, updateData, userId, userRole) => {
  // Verify executor exists and access
  await getExecutorById(willId, executorId, userId, userRole);

  const executor = await db
    .updateTable('executors')
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where('id', '=', executorId)
    .returningAll()
    .executeTakeFirst();

  // Update will's updated_at
  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Executor updated', { executorId, willId });

  return executor;
};

/**
 * Delete executor
 */
const deleteExecutor = async (willId, executorId, userId, userRole) => {
  // Verify executor exists and access
  await getExecutorById(willId, executorId, userId, userRole);

  await db
    .deleteFrom('executors')
    .where('id', '=', executorId)
    .execute();

  // Update will's updated_at
  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Executor deleted', { executorId, willId });
};

/**
 * Reorder executors
 */
const reorderExecutors = async (willId, executorIds, userId, userRole) => {
  // Verify will access
  await willsService.getWillById(willId, userId, userRole);

  // Update order for each executor
  for (let i = 0; i < executorIds.length; i++) {
    await db
      .updateTable('executors')
      .set({ order_index: i + 1, updated_at: new Date() })
      .where('id', '=', executorIds[i])
      .where('will_id', '=', willId)
      .execute();
  }

  // Update will's updated_at
  await db
    .updateTable('wills')
    .set({ updated_at: new Date() })
    .where('id', '=', willId)
    .execute();

  logger.info('Executors reordered', { willId, executorIds });

  return getExecutors(willId, userId, userRole);
};

module.exports = {
  getExecutors,
  getExecutorById,
  createExecutor,
  updateExecutor,
  deleteExecutor,
  reorderExecutors,
};
