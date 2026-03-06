/**
 * Form Response Controller
 * Handles user-side form operations
 */

const formResponseService = require('./form-response.service');
const { sendSuccess } = require('../../utils/response');
const { db } = require('../../db');
const { ForbiddenError, NotFoundError } = require('../../utils/errors');

/**
 * Verify user owns the will
 */
const verifyWillOwnership = async (willId, userId) => {
  const will = await db
    .selectFrom('wills')
    .select(['id', 'user_id'])
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError('Will');
  }

  if (will.user_id !== userId) {
    throw new ForbiddenError('You do not have access to this will');
  }

  return will;
};

/**
 * Get form structure for a will
 */
const getWillForm = async (req, res, next) => {
  try {
    const { willId } = req.params;
    await verifyWillOwnership(willId, req.user.id);

    const form = await formResponseService.getFormForWill(willId);
    return sendSuccess(res, form, 'Form structure retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress for all steps
 */
const getWillProgress = async (req, res, next) => {
  try {
    const { willId } = req.params;
    await verifyWillOwnership(willId, req.user.id);

    const progress = await formResponseService.getWillProgress(willId);
    return sendSuccess(res, progress, 'Progress retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get data for a specific step
 */
const getStepData = async (req, res, next) => {
  try {
    const { willId, stepSlug } = req.params;
    await verifyWillOwnership(willId, req.user.id);

    // Get form structure
    const form = await formResponseService.getFormForWill(willId);
    const step = form.steps.find((s) => s.slug === stepSlug);

    if (!step) {
      throw new NotFoundError('Step');
    }

    // Get saved response
    const response = await formResponseService.getStepResponse(willId, stepSlug);

    return sendSuccess(
      res,
      {
        step: {
          slug: step.slug,
          name: step.name,
          description: step.description,
          fields: step.fields,
        },
        data: response?.data || {},
        is_complete: response?.is_complete || false,
      },
      'Step data retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Save data for a step
 */
const saveStepData = async (req, res, next) => {
  try {
    const { willId, stepSlug } = req.params;
    const { data, action } = req.body;

    await verifyWillOwnership(willId, req.user.id);

    // Check will payment status (locking logic)
    const will = await db
      .selectFrom('wills')
      .select(['is_paid', 'edit_unlocked'])
      .where('id', '=', willId)
      .executeTakeFirst();

    if (will.is_paid && !will.edit_unlocked) {
      throw new ForbiddenError('Will is locked. Payment required to unlock for editing.');
    }

    // Determine if step is complete based on action
    const isComplete = action === 'save_and_continue';

    // Save the response
    const response = await formResponseService.saveStepResponse(
      willId,
      stepSlug,
      data,
      isComplete
    );

    // If editing after payment, re-lock the will
    if (will.is_paid && will.edit_unlocked) {
      await db
        .updateTable('wills')
        .set({
          edit_unlocked: false,
          updated_at: new Date(),
        })
        .where('id', '=', willId)
        .execute();
    }

    // Get next step info
    const form = await formResponseService.getFormForWill(willId);
    const currentStepIndex = form.steps.findIndex((s) => s.slug === stepSlug);
    const nextStep = form.steps[currentStepIndex + 1];
    const prevStep = form.steps[currentStepIndex - 1];

    let navigateTo = null;
    if (action === 'save_and_continue' && nextStep) {
      navigateTo = nextStep.slug;
    } else if (action === 'save_and_back' && prevStep) {
      navigateTo = prevStep.slug;
    }

    return sendSuccess(
      res,
      {
        response,
        navigate_to: navigateTo,
      },
      'Step data saved successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWillForm,
  getWillProgress,
  getStepData,
  saveStepData,
};
