/**
 * Form Builder Routes
 * Admin-only routes for managing dynamic forms
 */

const express = require('express');
const router = express.Router();
const controller = require('./form-builder.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const schemas = require('./form-builder.validation');

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin', 'super_admin']));

// ==================== FORM TEMPLATES ====================

// Create form template
router.post(
  '/',
  validate(schemas.createFormTemplateSchema),
  controller.createFormTemplate
);

// Get all form templates
router.get('/', controller.getFormTemplates);

// Get form template by ID
router.get(
  '/:id',
  validate(schemas.getFormTemplateSchema),
  controller.getFormTemplate
);

// Get form template with full structure (steps + fields)
router.get(
  '/:id/full',
  validate(schemas.getFormTemplateSchema),
  controller.getFormTemplateWithStructure
);

// Update form template
router.put(
  '/:id',
  validate(schemas.updateFormTemplateSchema),
  controller.updateFormTemplate
);

// Delete form template
router.delete(
  '/:id',
  validate(schemas.getFormTemplateSchema),
  controller.deleteFormTemplate
);

// Clone form template
router.post(
  '/:id/clone',
  validate(schemas.cloneFormTemplateSchema),
  controller.cloneFormTemplate
);

// ==================== VERSIONS ====================

// Publish form
router.post(
  '/:id/publish',
  validate(schemas.publishFormSchema),
  controller.publishForm
);

// Unpublish form
router.post(
  '/:id/unpublish',
  validate(schemas.getFormTemplateSchema),
  controller.unpublishForm
);

// Get version history
router.get(
  '/:id/versions',
  validate(schemas.getFormTemplateSchema),
  controller.getFormVersions
);

// Get specific version
router.get(
  '/:id/versions/:versionId',
  validate(schemas.restoreVersionSchema),
  controller.getFormVersion
);

// Restore to a version
router.post(
  '/:id/versions/:versionId/restore',
  validate(schemas.restoreVersionSchema),
  controller.restoreFormVersion
);

// ==================== FORM STEPS ====================

// Create step
router.post(
  '/:formId/steps',
  validate(schemas.createFormStepSchema),
  controller.createFormStep
);

// Get all steps
router.get(
  '/:formId/steps',
  controller.getFormSteps
);

// Update step
router.put(
  '/:formId/steps/:stepId',
  validate(schemas.updateFormStepSchema),
  controller.updateFormStep
);

// Delete step
router.delete(
  '/:formId/steps/:stepId',
  controller.deleteFormStep
);

// Reorder steps
router.put(
  '/:formId/steps/reorder',
  validate(schemas.reorderStepsSchema),
  controller.reorderFormSteps
);

// ==================== FORM FIELDS ====================

// Create field
router.post(
  '/:formId/steps/:stepId/fields',
  validate(schemas.createFormFieldSchema),
  controller.createFormField
);

// Get all fields for a step
router.get(
  '/:formId/steps/:stepId/fields',
  controller.getFormFields
);

// Update field
router.put(
  '/:formId/steps/:stepId/fields/:fieldId',
  validate(schemas.updateFormFieldSchema),
  controller.updateFormField
);

// Delete field
router.delete(
  '/:formId/steps/:stepId/fields/:fieldId',
  controller.deleteFormField
);

// Reorder fields
router.put(
  '/:formId/steps/:stepId/fields/reorder',
  validate(schemas.reorderFieldsSchema),
  controller.reorderFormFields
);

// ==================== CONDITIONAL RULES ====================

// Create conditional rule
router.post(
  '/:formId/rules',
  validate(schemas.createConditionalRuleSchema),
  controller.createConditionalRule
);

// Get all rules
router.get(
  '/:formId/rules',
  controller.getConditionalRules
);

// Update rule
router.put(
  '/:formId/rules/:ruleId',
  validate(schemas.updateConditionalRuleSchema),
  controller.updateConditionalRule
);

// Delete rule
router.delete(
  '/:formId/rules/:ruleId',
  controller.deleteConditionalRule
);

// ==================== EDIT LOCKING ====================

// Get lock status
router.get(
  '/:id/lock',
  validate(schemas.getFormTemplateSchema),
  controller.getLockStatus
);

// Acquire edit lock
router.post(
  '/:id/lock',
  validate(schemas.getFormTemplateSchema),
  controller.acquireEditLock
);

// Refresh edit lock (keep alive)
router.put(
  '/:id/lock',
  validate(schemas.getFormTemplateSchema),
  controller.refreshEditLock
);

// Release edit lock
router.delete(
  '/:id/lock',
  validate(schemas.getFormTemplateSchema),
  controller.releaseEditLock
);

// ==================== AUTOSAVE ====================

// Get autosave data
router.get(
  '/:id/autosave',
  validate(schemas.getFormTemplateSchema),
  controller.getAutosaveData
);

// Save autosave data
router.post(
  '/:id/autosave',
  validate(schemas.autosaveFormSchema),
  controller.autosaveForm
);

// Discard autosave data
router.delete(
  '/:id/autosave',
  validate(schemas.getFormTemplateSchema),
  controller.discardAutosave
);

// ==================== EDIT HISTORY ====================

// Get edit history
router.get(
  '/:id/history',
  validate(schemas.getEditHistorySchema),
  controller.getEditHistory
);

// Get specific history entry
router.get(
  '/:id/history/:historyId',
  validate(schemas.getHistoryEntrySchema),
  controller.getEditHistoryEntry
);

// ==================== FULL FORM OPERATIONS ====================

// Save full form structure (atomic)
router.put(
  '/:id/full',
  validate(schemas.saveFullFormSchema),
  controller.saveFullFormStructure
);

// Move field to different step
router.post(
  '/fields/:fieldId/move',
  validate(schemas.moveFieldSchema),
  controller.moveFieldToStep
);

// Duplicate field
router.post(
  '/fields/:fieldId/duplicate',
  validate(schemas.duplicateFieldSchema),
  controller.duplicateField
);

module.exports = router;
