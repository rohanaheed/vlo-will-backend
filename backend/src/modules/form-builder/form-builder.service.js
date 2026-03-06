/**
 * Form Builder Service
 * Handles CRUD operations for dynamic forms
 */

const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/errors');
const logger = require('../../utils/logger');

// ==================== FORM TEMPLATES ====================

const createFormTemplate = async (data, userId) => {
  const { name, slug, description, will_type, settings } = data;

  // Check if slug exists
  const existing = await db
    .selectFrom('form_templates')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirst();

  if (existing) {
    throw new ConflictError(`Form with slug "${slug}" already exists`);
  }

  const id = generateUUID();
  const form = await db
    .insertInto('form_templates')
    .values({
      id,
      name,
      slug,
      description,
      will_type,
      settings: settings || {},
      status: 'draft',
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  logger.info('Form template created', { formId: id, name, slug });
  return form;
};

const getFormTemplates = async (filters = {}) => {
  let query = db
    .selectFrom('form_templates')
    .selectAll()
    .orderBy('created_at', 'desc');

  if (filters.status) {
    query = query.where('status', '=', filters.status);
  }
  if (filters.will_type) {
    query = query.where('will_type', '=', filters.will_type);
  }

  return await query.execute();
};

const getFormTemplateById = async (id) => {
  const form = await db
    .selectFrom('form_templates')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!form) {
    throw new NotFoundError('Form template');
  }

  return form;
};

const getFormTemplateBySlug = async (slug) => {
  const form = await db
    .selectFrom('form_templates')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst();

  if (!form) {
    throw new NotFoundError('Form template');
  }

  return form;
};

const getFormTemplateWithStructure = async (id) => {
  const form = await getFormTemplateById(id);

  // Get steps with fields
  const steps = await db
    .selectFrom('form_steps')
    .selectAll()
    .where('form_template_id', '=', id)
    .where('is_active', '=', true)
    .orderBy('order_index', 'asc')
    .execute();

  // Get fields for each step
  const stepsWithFields = await Promise.all(
    steps.map(async (step) => {
      const fields = await db
        .selectFrom('form_fields')
        .selectAll()
        .where('form_step_id', '=', step.id)
        .where('is_active', '=', true)
        .orderBy('order_index', 'asc')
        .execute();

      return { ...step, fields };
    })
  );

  // Get conditional rules
  const conditionalRules = await db
    .selectFrom('form_conditional_rules')
    .selectAll()
    .where('form_template_id', '=', id)
    .where('is_active', '=', true)
    .execute();

  return {
    ...form,
    steps: stepsWithFields,
    conditional_rules: conditionalRules,
  };
};

const updateFormTemplate = async (id, data) => {
  await getFormTemplateById(id); // Ensure exists

  const { name, description, will_type, settings } = data;

  const updated = await db
    .updateTable('form_templates')
    .set({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(will_type && { will_type }),
      ...(settings && { settings }),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  logger.info('Form template updated', { formId: id });
  return updated;
};

const deleteFormTemplate = async (id) => {
  const form = await getFormTemplateById(id);

  // Check if form has any will responses
  const hasResponses = await db
    .selectFrom('wills')
    .select('id')
    .where('form_template_id', '=', id)
    .executeTakeFirst();

  if (hasResponses) {
    throw new BadRequestError('Cannot delete form template that has been used. Archive it instead.');
  }

  await db.deleteFrom('form_templates').where('id', '=', id).execute();
  logger.info('Form template deleted', { formId: id });
  return { success: true };
};

const cloneFormTemplate = async (id, newSlug, newName, userId) => {
  const original = await getFormTemplateWithStructure(id);

  // Create new form
  const newForm = await createFormTemplate(
    {
      name: newName || `${original.name} (Copy)`,
      slug: newSlug,
      description: original.description,
      will_type: original.will_type,
      settings: original.settings,
    },
    userId
  );

  // Clone steps and fields
  for (const step of original.steps) {
    const newStep = await createFormStep(newForm.id, {
      name: step.name,
      slug: step.slug,
      description: step.description,
      icon: step.icon,
      order_index: step.order_index,
      is_required: step.is_required,
      allow_skip: step.allow_skip,
      display_conditions: step.display_conditions,
      settings: step.settings,
    });

    // Clone fields
    for (const field of step.fields) {
      await createFormField(newStep.id, {
        name: field.name,
        label: field.label,
        placeholder: field.placeholder,
        help_text: field.help_text,
        field_type: field.field_type,
        order_index: field.order_index,
        width: field.width,
        is_required: field.is_required,
        validation_rules: field.validation_rules,
        default_value: field.default_value,
        options: field.options,
        display_conditions: field.display_conditions,
        is_system_field: field.is_system_field,
        legacy_table: field.legacy_table,
        legacy_column: field.legacy_column,
        settings: field.settings,
      });
    }
  }

  logger.info('Form template cloned', { originalId: id, newId: newForm.id });
  return await getFormTemplateWithStructure(newForm.id);
};

// ==================== FORM STEPS ====================

const createFormStep = async (formTemplateId, data) => {
  await getFormTemplateById(formTemplateId);

  const {
    name,
    slug,
    description,
    icon,
    order_index,
    is_required,
    allow_skip,
    display_conditions,
    settings,
  } = data;

  // Check if slug exists in this form
  const existing = await db
    .selectFrom('form_steps')
    .select('id')
    .where('form_template_id', '=', formTemplateId)
    .where('slug', '=', slug)
    .executeTakeFirst();

  if (existing) {
    throw new ConflictError(`Step with slug "${slug}" already exists in this form`);
  }

  // Get max order_index if not provided
  let finalOrderIndex = order_index;
  if (finalOrderIndex === undefined) {
    const maxOrder = await db
      .selectFrom('form_steps')
      .select(db.fn.max('order_index').as('max_order'))
      .where('form_template_id', '=', formTemplateId)
      .executeTakeFirst();
    finalOrderIndex = (maxOrder?.max_order || 0) + 1;
  }

  const id = generateUUID();
  const step = await db
    .insertInto('form_steps')
    .values({
      id,
      form_template_id: formTemplateId,
      name,
      slug,
      description,
      icon,
      order_index: finalOrderIndex,
      is_required: is_required ?? true,
      allow_skip: allow_skip ?? false,
      display_conditions,
      settings: settings || {},
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  logger.info('Form step created', { stepId: id, formId: formTemplateId, name });
  return step;
};

const getFormSteps = async (formTemplateId) => {
  return await db
    .selectFrom('form_steps')
    .selectAll()
    .where('form_template_id', '=', formTemplateId)
    .where('is_active', '=', true)
    .orderBy('order_index', 'asc')
    .execute();
};

const getFormStepById = async (stepId) => {
  const step = await db
    .selectFrom('form_steps')
    .selectAll()
    .where('id', '=', stepId)
    .executeTakeFirst();

  if (!step) {
    throw new NotFoundError('Form step');
  }

  return step;
};

const updateFormStep = async (stepId, data) => {
  await getFormStepById(stepId);

  const updated = await db
    .updateTable('form_steps')
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where('id', '=', stepId)
    .returningAll()
    .executeTakeFirst();

  logger.info('Form step updated', { stepId });
  return updated;
};

const deleteFormStep = async (stepId) => {
  await getFormStepById(stepId);

  // Soft delete by setting is_active = false
  await db
    .updateTable('form_steps')
    .set({ is_active: false, updated_at: new Date() })
    .where('id', '=', stepId)
    .execute();

  logger.info('Form step deleted', { stepId });
  return { success: true };
};

const reorderFormSteps = async (formTemplateId, stepOrders) => {
  // stepOrders = [{ id: 'step-id', order_index: 1 }, ...]
  await db.transaction().execute(async (trx) => {
    for (const { id, order_index } of stepOrders) {
      await trx
        .updateTable('form_steps')
        .set({ order_index, updated_at: new Date() })
        .where('id', '=', id)
        .where('form_template_id', '=', formTemplateId)
        .execute();
    }
  });

  logger.info('Form steps reordered', { formId: formTemplateId });
  return await getFormSteps(formTemplateId);
};

// ==================== FORM FIELDS ====================

const createFormField = async (stepId, data) => {
  await getFormStepById(stepId);

  const {
    name,
    label,
    placeholder,
    help_text,
    field_type,
    order_index,
    width,
    is_required,
    validation_rules,
    default_value,
    options,
    display_conditions,
    is_system_field,
    legacy_table,
    legacy_column,
    settings,
  } = data;

  // Check if name exists in this step
  const existing = await db
    .selectFrom('form_fields')
    .select('id')
    .where('form_step_id', '=', stepId)
    .where('name', '=', name)
    .executeTakeFirst();

  if (existing) {
    throw new ConflictError(`Field with name "${name}" already exists in this step`);
  }

  // Get max order_index if not provided
  let finalOrderIndex = order_index;
  if (finalOrderIndex === undefined) {
    const maxOrder = await db
      .selectFrom('form_fields')
      .select(db.fn.max('order_index').as('max_order'))
      .where('form_step_id', '=', stepId)
      .executeTakeFirst();
    finalOrderIndex = (maxOrder?.max_order || 0) + 1;
  }

  const id = generateUUID();
  const field = await db
    .insertInto('form_fields')
    .values({
      id,
      form_step_id: stepId,
      name,
      label,
      placeholder,
      help_text,
      field_type,
      order_index: finalOrderIndex,
      width: width || 'full',
      is_required: is_required ?? false,
      validation_rules: validation_rules || {},
      default_value,
      options,
      display_conditions,
      is_active: true,
      is_read_only: false,
      is_system_field: is_system_field ?? false,
      legacy_table,
      legacy_column,
      settings: settings || {},
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  logger.info('Form field created', { fieldId: id, stepId, name, field_type });
  return field;
};

const getFormFields = async (stepId) => {
  return await db
    .selectFrom('form_fields')
    .selectAll()
    .where('form_step_id', '=', stepId)
    .where('is_active', '=', true)
    .orderBy('order_index', 'asc')
    .execute();
};

const getFormFieldById = async (fieldId) => {
  const field = await db
    .selectFrom('form_fields')
    .selectAll()
    .where('id', '=', fieldId)
    .executeTakeFirst();

  if (!field) {
    throw new NotFoundError('Form field');
  }

  return field;
};

const updateFormField = async (fieldId, data) => {
  await getFormFieldById(fieldId);

  const updated = await db
    .updateTable('form_fields')
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where('id', '=', fieldId)
    .returningAll()
    .executeTakeFirst();

  logger.info('Form field updated', { fieldId });
  return updated;
};

const deleteFormField = async (fieldId) => {
  const field = await getFormFieldById(fieldId);

  if (field.is_system_field) {
    throw new BadRequestError('Cannot delete system field');
  }

  // Soft delete
  await db
    .updateTable('form_fields')
    .set({ is_active: false, updated_at: new Date() })
    .where('id', '=', fieldId)
    .execute();

  logger.info('Form field deleted', { fieldId });
  return { success: true };
};

const reorderFormFields = async (stepId, fieldOrders) => {
  await db.transaction().execute(async (trx) => {
    for (const { id, order_index } of fieldOrders) {
      await trx
        .updateTable('form_fields')
        .set({ order_index, updated_at: new Date() })
        .where('id', '=', id)
        .where('form_step_id', '=', stepId)
        .execute();
    }
  });

  logger.info('Form fields reordered', { stepId });
  return await getFormFields(stepId);
};

// ==================== FIELD OPTIONS ====================

const createFieldOption = async (fieldId, data) => {
  await getFormFieldById(fieldId);

  const { value, label, order_index, is_default, parent_option_id, metadata } = data;

  // Get max order_index if not provided
  let finalOrderIndex = order_index;
  if (finalOrderIndex === undefined) {
    const maxOrder = await db
      .selectFrom('form_field_options')
      .select(db.fn.max('order_index').as('max_order'))
      .where('form_field_id', '=', fieldId)
      .executeTakeFirst();
    finalOrderIndex = (maxOrder?.max_order || 0) + 1;
  }

  const id = generateUUID();
  const option = await db
    .insertInto('form_field_options')
    .values({
      id,
      form_field_id: fieldId,
      value,
      label,
      order_index: finalOrderIndex,
      is_default: is_default ?? false,
      parent_option_id,
      metadata: metadata || {},
      created_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return option;
};

const getFieldOptions = async (fieldId) => {
  return await db
    .selectFrom('form_field_options')
    .selectAll()
    .where('form_field_id', '=', fieldId)
    .orderBy('order_index', 'asc')
    .execute();
};

const updateFieldOption = async (optionId, data) => {
  const updated = await db
    .updateTable('form_field_options')
    .set(data)
    .where('id', '=', optionId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    throw new NotFoundError('Field option');
  }

  return updated;
};

const deleteFieldOption = async (optionId) => {
  await db.deleteFrom('form_field_options').where('id', '=', optionId).execute();
  return { success: true };
};

// ==================== CONDITIONAL RULES ====================

const createConditionalRule = async (formTemplateId, data) => {
  const { target_type, target_id, action, conditions, logic_operator, action_value } = data;

  const id = generateUUID();
  const rule = await db
    .insertInto('form_conditional_rules')
    .values({
      id,
      form_template_id: formTemplateId,
      target_type,
      target_id,
      action,
      conditions,
      logic_operator: logic_operator || 'AND',
      action_value,
      is_active: true,
      order_index: 0,
      created_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  logger.info('Conditional rule created', { ruleId: id, formId: formTemplateId });
  return rule;
};

const getConditionalRules = async (formTemplateId) => {
  return await db
    .selectFrom('form_conditional_rules')
    .selectAll()
    .where('form_template_id', '=', formTemplateId)
    .where('is_active', '=', true)
    .execute();
};

const updateConditionalRule = async (ruleId, data) => {
  const updated = await db
    .updateTable('form_conditional_rules')
    .set(data)
    .where('id', '=', ruleId)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    throw new NotFoundError('Conditional rule');
  }

  return updated;
};

const deleteConditionalRule = async (ruleId) => {
  await db
    .updateTable('form_conditional_rules')
    .set({ is_active: false })
    .where('id', '=', ruleId)
    .execute();
  return { success: true };
};

// ==================== EDIT LOCKING ====================

const LOCK_TIMEOUT_MINUTES = 30;

const acquireEditLock = async (formTemplateId, userId) => {
  const form = await getFormTemplateById(formTemplateId);

  // Check if already locked by another user
  if (form.locked_by && form.locked_by !== userId) {
    const lockAge = form.locked_at
      ? (Date.now() - new Date(form.locked_at).getTime()) / 1000 / 60
      : 0;

    // If lock is still valid (not expired)
    if (lockAge < LOCK_TIMEOUT_MINUTES) {
      // Get the locking user's info
      const lockingUser = await db
        .selectFrom('users')
        .select(['id', 'email', 'name'])
        .where('id', '=', form.locked_by)
        .executeTakeFirst();

      throw new ConflictError(
        `Form is currently being edited by ${lockingUser?.name || lockingUser?.email || 'another user'}. ` +
        `Lock expires in ${Math.ceil(LOCK_TIMEOUT_MINUTES - lockAge)} minutes.`
      );
    }
  }

  // Acquire or refresh lock
  const updated = await db
    .updateTable('form_templates')
    .set({
      locked_by: userId,
      locked_at: new Date(),
      updated_at: new Date(),
    })
    .where('id', '=', formTemplateId)
    .returningAll()
    .executeTakeFirst();

  logger.info('Edit lock acquired', { formId: formTemplateId, userId });
  return updated;
};

const releaseEditLock = async (formTemplateId, userId) => {
  const form = await getFormTemplateById(formTemplateId);

  // Only the lock owner can release it
  if (form.locked_by && form.locked_by !== userId) {
    throw new BadRequestError('You do not own the edit lock on this form');
  }

  const updated = await db
    .updateTable('form_templates')
    .set({
      locked_by: null,
      locked_at: null,
      updated_at: new Date(),
    })
    .where('id', '=', formTemplateId)
    .returningAll()
    .executeTakeFirst();

  logger.info('Edit lock released', { formId: formTemplateId, userId });
  return updated;
};

const refreshEditLock = async (formTemplateId, userId) => {
  const form = await getFormTemplateById(formTemplateId);

  if (form.locked_by !== userId) {
    throw new BadRequestError('You do not own the edit lock on this form');
  }

  const updated = await db
    .updateTable('form_templates')
    .set({
      locked_at: new Date(),
    })
    .where('id', '=', formTemplateId)
    .returningAll()
    .executeTakeFirst();

  return updated;
};

const getLockStatus = async (formTemplateId) => {
  const form = await getFormTemplateById(formTemplateId);

  if (!form.locked_by) {
    return { is_locked: false };
  }

  const lockAge = form.locked_at
    ? (Date.now() - new Date(form.locked_at).getTime()) / 1000 / 60
    : 0;

  const isExpired = lockAge >= LOCK_TIMEOUT_MINUTES;

  if (isExpired) {
    return { is_locked: false, expired: true };
  }

  const lockingUser = await db
    .selectFrom('users')
    .select(['id', 'email', 'name'])
    .where('id', '=', form.locked_by)
    .executeTakeFirst();

  return {
    is_locked: true,
    locked_by: {
      id: lockingUser?.id,
      name: lockingUser?.name,
      email: lockingUser?.email,
    },
    locked_at: form.locked_at,
    expires_in_minutes: Math.ceil(LOCK_TIMEOUT_MINUTES - lockAge),
  };
};

// ==================== AUTOSAVE ====================

const autosaveForm = async (formTemplateId, userId, formData) => {
  const form = await getFormTemplateById(formTemplateId);

  // Verify lock ownership
  if (form.locked_by !== userId) {
    throw new BadRequestError('You must have an edit lock to autosave');
  }

  const updated = await db
    .updateTable('form_templates')
    .set({
      autosave_data: formData,
      last_autosave_at: new Date(),
      locked_at: new Date(), // Refresh lock on autosave
    })
    .where('id', '=', formTemplateId)
    .returningAll()
    .executeTakeFirst();

  logger.debug('Form autosaved', { formId: formTemplateId });
  return {
    last_autosave_at: updated.last_autosave_at,
    success: true,
  };
};

const getAutosaveData = async (formTemplateId) => {
  const form = await getFormTemplateById(formTemplateId);
  return {
    autosave_data: form.autosave_data,
    last_autosave_at: form.last_autosave_at,
  };
};

const clearAutosaveData = async (formTemplateId) => {
  await db
    .updateTable('form_templates')
    .set({
      autosave_data: null,
      last_autosave_at: null,
    })
    .where('id', '=', formTemplateId)
    .execute();
};

// ==================== EDIT HISTORY ====================

const recordEditHistory = async (formTemplateId, userId, sessionId, action, entityType, entityId, beforeState, afterState, metadata = {}) => {
  const id = generateUUID();

  await db
    .insertInto('form_edit_history')
    .values({
      id,
      form_template_id: formTemplateId,
      user_id: userId,
      session_id: sessionId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_state: beforeState,
      after_state: afterState,
      metadata,
      created_at: new Date(),
    })
    .execute();

  return id;
};

const getEditHistory = async (formTemplateId, options = {}) => {
  const { limit = 100, sessionId, offset = 0 } = options;

  let query = db
    .selectFrom('form_edit_history')
    .leftJoin('users', 'form_edit_history.user_id', 'users.id')
    .select([
      'form_edit_history.id',
      'form_edit_history.form_template_id',
      'form_edit_history.user_id',
      'form_edit_history.session_id',
      'form_edit_history.action',
      'form_edit_history.entity_type',
      'form_edit_history.entity_id',
      'form_edit_history.before_state',
      'form_edit_history.after_state',
      'form_edit_history.metadata',
      'form_edit_history.created_at',
      'users.name as user_name',
      'users.email as user_email',
    ])
    .where('form_edit_history.form_template_id', '=', formTemplateId)
    .orderBy('form_edit_history.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  if (sessionId) {
    query = query.where('form_edit_history.session_id', '=', sessionId);
  }

  return await query.execute();
};

const getEditHistoryEntry = async (historyId) => {
  const entry = await db
    .selectFrom('form_edit_history')
    .selectAll()
    .where('id', '=', historyId)
    .executeTakeFirst();

  if (!entry) {
    throw new NotFoundError('History entry');
  }

  return entry;
};

const clearSessionHistory = async (formTemplateId, sessionId) => {
  await db
    .deleteFrom('form_edit_history')
    .where('form_template_id', '=', formTemplateId)
    .where('session_id', '=', sessionId)
    .execute();
};

// ==================== FULL FORM SAVE (ATOMIC) ====================

const saveFullFormStructure = async (formTemplateId, userId, sessionId, formData) => {
  const { steps, conditional_rules } = formData;

  // Verify ownership of edit lock
  const form = await getFormTemplateById(formTemplateId);
  if (form.locked_by && form.locked_by !== userId) {
    throw new BadRequestError('You must have an edit lock to save changes');
  }

  // Get current state for history
  const beforeState = await getFormTemplateWithStructure(formTemplateId);

  await db.transaction().execute(async (trx) => {
    // Get existing step IDs
    const existingSteps = await trx
      .selectFrom('form_steps')
      .select(['id', 'slug'])
      .where('form_template_id', '=', formTemplateId)
      .execute();
    const existingStepIds = new Set(existingSteps.map((s) => s.id));

    // Track which steps are in the incoming data
    const incomingStepIds = new Set();

    // Process steps
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const stepData = steps[stepIndex];
      let stepId = stepData.id;

      // Check if this is an existing step or new
      if (stepId && existingStepIds.has(stepId)) {
        // Update existing step
        await trx
          .updateTable('form_steps')
          .set({
            name: stepData.name,
            slug: stepData.slug,
            description: stepData.description,
            icon: stepData.icon,
            order_index: stepIndex + 1,
            is_required: stepData.is_required ?? true,
            allow_skip: stepData.allow_skip ?? false,
            display_conditions: stepData.display_conditions,
            settings: stepData.settings || {},
            is_active: true,
            updated_at: new Date(),
          })
          .where('id', '=', stepId)
          .execute();
        incomingStepIds.add(stepId);
      } else {
        // Create new step
        stepId = generateUUID();
        await trx
          .insertInto('form_steps')
          .values({
            id: stepId,
            form_template_id: formTemplateId,
            name: stepData.name,
            slug: stepData.slug,
            description: stepData.description,
            icon: stepData.icon,
            order_index: stepIndex + 1,
            is_required: stepData.is_required ?? true,
            allow_skip: stepData.allow_skip ?? false,
            display_conditions: stepData.display_conditions,
            settings: stepData.settings || {},
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
        incomingStepIds.add(stepId);
      }

      // Process fields for this step
      if (stepData.fields && stepData.fields.length > 0) {
        const existingFields = await trx
          .selectFrom('form_fields')
          .select(['id', 'name'])
          .where('form_step_id', '=', stepId)
          .execute();
        const existingFieldIds = new Set(existingFields.map((f) => f.id));
        const incomingFieldIds = new Set();

        for (let fieldIndex = 0; fieldIndex < stepData.fields.length; fieldIndex++) {
          const fieldData = stepData.fields[fieldIndex];
          let fieldId = fieldData.id;

          if (fieldId && existingFieldIds.has(fieldId)) {
            // Update existing field
            await trx
              .updateTable('form_fields')
              .set({
                name: fieldData.name,
                label: fieldData.label,
                placeholder: fieldData.placeholder,
                help_text: fieldData.help_text,
                field_type: fieldData.field_type,
                order_index: fieldIndex + 1,
                width: fieldData.width || 'full',
                is_required: fieldData.is_required ?? false,
                validation_rules: fieldData.validation_rules || {},
                default_value: fieldData.default_value,
                options: fieldData.options,
                display_conditions: fieldData.display_conditions,
                is_active: true,
                is_read_only: fieldData.is_read_only ?? false,
                is_system_field: fieldData.is_system_field ?? false,
                legacy_table: fieldData.legacy_table,
                legacy_column: fieldData.legacy_column,
                settings: fieldData.settings || {},
                layout_config: fieldData.layout_config || {},
                row_id: fieldData.row_id,
                column_span: fieldData.column_span ?? 12,
                updated_at: new Date(),
              })
              .where('id', '=', fieldId)
              .execute();
            incomingFieldIds.add(fieldId);
          } else {
            // Create new field
            fieldId = generateUUID();
            await trx
              .insertInto('form_fields')
              .values({
                id: fieldId,
                form_step_id: stepId,
                name: fieldData.name,
                label: fieldData.label,
                placeholder: fieldData.placeholder,
                help_text: fieldData.help_text,
                field_type: fieldData.field_type,
                order_index: fieldIndex + 1,
                width: fieldData.width || 'full',
                is_required: fieldData.is_required ?? false,
                validation_rules: fieldData.validation_rules || {},
                default_value: fieldData.default_value,
                options: fieldData.options,
                display_conditions: fieldData.display_conditions,
                is_active: true,
                is_read_only: fieldData.is_read_only ?? false,
                is_system_field: fieldData.is_system_field ?? false,
                legacy_table: fieldData.legacy_table,
                legacy_column: fieldData.legacy_column,
                settings: fieldData.settings || {},
                layout_config: fieldData.layout_config || {},
                row_id: fieldData.row_id,
                column_span: fieldData.column_span ?? 12,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .execute();
            incomingFieldIds.add(fieldId);
          }
        }

        // Soft-delete fields not in incoming data
        for (const existingFieldId of existingFieldIds) {
          if (!incomingFieldIds.has(existingFieldId)) {
            await trx
              .updateTable('form_fields')
              .set({ is_active: false, updated_at: new Date() })
              .where('id', '=', existingFieldId)
              .execute();
          }
        }
      }
    }

    // Soft-delete steps not in incoming data
    for (const existingStepId of existingStepIds) {
      if (!incomingStepIds.has(existingStepId)) {
        await trx
          .updateTable('form_steps')
          .set({ is_active: false, updated_at: new Date() })
          .where('id', '=', existingStepId)
          .execute();
      }
    }

    // Handle conditional rules
    if (conditional_rules !== undefined) {
      // Deactivate all existing rules
      await trx
        .updateTable('form_conditional_rules')
        .set({ is_active: false })
        .where('form_template_id', '=', formTemplateId)
        .execute();

      // Create/update incoming rules
      for (const ruleData of conditional_rules) {
        if (ruleData.id) {
          await trx
            .updateTable('form_conditional_rules')
            .set({
              target_type: ruleData.target_type,
              target_id: ruleData.target_id,
              action: ruleData.action,
              conditions: ruleData.conditions,
              logic_operator: ruleData.logic_operator || 'AND',
              action_value: ruleData.action_value,
              is_active: true,
            })
            .where('id', '=', ruleData.id)
            .execute();
        } else {
          await trx
            .insertInto('form_conditional_rules')
            .values({
              id: generateUUID(),
              form_template_id: formTemplateId,
              target_type: ruleData.target_type,
              target_id: ruleData.target_id,
              action: ruleData.action,
              conditions: ruleData.conditions,
              logic_operator: ruleData.logic_operator || 'AND',
              action_value: ruleData.action_value,
              is_active: true,
              order_index: 0,
              created_at: new Date(),
            })
            .execute();
        }
      }
    }

    // Update form template timestamp and clear autosave
    await trx
      .updateTable('form_templates')
      .set({
        updated_at: new Date(),
        autosave_data: null,
        last_autosave_at: null,
        locked_at: new Date(), // Refresh lock
      })
      .where('id', '=', formTemplateId)
      .execute();
  });

  // Record history
  const afterState = await getFormTemplateWithStructure(formTemplateId);
  await recordEditHistory(
    formTemplateId,
    userId,
    sessionId,
    'full_save',
    'form',
    formTemplateId,
    beforeState,
    afterState,
    { step_count: steps.length }
  );

  logger.info('Full form structure saved', {
    formId: formTemplateId,
    userId,
    stepCount: steps.length,
  });

  return afterState;
};

// ==================== MOVE FIELD BETWEEN STEPS ====================

const moveFieldToStep = async (fieldId, targetStepId, targetIndex, userId, sessionId) => {
  const field = await getFormFieldById(fieldId);
  const targetStep = await getFormStepById(targetStepId);

  const beforeState = { ...field };

  // Update field to new step and order
  const updated = await db
    .updateTable('form_fields')
    .set({
      form_step_id: targetStepId,
      order_index: targetIndex,
      updated_at: new Date(),
    })
    .where('id', '=', fieldId)
    .returningAll()
    .executeTakeFirst();

  // Record history
  await recordEditHistory(
    targetStep.form_template_id,
    userId,
    sessionId,
    'move_field',
    'field',
    fieldId,
    beforeState,
    updated,
    { target_step_id: targetStepId, target_index: targetIndex }
  );

  return updated;
};

// ==================== DUPLICATE FIELD ====================

const duplicateField = async (fieldId, userId, sessionId) => {
  const original = await getFormFieldById(fieldId);
  const step = await getFormStepById(original.form_step_id);

  const newId = generateUUID();
  const newField = await db
    .insertInto('form_fields')
    .values({
      id: newId,
      form_step_id: original.form_step_id,
      name: `${original.name}_copy`,
      label: `${original.label} (Copy)`,
      placeholder: original.placeholder,
      help_text: original.help_text,
      field_type: original.field_type,
      order_index: original.order_index + 1,
      width: original.width,
      is_required: original.is_required,
      validation_rules: original.validation_rules,
      default_value: original.default_value,
      options: original.options,
      display_conditions: original.display_conditions,
      is_active: true,
      is_read_only: original.is_read_only,
      is_system_field: false,
      legacy_table: null,
      legacy_column: null,
      settings: original.settings,
      layout_config: original.layout_config,
      row_id: original.row_id,
      column_span: original.column_span,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  // Record history
  await recordEditHistory(
    step.form_template_id,
    userId,
    sessionId,
    'duplicate_field',
    'field',
    newId,
    null,
    newField,
    { original_field_id: fieldId }
  );

  logger.info('Field duplicated', { originalId: fieldId, newId });
  return newField;
};

module.exports = {
  // Form Templates
  createFormTemplate,
  getFormTemplates,
  getFormTemplateById,
  getFormTemplateBySlug,
  getFormTemplateWithStructure,
  updateFormTemplate,
  deleteFormTemplate,
  cloneFormTemplate,

  // Form Steps
  createFormStep,
  getFormSteps,
  getFormStepById,
  updateFormStep,
  deleteFormStep,
  reorderFormSteps,

  // Form Fields
  createFormField,
  getFormFields,
  getFormFieldById,
  updateFormField,
  deleteFormField,
  reorderFormFields,

  // Field Options
  createFieldOption,
  getFieldOptions,
  updateFieldOption,
  deleteFieldOption,

  // Conditional Rules
  createConditionalRule,
  getConditionalRules,
  updateConditionalRule,
  deleteConditionalRule,

  // Edit Locking
  acquireEditLock,
  releaseEditLock,
  refreshEditLock,
  getLockStatus,

  // Autosave
  autosaveForm,
  getAutosaveData,
  clearAutosaveData,

  // Edit History
  recordEditHistory,
  getEditHistory,
  getEditHistoryEntry,
  clearSessionHistory,

  // Full Form Operations
  saveFullFormStructure,
  moveFieldToStep,
  duplicateField,
};
