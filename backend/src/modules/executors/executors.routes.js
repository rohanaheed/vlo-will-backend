const express = require('express');
const executorsController = require('./executors.controller');
const executorsValidation = require('./executors.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/wills/:willId/executors
 * @desc    Get all executors
 * @access  Private
 */
router.get(
  '/',
  validate(executorsValidation.willIdParamSchema),
  executorsController.getExecutors
);

/**
 * @route   POST /api/v1/wills/:willId/executors
 * @desc    Add executor
 * @access  Private
 */
router.post(
  '/',
  validate(executorsValidation.createExecutorSchema),
  executorsController.createExecutor
);

/**
 * @route   PUT /api/v1/wills/:willId/executors/reorder
 * @desc    Reorder executors
 * @access  Private
 */
router.put(
  '/reorder',
  validate(executorsValidation.reorderExecutorsSchema),
  executorsController.reorderExecutors
);

/**
 * @route   PUT /api/v1/wills/:willId/executors/:id
 * @desc    Update executor
 * @access  Private
 */
router.put(
  '/:id',
  validate(executorsValidation.updateExecutorSchema),
  executorsController.updateExecutor
);

/**
 * @route   DELETE /api/v1/wills/:willId/executors/:id
 * @desc    Remove executor
 * @access  Private
 */
router.delete(
  '/:id',
  validate(executorsValidation.executorIdParamSchema),
  executorsController.deleteExecutor
);

module.exports = router;
