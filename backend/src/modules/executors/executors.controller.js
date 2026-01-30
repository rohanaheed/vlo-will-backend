const executorsService = require('./executors.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');

/**
 * Get all executors
 * GET /api/v1/wills/:willId/executors
 */
const getExecutors = async (req, res, next) => {
  try {
    const executors = await executorsService.getExecutors(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { executors }, 'Executors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create executor
 * POST /api/v1/wills/:willId/executors
 */
const createExecutor = async (req, res, next) => {
  try {
    const executor = await executorsService.createExecutor(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendCreated(res, { executor }, 'Executor added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update executor
 * PUT /api/v1/wills/:willId/executors/:id
 */
const updateExecutor = async (req, res, next) => {
  try {
    const executor = await executorsService.updateExecutor(
      req.params.willId,
      req.params.id,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { executor }, 'Executor updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete executor
 * DELETE /api/v1/wills/:willId/executors/:id
 */
const deleteExecutor = async (req, res, next) => {
  try {
    await executorsService.deleteExecutor(
      req.params.willId,
      req.params.id,
      req.user.id,
      req.user.role_name
    );

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder executors
 * PUT /api/v1/wills/:willId/executors/reorder
 */
const reorderExecutors = async (req, res, next) => {
  try {
    const executors = await executorsService.reorderExecutors(
      req.params.willId,
      req.body.executor_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { executors }, 'Executors reordered successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExecutors,
  createExecutor,
  updateExecutor,
  deleteExecutor,
  reorderExecutors,
};
