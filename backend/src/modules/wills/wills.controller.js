const willsService = require('./wills.service');
const { sendSuccess, sendCreated, sendPaginated, sendNoContent } = require('../../utils/response');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

/**
 * Get all wills
 * GET /api/v1/wills
 */
const getWills = async (req, res, next) => {
  try {
    const { wills, pagination } = await willsService.getWills(
      req.query,
      req.user.id,
      req.user.role_name
    );

    return sendPaginated(res, wills, pagination, 'Wills retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get will by ID
 * GET /api/v1/wills/:id
 */
const getWillById = async (req, res, next) => {
  try {
    const will = await willsService.getWillById(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { will }, 'Will retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new will
 * POST /api/v1/wills
 */
const createWill = async (req, res, next) => {
  try {
    const will = await willsService.createWill(req.user.id, req.body);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'will',
      entityId: will.id,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendCreated(res, { will }, 'Will created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update will
 * PUT /api/v1/wills/:id
 */
const updateWill = async (req, res, next) => {
  try {
    const originalWill = await willsService.getWillById(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    const will = await willsService.updateWill(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role_name
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'will',
      entityId: req.params.id,
      oldValues: originalWill,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { will }, 'Will updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update current step
 * PUT /api/v1/wills/:id/step
 */
const updateStep = async (req, res, next) => {
  try {
    const will = await willsService.updateStep(
      req.params.id,
      req.body.current_step,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { will }, 'Step updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get will summary
 * GET /api/v1/wills/:id/summary
 */
const getWillSummary = async (req, res, next) => {
  try {
    const summary = await willsService.getWillSummary(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { summary }, 'Will summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Complete will
 * POST /api/v1/wills/:id/complete
 */
const completeWill = async (req, res, next) => {
  try {
    const will = await willsService.completeWill(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'will',
      entityId: req.params.id,
      newValues: { status: 'completed' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { will }, 'Will completed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete will
 * DELETE /api/v1/wills/:id
 */
const deleteWill = async (req, res, next) => {
  try {
    const will = await willsService.getWillById(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    await willsService.deleteWill(
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'will',
      entityId: req.params.id,
      oldValues: will,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWills,
  getWillById,
  createWill,
  updateWill,
  updateStep,
  getWillSummary,
  completeWill,
  deleteWill,
};
