/**
 * Form Builder Controller
 * Handles HTTP requests for form builder operations
 */

const formBuilderService = require('./form-builder.service');
const formVersionService = require('./form-version.service');
const { sendSuccess, sendCreated } = require('../../utils/response');
const logger = require('../../utils/logger');

// ==================== FORM TEMPLATES ====================

const createFormTemplate = async (req, res, next) => {
  try {
    const form = await formBuilderService.createFormTemplate(req.body, req.user.id);
    return sendCreated(res, form, 'Form template created successfully');
  } catch (error) {
    next(error);
  }
};

const getFormTemplates = async (req, res, next) => {
  try {
    const { status, will_type } = req.query;
    const forms = await formBuilderService.getFormTemplates({ status, will_type });
    return sendSuccess(res, forms, 'Form templates retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getFormTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formBuilderService.getFormTemplateById(id);
    return sendSuccess(res, form, 'Form template retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getFormTemplateWithStructure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formBuilderService.getFormTemplateWithStructure(id);
    return sendSuccess(res, form, 'Form template with structure retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateFormTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formBuilderService.updateFormTemplate(id, req.body);
    return sendSuccess(res, form, 'Form template updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteFormTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await formBuilderService.deleteFormTemplate(id);
    return sendSuccess(res, null, 'Form template deleted successfully');
  } catch (error) {
    next(error);
  }
};

const cloneFormTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slug, name } = req.body;
    const form = await formBuilderService.cloneFormTemplate(id, slug, name, req.user.id);
    return sendCreated(res, form, 'Form template cloned successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== FORM STEPS ====================

const createFormStep = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const step = await formBuilderService.createFormStep(formId, req.body);
    return sendCreated(res, step, 'Form step created successfully');
  } catch (error) {
    next(error);
  }
};

const getFormSteps = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const steps = await formBuilderService.getFormSteps(formId);
    return sendSuccess(res, steps, 'Form steps retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateFormStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const step = await formBuilderService.updateFormStep(stepId, req.body);
    return sendSuccess(res, step, 'Form step updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteFormStep = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    await formBuilderService.deleteFormStep(stepId);
    return sendSuccess(res, null, 'Form step deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderFormSteps = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { steps } = req.body;
    const result = await formBuilderService.reorderFormSteps(formId, steps);
    return sendSuccess(res, result, 'Steps reordered successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== FORM FIELDS ====================

const createFormField = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const field = await formBuilderService.createFormField(stepId, req.body);
    return sendCreated(res, field, 'Form field created successfully');
  } catch (error) {
    next(error);
  }
};

const getFormFields = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const fields = await formBuilderService.getFormFields(stepId);
    return sendSuccess(res, fields, 'Form fields retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateFormField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const field = await formBuilderService.updateFormField(fieldId, req.body);
    return sendSuccess(res, field, 'Form field updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteFormField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    await formBuilderService.deleteFormField(fieldId);
    return sendSuccess(res, null, 'Form field deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderFormFields = async (req, res, next) => {
  try {
    const { stepId } = req.params;
    const { fields } = req.body;
    const result = await formBuilderService.reorderFormFields(stepId, fields);
    return sendSuccess(res, result, 'Fields reordered successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== CONDITIONAL RULES ====================

const createConditionalRule = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const rule = await formBuilderService.createConditionalRule(formId, req.body);
    return sendCreated(res, rule, 'Conditional rule created successfully');
  } catch (error) {
    next(error);
  }
};

const getConditionalRules = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const rules = await formBuilderService.getConditionalRules(formId);
    return sendSuccess(res, rules, 'Conditional rules retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateConditionalRule = async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const rule = await formBuilderService.updateConditionalRule(ruleId, req.body);
    return sendSuccess(res, rule, 'Conditional rule updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteConditionalRule = async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    await formBuilderService.deleteConditionalRule(ruleId);
    return sendSuccess(res, null, 'Conditional rule deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== VERSIONS ====================

const publishForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { change_summary } = req.body;
    const result = await formVersionService.publishForm(id, req.user.id, change_summary);
    return sendSuccess(res, result, 'Form published successfully');
  } catch (error) {
    next(error);
  }
};

const unpublishForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formVersionService.unpublishForm(id);
    return sendSuccess(res, form, 'Form unpublished successfully');
  } catch (error) {
    next(error);
  }
};

const getFormVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const versions = await formVersionService.getFormVersions(id);
    return sendSuccess(res, versions, 'Form versions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getFormVersion = async (req, res, next) => {
  try {
    const { versionId } = req.params;
    const version = await formVersionService.getFormVersion(versionId);
    return sendSuccess(res, version, 'Form version retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const restoreFormVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;
    const form = await formVersionService.restoreFormVersion(id, versionId, req.user.id);
    return sendSuccess(res, form, 'Form restored successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== EDIT LOCKING ====================

const acquireEditLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formBuilderService.acquireEditLock(id, req.user.id);
    const lockStatus = await formBuilderService.getLockStatus(id);
    return sendSuccess(res, { form, lock: lockStatus }, 'Edit lock acquired successfully');
  } catch (error) {
    next(error);
  }
};

const releaseEditLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    await formBuilderService.releaseEditLock(id, req.user.id);
    return sendSuccess(res, null, 'Edit lock released successfully');
  } catch (error) {
    next(error);
  }
};

const refreshEditLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await formBuilderService.refreshEditLock(id, req.user.id);
    return sendSuccess(res, form, 'Edit lock refreshed successfully');
  } catch (error) {
    next(error);
  }
};

const getLockStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = await formBuilderService.getLockStatus(id);
    return sendSuccess(res, status, 'Lock status retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== AUTOSAVE ====================

const autosaveForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { session_id, form_data } = req.body;
    const result = await formBuilderService.autosaveForm(id, req.user.id, form_data);
    return sendSuccess(res, result, 'Autosave successful');
  } catch (error) {
    next(error);
  }
};

const getAutosaveData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await formBuilderService.getAutosaveData(id);
    return sendSuccess(res, data, 'Autosave data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const discardAutosave = async (req, res, next) => {
  try {
    const { id } = req.params;
    await formBuilderService.clearAutosaveData(id);
    return sendSuccess(res, null, 'Autosave data discarded successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== EDIT HISTORY ====================

const getEditHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset, session_id } = req.query;
    const history = await formBuilderService.getEditHistory(id, {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
      sessionId: session_id,
    });
    return sendSuccess(res, history, 'Edit history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getEditHistoryEntry = async (req, res, next) => {
  try {
    const { historyId } = req.params;
    const entry = await formBuilderService.getEditHistoryEntry(historyId);
    return sendSuccess(res, entry, 'History entry retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== FULL FORM OPERATIONS ====================

const saveFullFormStructure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { session_id, steps, conditional_rules } = req.body;
    const form = await formBuilderService.saveFullFormStructure(
      id,
      req.user.id,
      session_id,
      { steps, conditional_rules }
    );
    return sendSuccess(res, form, 'Form structure saved successfully');
  } catch (error) {
    next(error);
  }
};

const moveFieldToStep = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { target_step_id, target_index, session_id } = req.body;
    const field = await formBuilderService.moveFieldToStep(
      fieldId,
      target_step_id,
      target_index,
      req.user.id,
      session_id
    );
    return sendSuccess(res, field, 'Field moved successfully');
  } catch (error) {
    next(error);
  }
};

const duplicateField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { session_id } = req.body;
    const field = await formBuilderService.duplicateField(fieldId, req.user.id, session_id);
    return sendCreated(res, field, 'Field duplicated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Form Templates
  createFormTemplate,
  getFormTemplates,
  getFormTemplate,
  getFormTemplateWithStructure,
  updateFormTemplate,
  deleteFormTemplate,
  cloneFormTemplate,

  // Form Steps
  createFormStep,
  getFormSteps,
  updateFormStep,
  deleteFormStep,
  reorderFormSteps,

  // Form Fields
  createFormField,
  getFormFields,
  updateFormField,
  deleteFormField,
  reorderFormFields,

  // Conditional Rules
  createConditionalRule,
  getConditionalRules,
  updateConditionalRule,
  deleteConditionalRule,

  // Versions
  publishForm,
  unpublishForm,
  getFormVersions,
  getFormVersion,
  restoreFormVersion,

  // Edit Locking
  acquireEditLock,
  releaseEditLock,
  refreshEditLock,
  getLockStatus,

  // Autosave
  autosaveForm,
  getAutosaveData,
  discardAutosave,

  // Edit History
  getEditHistory,
  getEditHistoryEntry,

  // Full Form Operations
  saveFullFormStructure,
  moveFieldToStep,
  duplicateField,
};
