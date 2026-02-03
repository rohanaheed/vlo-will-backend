const express = require('express');
const spousesController = require('./spouses.controller');
const spousesValidation = require('./spouses.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/wills/:willId/spouse
 * @desc    Get spouse info
 * @access  Private
 */
router.get(
  '/',
  validate(spousesValidation.willIdParamSchema),
  spousesController.getSpouse
);

/**
 * @route   POST /api/v1/wills/:willId/spouse
 * @desc    Create or update spouse
 * @access  Private
 */
router.post(
  '/',
  validate(spousesValidation.spouseSchema),
  spousesController.upsertSpouse
);

/**
 * @route   PUT /api/v1/wills/:willId/spouse
 * @desc    Update spouse
 * @access  Private
 */
router.put(
  '/',
  validate(spousesValidation.spouseSchema),
  spousesController.upsertSpouse
);

module.exports = router;
