/**
 * Form Response Service
 * Handles user-side form data saving and retrieval
 * Includes legacy table mapping for backward compatibility
 */

const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const formVersionService = require('./form-version.service');

/**
 * Get the dynamic form structure for a will
 */
const getFormForWill = async (willId) => {
  const will = await db
    .selectFrom('wills')
    .select(['id', 'form_template_id', 'form_version_id', 'will_type'])
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError('Will');
  }

  // If will has a specific version locked, use that
  if (will.form_version_id) {
    const version = await formVersionService.getFormVersion(will.form_version_id);
    return {
      form_id: will.form_template_id,
      version_id: version.id,
      version_number: version.version_number,
      ...version.snapshot,
    };
  }

  // If will has a template assigned, get the published version
  if (will.form_template_id) {
    const version = await formVersionService.getPublishedFormVersion(will.form_template_id);
    return {
      form_id: will.form_template_id,
      version_id: version.id,
      version_number: version.version_number,
      ...version.snapshot,
    };
  }

  // Otherwise, get form by will type
  const slug = will.will_type === 'islamic' ? 'islamic-will' : 'general-will';
  return await formVersionService.getPublishedFormBySlug(slug);
};

/**
 * Get all step responses for a will
 */
const getWillResponses = async (willId) => {
  return await db
    .selectFrom('will_responses')
    .selectAll()
    .where('will_id', '=', willId)
    .execute();
};

/**
 * Get response for a specific step
 */
const getStepResponse = async (willId, stepSlug) => {
  const response = await db
    .selectFrom('will_responses')
    .leftJoin('form_steps', 'will_responses.form_step_id', 'form_steps.id')
    .select([
      'will_responses.id',
      'will_responses.will_id',
      'will_responses.form_step_id',
      'will_responses.step_slug',
      'will_responses.data',
      'will_responses.is_complete',
      'will_responses.created_at',
      'will_responses.updated_at',
    ])
    .where('will_responses.will_id', '=', willId)
    .where((eb) =>
      eb.or([
        eb('will_responses.step_slug', '=', stepSlug),
        eb('form_steps.slug', '=', stepSlug),
      ])
    )
    .executeTakeFirst();

  return response;
};

/**
 * Save response for a step (creates or updates)
 */
const saveStepResponse = async (willId, stepSlug, data, isComplete = false) => {
  // Get form structure to find step
  const form = await getFormForWill(willId);
  const step = form.steps.find((s) => s.slug === stepSlug);

  if (!step) {
    throw new BadRequestError(`Step "${stepSlug}" not found in form`);
  }

  // Validate data against step fields
  const validatedData = validateStepData(step, data);

  // Check if response exists
  const existing = await getStepResponse(willId, stepSlug);

  let response;
  if (existing) {
    // Update existing response
    response = await db
      .updateTable('will_responses')
      .set({
        data: validatedData,
        is_complete: isComplete,
        updated_at: new Date(),
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();
  } else {
    // Create new response
    const id = generateUUID();
    response = await db
      .insertInto('will_responses')
      .values({
        id,
        will_id: willId,
        form_step_id: step.id,
        form_version_id: form.version_id,
        step_slug: stepSlug,
        data: validatedData,
        is_complete: isComplete,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();
  }

  // Write to legacy tables if configured
  await writeLegacyData(willId, step, validatedData);

  logger.info('Step response saved', { willId, stepSlug, isComplete });
  return response;
};

/**
 * Validate step data against field definitions
 */
const validateStepData = (step, data) => {
  const validated = {};
  const errors = [];

  for (const field of step.fields) {
    const value = data[field.name];

    // Check required
    if (field.is_required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`);
      continue;
    }

    // Skip validation if no value
    if (value === undefined || value === null) {
      continue;
    }

    // Type-specific validation
    const rules = field.validation_rules || {};

    switch (field.field_type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field.label} must be a valid email`);
        }
        break;

      case 'number':
      case 'decimal':
      case 'currency':
      case 'percentage':
        if (value !== '' && isNaN(Number(value))) {
          errors.push(`${field.label} must be a number`);
        } else {
          if (rules.min !== undefined && Number(value) < rules.min) {
            errors.push(`${field.label} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && Number(value) > rules.max) {
            errors.push(`${field.label} must be at most ${rules.max}`);
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field.label} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field.label} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            errors.push(rules.patternMessage || `${field.label} is invalid`);
          }
        }
        break;

      case 'date':
        if (value && isNaN(Date.parse(value))) {
          errors.push(`${field.label} must be a valid date`);
        }
        break;

      case 'select':
      case 'radio':
        if (value && field.options) {
          const validValues = field.options.map((o) => o.value);
          if (!validValues.includes(value)) {
            errors.push(`${field.label} has an invalid option`);
          }
        }
        break;

      case 'multi_select':
      case 'checkbox_group':
        if (Array.isArray(value) && field.options) {
          const validValues = field.options.map((o) => o.value);
          for (const v of value) {
            if (!validValues.includes(v)) {
              errors.push(`${field.label} contains an invalid option`);
              break;
            }
          }
        }
        break;
    }

    validated[field.name] = value;
  }

  if (errors.length > 0) {
    throw new BadRequestError(errors.join(', '));
  }

  return validated;
};

/**
 * Write data to legacy tables for backward compatibility
 */
const writeLegacyData = async (willId, step, data) => {
  // Group fields by legacy_table
  const tableGroups = {};

  for (const field of step.fields) {
    if (field.legacy_table && field.legacy_column) {
      const value = data[field.name];
      if (value !== undefined && value !== null) {
        if (!tableGroups[field.legacy_table]) {
          tableGroups[field.legacy_table] = {};
        }
        tableGroups[field.legacy_table][field.legacy_column] = value;
      }
    }
  }

  // Write to each legacy table
  for (const [tableName, columns] of Object.entries(tableGroups)) {
    try {
      // Check if record exists
      const existing = await db
        .selectFrom(tableName)
        .select('id')
        .where('will_id', '=', willId)
        .executeTakeFirst();

      if (existing) {
        await db
          .updateTable(tableName)
          .set({
            ...columns,
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .execute();
      } else {
        await db
          .insertInto(tableName)
          .values({
            id: generateUUID(),
            will_id: willId,
            ...columns,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      }

      logger.debug('Legacy table updated', { willId, tableName });
    } catch (error) {
      logger.warn('Failed to write to legacy table', {
        willId,
        tableName,
        error: error.message,
      });
    }
  }
};

/**
 * Get progress for all steps
 */
const getWillProgress = async (willId) => {
  const form = await getFormForWill(willId);
  const responses = await getWillResponses(willId);

  const responseMap = {};
  for (const r of responses) {
    responseMap[r.step_slug] = r;
  }

  const progress = form.steps.map((step, index) => {
    const response = responseMap[step.slug];
    return {
      step_number: index + 1,
      slug: step.slug,
      name: step.name,
      is_complete: response?.is_complete || false,
      has_data: !!response,
    };
  });

  const completedCount = progress.filter((p) => p.is_complete).length;

  return {
    total_steps: form.steps.length,
    completed_steps: completedCount,
    progress_percentage: Math.round((completedCount / form.steps.length) * 100),
    steps: progress,
  };
};

/**
 * Lock will to a specific form version (after payment)
 */
const lockWillToVersion = async (willId) => {
  const form = await getFormForWill(willId);

  await db
    .updateTable('wills')
    .set({
      form_template_id: form.form_id,
      form_version_id: form.version_id,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .execute();

  logger.info('Will locked to form version', {
    willId,
    formId: form.form_id,
    versionId: form.version_id,
  });
};

module.exports = {
  getFormForWill,
  getWillResponses,
  getStepResponse,
  saveStepResponse,
  validateStepData,
  writeLegacyData,
  getWillProgress,
  lockWillToVersion,
};
