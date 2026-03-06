/**
 * Form Builder Validation Schemas
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

// Field types enum
const fieldTypes = [
  'text',
  'textarea',
  'number',
  'decimal',
  'email',
  'phone',
  'date',
  'time',
  'datetime',
  'select',
  'multi_select',
  'radio',
  'checkbox',
  'checkbox_group',
  'toggle',
  'file',
  'image',
  'signature',
  'address',
  'currency',
  'percentage',
  'url',
  'password',
  'hidden',
  'heading',
  'paragraph',
  'divider',
  'repeater',
];

// ==================== FORM TEMPLATES ====================

const createFormTemplateSchema = {
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(2000).optional().nullable(),
    will_type: z.string().max(50).optional().nullable(),
    settings: z.record(z.any()).optional(),
  }),
};

const updateFormTemplateSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    will_type: z.string().max(50).optional().nullable(),
    settings: z.record(z.any()).optional(),
  }),
};

const getFormTemplateSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const cloneFormTemplateSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(255).optional(),
  }),
};

// ==================== FORM STEPS ====================

const createFormStepSchema = {
  params: z.object({
    formId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().max(2000).optional().nullable(),
    icon: z.string().max(50).optional().nullable(),
    order_index: z.number().int().min(0).optional(),
    is_required: z.boolean().optional(),
    allow_skip: z.boolean().optional(),
    display_conditions: z.record(z.any()).optional().nullable(),
    settings: z.record(z.any()).optional(),
  }),
};

const updateFormStepSchema = {
  params: z.object({
    formId: uuidSchema,
    stepId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    icon: z.string().max(50).optional().nullable(),
    order_index: z.number().int().min(0).optional(),
    is_required: z.boolean().optional(),
    allow_skip: z.boolean().optional(),
    is_active: z.boolean().optional(),
    display_conditions: z.record(z.any()).optional().nullable(),
    settings: z.record(z.any()).optional(),
  }),
};

const reorderStepsSchema = {
  params: z.object({
    formId: uuidSchema,
  }),
  body: z.object({
    steps: z.array(
      z.object({
        id: uuidSchema,
        order_index: z.number().int().min(0),
      })
    ),
  }),
};

// ==================== FORM FIELDS ====================

const validationRulesSchema = z.object({
  required: z.boolean().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().optional(),
  customValidation: z.string().optional(),
}).passthrough();

const fieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  is_default: z.boolean().optional(),
});

const createFormFieldSchema = {
  params: z.object({
    formId: uuidSchema,
    stepId: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
    label: z.string().min(1).max(255),
    placeholder: z.string().max(255).optional().nullable(),
    help_text: z.string().max(1000).optional().nullable(),
    field_type: z.enum(fieldTypes),
    order_index: z.number().int().min(0).optional(),
    width: z.enum(['full', 'half', 'third', 'quarter', 'two-thirds', 'three-quarter']).optional(),
    is_required: z.boolean().optional(),
    validation_rules: validationRulesSchema.optional(),
    default_value: z.string().optional().nullable(),
    options: z.array(fieldOptionSchema).optional().nullable(),
    display_conditions: z.record(z.any()).optional().nullable(),
    is_system_field: z.boolean().optional(),
    legacy_table: z.string().max(100).optional().nullable(),
    legacy_column: z.string().max(100).optional().nullable(),
    settings: z.record(z.any()).optional(),
  }),
};

const updateFormFieldSchema = {
  params: z.object({
    formId: uuidSchema,
    stepId: uuidSchema,
    fieldId: uuidSchema,
  }),
  body: z.object({
    label: z.string().min(1).max(255).optional(),
    placeholder: z.string().max(255).optional().nullable(),
    help_text: z.string().max(1000).optional().nullable(),
    field_type: z.enum(fieldTypes).optional(),
    order_index: z.number().int().min(0).optional(),
    width: z.enum(['full', 'half', 'third', 'quarter', 'two-thirds', 'three-quarter']).optional(),
    is_required: z.boolean().optional(),
    validation_rules: validationRulesSchema.optional(),
    default_value: z.string().optional().nullable(),
    options: z.array(fieldOptionSchema).optional().nullable(),
    display_conditions: z.record(z.any()).optional().nullable(),
    is_active: z.boolean().optional(),
    is_read_only: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
  }),
};

const reorderFieldsSchema = {
  params: z.object({
    formId: uuidSchema,
    stepId: uuidSchema,
  }),
  body: z.object({
    fields: z.array(
      z.object({
        id: uuidSchema,
        order_index: z.number().int().min(0),
      })
    ),
  }),
};

// ==================== CONDITIONAL RULES ====================

const conditionSchema = z.object({
  field: z.string(), // field name or id
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'greater_than',
    'less_than',
    'between',
    'is_empty',
    'is_not_empty',
    'in',
    'not_in',
  ]),
  value: z.any(),
});

const createConditionalRuleSchema = {
  params: z.object({
    formId: uuidSchema,
  }),
  body: z.object({
    target_type: z.enum(['field', 'step']),
    target_id: uuidSchema,
    action: z.enum(['show', 'hide', 'require', 'set_value', 'enable', 'disable']),
    conditions: z.array(conditionSchema).min(1),
    logic_operator: z.enum(['AND', 'OR']).optional(),
    action_value: z.string().optional().nullable(),
  }),
};

const updateConditionalRuleSchema = {
  params: z.object({
    formId: uuidSchema,
    ruleId: uuidSchema,
  }),
  body: z.object({
    action: z.enum(['show', 'hide', 'require', 'set_value', 'enable', 'disable']).optional(),
    conditions: z.array(conditionSchema).min(1).optional(),
    logic_operator: z.enum(['AND', 'OR']).optional(),
    action_value: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
  }),
};

// ==================== VERSIONS ====================

const publishFormSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    change_summary: z.string().max(500).optional(),
  }),
};

const restoreVersionSchema = {
  params: z.object({
    id: uuidSchema,
    versionId: uuidSchema,
  }),
};

// ==================== AUTOSAVE ====================

const autosaveFormSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    session_id: z.string().min(1).max(100),
    form_data: z.object({
      steps: z.array(z.any()).optional(),
      conditional_rules: z.array(z.any()).optional(),
    }),
  }),
};

// ==================== EDIT HISTORY ====================

const getEditHistorySchema = {
  params: z.object({
    id: uuidSchema,
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
    session_id: z.string().max(100).optional(),
  }).optional(),
};

const getHistoryEntrySchema = {
  params: z.object({
    id: uuidSchema,
    historyId: uuidSchema,
  }),
};

// ==================== FULL FORM SAVE ====================

const fullFieldSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  placeholder: z.string().max(255).optional().nullable(),
  help_text: z.string().max(1000).optional().nullable(),
  field_type: z.enum(fieldTypes),
  order_index: z.number().int().min(0).optional(),
  width: z.enum(['full', 'half', 'third', 'quarter', 'two-thirds', 'three-quarter']).optional(),
  is_required: z.boolean().optional(),
  validation_rules: validationRulesSchema.optional(),
  default_value: z.string().optional().nullable(),
  options: z.array(fieldOptionSchema).optional().nullable(),
  display_conditions: z.record(z.any()).optional().nullable(),
  is_read_only: z.boolean().optional(),
  is_system_field: z.boolean().optional(),
  legacy_table: z.string().max(100).optional().nullable(),
  legacy_column: z.string().max(100).optional().nullable(),
  settings: z.record(z.any()).optional(),
  layout_config: z.record(z.any()).optional(),
  row_id: z.string().max(100).optional().nullable(),
  column_span: z.number().int().min(1).max(12).optional(),
});

const fullStepSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
  allow_skip: z.boolean().optional(),
  display_conditions: z.record(z.any()).optional().nullable(),
  settings: z.record(z.any()).optional(),
  fields: z.array(fullFieldSchema).optional().default([]),
});

const fullConditionalRuleSchema = z.object({
  id: uuidSchema.optional(),
  target_type: z.enum(['field', 'step']),
  target_id: uuidSchema,
  action: z.enum(['show', 'hide', 'require', 'set_value', 'enable', 'disable']),
  conditions: z.array(conditionSchema).min(1),
  logic_operator: z.enum(['AND', 'OR']).optional(),
  action_value: z.string().optional().nullable(),
});

const saveFullFormSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    session_id: z.string().min(1).max(100),
    steps: z.array(fullStepSchema),
    conditional_rules: z.array(fullConditionalRuleSchema).optional().default([]),
  }),
};

// ==================== FIELD OPERATIONS ====================

const moveFieldSchema = {
  params: z.object({
    fieldId: uuidSchema,
  }),
  body: z.object({
    target_step_id: uuidSchema,
    target_index: z.number().int().min(0),
    session_id: z.string().min(1).max(100),
  }),
};

const duplicateFieldSchema = {
  params: z.object({
    fieldId: uuidSchema,
  }),
  body: z.object({
    session_id: z.string().min(1).max(100),
  }),
};

module.exports = {
  // Form Templates
  createFormTemplateSchema,
  updateFormTemplateSchema,
  getFormTemplateSchema,
  cloneFormTemplateSchema,

  // Form Steps
  createFormStepSchema,
  updateFormStepSchema,
  reorderStepsSchema,

  // Form Fields
  createFormFieldSchema,
  updateFormFieldSchema,
  reorderFieldsSchema,

  // Conditional Rules
  createConditionalRuleSchema,
  updateConditionalRuleSchema,

  // Versions
  publishFormSchema,
  restoreVersionSchema,

  // Autosave
  autosaveFormSchema,

  // Edit History
  getEditHistorySchema,
  getHistoryEntrySchema,

  // Full Form Save
  saveFullFormSchema,

  // Field Operations
  moveFieldSchema,
  duplicateFieldSchema,
};
