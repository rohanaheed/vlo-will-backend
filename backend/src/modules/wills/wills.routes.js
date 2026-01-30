const express = require('express');
const willsController = require('./wills.controller');
const stepController = require('./wills.step.controller');
const willsValidation = require('./wills.validation');
const stepValidation = require('./wills.step.validation');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/wills
 * @desc    Get all wills (user's own or all for admin)
 * @access  Private
 */
router.get(
  '/',
  validate(willsValidation.getWillsQuerySchema),
  willsController.getWills
);

/**
 * @route   GET /api/v1/wills/:id
 * @desc    Get will by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(willsValidation.getWillByIdSchema),
  willsController.getWillById
);

/**
 * @route   GET /api/v1/wills/:id/summary
 * @desc    Get will summary with all related data
 * @access  Private
 */
router.get(
  '/:id/summary',
  validate(willsValidation.getWillByIdSchema),
  willsController.getWillSummary
);

/**
 * @route   POST /api/v1/wills
 * @desc    Create new will
 * @access  Private
 */
router.post(
  '/',
  validate(willsValidation.createWillSchema),
  willsController.createWill
);

/**
 * @route   PUT /api/v1/wills/:id
 * @desc    Update will
 * @access  Private
 */
router.put(
  '/:id',
  validate(willsValidation.updateWillSchema),
  willsController.updateWill
);

/**
 * @route   PUT /api/v1/wills/:id/step
 * @desc    Update current step (legacy - use /steps/:stepNumber instead)
 * @access  Private
 */
router.put(
  '/:id/step',
  validate(willsValidation.updateStepSchema),
  willsController.updateStep
);

/**
 * =============================================================
 * UNIFIED STEP ENDPOINTS (Recommended)
 * Single API call to save step data AND advance step
 * Includes step locking logic
 * =============================================================
 */

/**
 * @route   GET /api/v1/wills/:id/steps
 * @desc    Get all steps status (for progress bar)
 * @access  Private
 * 
 * @example Response:
 * {
 *   "steps": [
 *     { "step": 1, "status": "locked", "can_edit": false },
 *     { "step": 2, "status": "locked", "can_edit": false },
 *     { "step": 3, "status": "current", "can_edit": true },
 *     { "step": 4, "status": "upcoming", "can_edit": false }
 *   ],
 *   "will_info": { ... }
 * }
 */
router.get(
  '/:id/steps',
  validate(willsValidation.getWillByIdSchema),
  stepController.getAllStepsStatus
);

/**
 * @route   GET /api/v1/wills/:id/steps/:stepNumber
 * @desc    Get data for a specific step
 * @access  Private
 * 
 * @example Response:
 * {
 *   "step": 3,
 *   "status": "current",
 *   "can_edit": true,
 *   "locked_reason": null,
 *   "data": { "executors": [...] },
 *   "will_info": { ... }
 * }
 */
router.get(
  '/:id/steps/:stepNumber',
  validate(stepValidation.getStepSchema),
  stepController.getStep
);

/**
 * @route   PUT /api/v1/wills/:id/steps/:stepNumber
 * @desc    Save step data and optionally advance/go back
 * @access  Private
 * 
 * STEP LOCKING:
 * - Can only edit current step (highest_completed_step + 1)
 * - Previous steps are LOCKED (view only)
 * - After payment, all steps become editable
 * - After editing post-payment, steps lock again
 * 
 * @example Request:
 * PUT /api/v1/wills/abc-123/steps/3
 * {
 *   "data": {
 *     "executors": [
 *       { "full_name": "Jane Smith", "is_spouse": true },
 *       { "full_name": "Bob Johnson", "relationship_to_testator": "brother" }
 *     ]
 *   },
 *   "action": "save_and_continue"
 * }
 * 
 * @example Response:
 * {
 *   "will": { 
 *     "id": "abc-123", 
 *     "status": "in_progress", 
 *     "current_step": 4,
 *     "highest_completed_step": 3,
 *     "is_paid": false,
 *     "edit_unlocked": false
 *   },
 *   "saved_step": 3,
 *   "next_step": 4
 * }
 */
router.put(
  '/:id/steps/:stepNumber',
  validate(stepValidation.saveStepSchema),
  stepController.saveStep
);

/**
 * @route   POST /api/v1/wills/:id/unlock
 * @desc    Unlock will for editing (after payment)
 * @access  Private
 * 
 * This is called after successful payment to allow editing locked steps.
 * In production, this would typically be triggered by Stripe webhook.
 * 
 * @example Request:
 * { "payment_id": "pay_xxx" }
 */
router.post(
  '/:id/unlock',
  validate(willsValidation.getWillByIdSchema),
  stepController.unlockForEditing
);

/**
 * @route   POST /api/v1/wills/:id/complete
 * @desc    Mark will as completed
 * @access  Private
 */
router.post(
  '/:id/complete',
  validate(willsValidation.completeWillSchema),
  willsController.completeWill
);

/**
 * @route   DELETE /api/v1/wills/:id
 * @desc    Delete will
 * @access  Private
 */
router.delete(
  '/:id',
  validate(willsValidation.deleteWillSchema),
  willsController.deleteWill
);

module.exports = router;
