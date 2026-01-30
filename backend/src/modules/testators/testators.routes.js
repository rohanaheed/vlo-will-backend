const express = require('express');
const testatorsController = require('./testators.controller');
const testatorsValidation = require('./testators.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/wills/:willId/testator
 * @desc    Get testator info
 * @access  Private
 */
router.get(
  '/',
  validate(testatorsValidation.willIdParamSchema),
  testatorsController.getTestator
);

/**
 * @route   POST /api/v1/wills/:willId/testator
 * @desc    Create or update testator
 * @access  Private
 */
router.post(
  '/',
  validate(testatorsValidation.testatorSchema),
  testatorsController.upsertTestator
);

/**
 * @route   PUT /api/v1/wills/:willId/testator
 * @desc    Update testator
 * @access  Private
 */
router.put(
  '/',
  validate(testatorsValidation.testatorSchema),
  testatorsController.upsertTestator
);

module.exports = router;
