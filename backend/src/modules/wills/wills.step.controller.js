const stepService = require('./wills.step.service');
const { validateStepData } = require('./wills.step.validation');
const { sendSuccess } = require('../../utils/response');
const { ValidationError } = require('../../utils/errors');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

/**
 * Save step data (unified endpoint)
 * PUT /api/v1/wills/:id/steps/:stepNumber
 * 
 * Request body:
 * {
 *   "data": { ... step-specific data ... },
 *   "action": "save" | "save_and_continue" | "save_and_back"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Step saved successfully",
 *   "data": {
 *     "will": { id, status, current_step, highest_completed_step, ... },
 *     "saved_step": 3,
 *     "next_step": 4
 *   }
 * }
 */
const saveStep = async (req, res, next) => {
  try {
    const { id: willId, stepNumber } = req.params;
    const { data, action } = req.body;
    const step = parseInt(stepNumber, 10);

    // Validate step-specific data
    const validationResult = validateStepData(step, data || {});
    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors?.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })) || [{ field: 'data', message: validationResult.error }]
      );
    }

    // Save step data (includes step locking logic)
    const will = await stepService.saveStepData(
      willId,
      step,
      validationResult.data,
      req.user.id,
      req.user.role_name,
      { action }
    );

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'will',
      entityId: willId,
      newValues: { step, action },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, {
      will,
      saved_step: step,
      next_step: will.current_step,
    }, 'Step saved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get step data
 * GET /api/v1/wills/:id/steps/:stepNumber
 * 
 * Response includes step status (locked, current, upcoming, editable)
 * and whether user can edit this step
 */
const getStep = async (req, res, next) => {
  try {
    const { id: willId, stepNumber } = req.params;
    const step = parseInt(stepNumber, 10);

    const result = await stepService.getStepData(
      willId,
      step,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, result, 'Step data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all steps status (for progress bar)
 * GET /api/v1/wills/:id/steps
 * 
 * Response:
 * {
 *   "steps": [
 *     { "step": 1, "status": "locked", "can_edit": false },
 *     { "step": 2, "status": "locked", "can_edit": false },
 *     { "step": 3, "status": "current", "can_edit": true },
 *     { "step": 4, "status": "upcoming", "can_edit": false },
 *     ...
 *   ],
 *   "will_info": { ... }
 * }
 */
const getAllStepsStatus = async (req, res, next) => {
  try {
    const { id: willId } = req.params;

    const result = await stepService.getAllStepsStatus(
      willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, result, 'Steps status retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Unlock will for editing (after payment)
 * POST /api/v1/wills/:id/unlock
 * 
 * This should be called after successful payment
 * In production, this would be triggered by Stripe webhook
 */
const unlockForEditing = async (req, res, next) => {
  try {
    const { id: willId } = req.params;
    const { payment_id } = req.body;

    const will = await stepService.unlockWillForEditing(
      willId,
      payment_id,
      req.user.id,
      req.user.role_name
    );

    await createAuditLog({
      userId: req.user.id,
      action: 'unlock_for_editing',
      entityType: 'will',
      entityId: willId,
      newValues: { payment_id, edit_count: will.edit_count },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(res, { will }, 'Will unlocked for editing');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveStep,
  getStep,
  getAllStepsStatus,
  unlockForEditing,
};
