const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { parsePaginationParams, calculatePagination, parseSortParams } = require('../../utils/pagination');
const { WILL_STATUSES, WILL_TYPES, TOTAL_STEPS, ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Get all wills for a user (or all wills for admin)
 */
const getWills = async (query, userId, userRole) => {
  const { page, limit, offset } = parsePaginationParams(query);
  const { sortBy, sortOrder } = parseSortParams(query, ['created_at', 'updated_at', 'status']);

  let baseQuery = db
    .selectFrom('wills')
    .select([
      'id',
      'user_id',
      'will_type',
      'marital_status',
      'status',
      'current_step',
      'is_for_self',
      'created_at',
      'updated_at',
    ]);

  // Non-admin users can only see their own wills
  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    baseQuery = baseQuery.where('user_id', '=', userId);
  }

  // Apply filters
  if (query.status) {
    baseQuery = baseQuery.where('status', '=', query.status);
  }

  if (query.will_type) {
    baseQuery = baseQuery.where('will_type', '=', query.will_type);
  }

  // Get total count
  let countQuery = db.selectFrom('wills').select(db.fn.count('id').as('count'));
  
  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    countQuery = countQuery.where('user_id', '=', userId);
  }
  if (query.status) {
    countQuery = countQuery.where('status', '=', query.status);
  }
  if (query.will_type) {
    countQuery = countQuery.where('will_type', '=', query.will_type);
  }

  const countResult = await countQuery.executeTakeFirst();
  const totalItems = parseInt(countResult?.count || 0, 10);

  // Get wills with pagination
  const wills = await baseQuery
    .orderBy(sortBy, sortOrder)
    .limit(limit)
    .offset(offset)
    .execute();

  return {
    wills,
    pagination: calculatePagination(totalItems, page, limit),
  };
};

/**
 * Get will by ID
 */
const getWillById = async (willId, userId = null, userRole = null) => {
  const will = await db
    .selectFrom('wills')
    .selectAll()
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError('Will');
  }

  // Check ownership for non-admin users
  if (userId && userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    if (will.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this will');
    }
  }

  return will;
};

/**
 * Create new will
 */
const createWill = async (userId, willData) => {
  const willId = generateUUID();

  const will = await db
    .insertInto('wills')
    .values({
      id: willId,
      user_id: userId,
      will_type: willData.will_type,
      marital_status: willData.marital_status,
      status: WILL_STATUSES.DRAFT,
      current_step: 1,
      is_for_self: willData.is_for_self ?? true,
      not_for_self_explanation: willData.not_for_self_explanation,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning([
      'id',
      'user_id',
      'will_type',
      'marital_status',
      'status',
      'current_step',
      'is_for_self',
      'created_at',
    ])
    .executeTakeFirst();

  logger.info('Will created', { willId, userId, willType: willData.will_type });

  return will;
};

/**
 * Update will
 */
const updateWill = async (willId, updateData, userId, userRole) => {
  // Verify ownership
  const existingWill = await getWillById(willId, userId, userRole);

  // Prevent updating completed/signed wills
  if ([WILL_STATUSES.COMPLETED, WILL_STATUSES.SIGNED].includes(existingWill.status)) {
    throw new BadRequestError('Cannot update a completed or signed will');
  }

  // Update status to in_progress if it was draft
  const updates = {
    ...updateData,
    updated_at: new Date(),
  };

  if (existingWill.status === WILL_STATUSES.DRAFT) {
    updates.status = WILL_STATUSES.IN_PROGRESS;
  }

  const will = await db
    .updateTable('wills')
    .set(updates)
    .where('id', '=', willId)
    .returning([
      'id',
      'will_type',
      'marital_status',
      'status',
      'current_step',
      'is_for_self',
      'signing_date',
      'signing_place',
      'updated_at',
    ])
    .executeTakeFirst();

  logger.info('Will updated', { willId, userId });

  return will;
};

/**
 * Update current step
 */
const updateStep = async (willId, step, userId, userRole) => {
  const will = await getWillById(willId, userId, userRole);

  // Validate step number based on will type
  const maxSteps = will.will_type === WILL_TYPES.ISLAMIC ? TOTAL_STEPS.ISLAMIC : TOTAL_STEPS.GENERAL;

  if (step < 1 || step > maxSteps) {
    throw new BadRequestError(`Step must be between 1 and ${maxSteps}`);
  }

  const updatedWill = await db
    .updateTable('wills')
    .set({
      current_step: step,
      status: will.status === WILL_STATUSES.DRAFT ? WILL_STATUSES.IN_PROGRESS : will.status,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .returning(['id', 'current_step', 'status', 'updated_at'])
    .executeTakeFirst();

  logger.info('Will step updated', { willId, step, userId });

  return updatedWill;
};

/**
 * Mark will as completed
 */
const completeWill = async (willId, userId, userRole) => {
  const will = await getWillById(willId, userId, userRole);

  if (will.status === WILL_STATUSES.COMPLETED || will.status === WILL_STATUSES.SIGNED) {
    throw new BadRequestError('Will is already completed');
  }

  // TODO: Validate that all required steps are filled

  const updatedWill = await db
    .updateTable('wills')
    .set({
      status: WILL_STATUSES.COMPLETED,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .returning(['id', 'status', 'updated_at'])
    .executeTakeFirst();

  logger.info('Will completed', { willId, userId });

  return updatedWill;
};

/**
 * Delete will
 */
const deleteWill = async (willId, userId, userRole) => {
  const will = await getWillById(willId, userId, userRole);

  // Prevent deleting signed wills
  if (will.status === WILL_STATUSES.SIGNED) {
    throw new BadRequestError('Cannot delete a signed will');
  }

  await db
    .deleteFrom('wills')
    .where('id', '=', willId)
    .execute();

  logger.info('Will deleted', { willId, userId });
};

/**
 * Get will summary with all related data
 */
const getWillSummary = async (willId, userId, userRole) => {
  const will = await getWillById(willId, userId, userRole);

  // Fetch all related data in parallel
  const [
    testator,
    spouse,
    executors,
    trustees,
    guardians,
    children,
    beneficiaries,
    charities,
    assets,
    debts,
    pets,
    funeralWishes,
    witnesses,
    islamicDetails,
    totalFailure,
  ] = await Promise.all([
    db.selectFrom('testators').selectAll().where('will_id', '=', willId).executeTakeFirst(),
    db.selectFrom('spouses').selectAll().where('will_id', '=', willId).executeTakeFirst(),
    db.selectFrom('executors').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('trustees').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('guardians').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('children').selectAll().where('will_id', '=', willId).execute(),
    db.selectFrom('beneficiaries').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('charities').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('assets').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('debts').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('pets').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    db.selectFrom('funeral_wishes').selectAll().where('will_id', '=', willId).executeTakeFirst(),
    db.selectFrom('witnesses').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
    will.will_type === WILL_TYPES.ISLAMIC
      ? db.selectFrom('islamic_will_details').selectAll().where('will_id', '=', willId).executeTakeFirst()
      : null,
    db.selectFrom('total_failure_clauses').selectAll().where('will_id', '=', willId).executeTakeFirst(),
  ]);

  // Get Islamic heirs if Islamic will
  let islamicHeirs = [];
  if (islamicDetails) {
    islamicHeirs = await db
      .selectFrom('islamic_heirs')
      .selectAll()
      .where('islamic_will_details_id', '=', islamicDetails.id)
      .execute();
  }

  // Get wipeout beneficiaries if total failure clause exists
  let wipeoutBeneficiaries = [];
  if (totalFailure) {
    wipeoutBeneficiaries = await db
      .selectFrom('wipeout_beneficiaries')
      .selectAll()
      .where('total_failure_clause_id', '=', totalFailure.id)
      .orderBy('order_index')
      .execute();
  }

  return {
    will,
    testator,
    spouse,
    executors,
    trustees,
    guardians,
    children,
    beneficiaries,
    charities,
    assets,
    debts,
    pets,
    funeral_wishes: funeralWishes,
    witnesses,
    islamic_details: islamicDetails ? { ...islamicDetails, heirs: islamicHeirs } : null,
    total_failure: totalFailure ? { ...totalFailure, wipeout_beneficiaries: wipeoutBeneficiaries } : null,
  };
};

module.exports = {
  getWills,
  getWillById,
  createWill,
  updateWill,
  updateStep,
  completeWill,
  deleteWill,
  getWillSummary,
};
