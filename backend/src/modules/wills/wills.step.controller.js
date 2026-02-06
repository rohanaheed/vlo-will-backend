const stepService = require('./wills.step.service');
const { validateStepData } = require('./wills.step.validation');
const { sendSuccess } = require('../../utils/response');
const { ValidationError } = require('../../utils/errors');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS, WILL_TYPES } = require('../../utils/constants');

// Save step data and auto-advance
const saveStep = async (req, res, next) => {
  try {
    const { id: willId, stepNumber } = req.params;
    const { data = {}, action } = req.body;
    const step = Number(stepNumber);

    if (Number.isNaN(step)) {
      throw new ValidationError([{ field: 'stepNumber', message: 'Invalid step number' }]);
    }

    // Check will access + get current state for validation
    const will = await stepService.getWillWithAccess(
      willId,
      req.user.id,
      req.user.role_name
    );

    // Validate step data based on will type and current state
    const validationResult = validateStepData(
      step,
      data,
      will.will_type === WILL_TYPES.ISLAMIC ? 'islamic' : 'general'
    );

    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.errors?.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })) || [{ field: 'data', message: validationResult.error }]
      );
    }

    // Save + auto-advance handled inside service
    const updatedWill = await stepService.saveStepData(
      willId,
      step,
      validationResult.data,
      req.user.id,
      req.user.role_name,
      { action }
    );

    // Audit log
    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'will',
      entityId: willId,
      newValues: {
        step,
        action,
        current_step: updatedWill.current_step,
        highest_completed_step: updatedWill.highest_completed_step,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendSuccess(
      res,
      {
        will: updatedWill,
        saved_step: step,
        next_step: updatedWill.current_step,
      },
      'Step saved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// Get step data for a will
const getStep = async (req, res, next) => {
  try {
    const { id: willId, stepNumber } = req.params;
    const step = Number(stepNumber);

    if (Number.isNaN(step)) {
      throw new ValidationError([{ field: 'stepNumber', message: 'Invalid step number' }]);
    }

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

// Get status of all steps for a will
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

// Unlock will for editing (after payment)
const unlockForEditing = async (req, res, next) => {
  try {
    const { id: willId } = req.params;
    const { payment_id } = req.body;

    if (!payment_id) {
      throw new ValidationError([{ field: 'payment_id', message: 'Payment ID is required' }]);
    }

    const will = await stepService.unlockWillForEditing(
      willId,
      payment_id,
      req.user.id,
      req.user.role_name
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'will',
      entityId: willId,
      newValues: {
        payment_id,
        edit_unlocked: true,
        edit_count: will.edit_count,
      },
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
