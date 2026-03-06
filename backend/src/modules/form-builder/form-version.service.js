/**
 * Form Version Service
 * Handles publishing, version history, and restore functionality
 */

const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const formBuilderService = require('./form-builder.service');

/**
 * Publish a form template
 * Creates a new version with a full snapshot of the form structure
 */
const publishForm = async (formTemplateId, userId, changeSummary) => {
  const form = await formBuilderService.getFormTemplateWithStructure(formTemplateId);

  // Get next version number
  const lastVersion = await db
    .selectFrom('form_versions')
    .select('version_number')
    .where('form_template_id', '=', formTemplateId)
    .orderBy('version_number', 'desc')
    .executeTakeFirst();

  const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

  // Create snapshot (full form structure)
  const snapshot = {
    id: form.id,
    name: form.name,
    slug: form.slug,
    description: form.description,
    will_type: form.will_type,
    settings: form.settings,
    steps: form.steps.map((step) => ({
      id: step.id,
      name: step.name,
      slug: step.slug,
      description: step.description,
      icon: step.icon,
      order_index: step.order_index,
      is_required: step.is_required,
      allow_skip: step.allow_skip,
      display_conditions: step.display_conditions,
      settings: step.settings,
      fields: step.fields.map((field) => ({
        id: field.id,
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
      })),
    })),
    conditional_rules: form.conditional_rules,
    published_at: new Date().toISOString(),
  };

  // Create version record
  const versionId = generateUUID();
  const version = await db
    .insertInto('form_versions')
    .values({
      id: versionId,
      form_template_id: formTemplateId,
      version_number: nextVersionNumber,
      version_label: `v${nextVersionNumber}.0`,
      snapshot,
      change_summary: changeSummary || `Published version ${nextVersionNumber}`,
      created_by: userId,
      created_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  // Update form template status and published_version_id
  await db
    .updateTable('form_templates')
    .set({
      status: 'published',
      published_version_id: versionId,
      updated_at: new Date(),
    })
    .where('id', '=', formTemplateId)
    .execute();

  logger.info('Form published', {
    formId: formTemplateId,
    versionId,
    versionNumber: nextVersionNumber,
  });

  return {
    version,
    form: await formBuilderService.getFormTemplateById(formTemplateId),
  };
};

/**
 * Unpublish a form
 */
const unpublishForm = async (formTemplateId) => {
  const form = await formBuilderService.getFormTemplateById(formTemplateId);

  if (form.status !== 'published') {
    throw new BadRequestError('Form is not published');
  }

  await db
    .updateTable('form_templates')
    .set({
      status: 'draft',
      updated_at: new Date(),
    })
    .where('id', '=', formTemplateId)
    .execute();

  logger.info('Form unpublished', { formId: formTemplateId });
  return await formBuilderService.getFormTemplateById(formTemplateId);
};

/**
 * Get all versions of a form
 */
const getFormVersions = async (formTemplateId) => {
  return await db
    .selectFrom('form_versions')
    .leftJoin('users', 'form_versions.created_by', 'users.id')
    .select([
      'form_versions.id',
      'form_versions.form_template_id',
      'form_versions.version_number',
      'form_versions.version_label',
      'form_versions.change_summary',
      'form_versions.created_at',
      'users.name as created_by_name',
      'users.email as created_by_email',
    ])
    .where('form_versions.form_template_id', '=', formTemplateId)
    .orderBy('form_versions.version_number', 'desc')
    .execute();
};

/**
 * Get a specific version with its snapshot
 */
const getFormVersion = async (versionId) => {
  const version = await db
    .selectFrom('form_versions')
    .selectAll()
    .where('id', '=', versionId)
    .executeTakeFirst();

  if (!version) {
    throw new NotFoundError('Form version');
  }

  return version;
};

/**
 * Get the published version of a form (for user-side)
 */
const getPublishedFormVersion = async (formTemplateId) => {
  const form = await formBuilderService.getFormTemplateById(formTemplateId);

  if (!form.published_version_id) {
    throw new NotFoundError('No published version found');
  }

  return await getFormVersion(form.published_version_id);
};

/**
 * Get published form by slug (for user-side)
 */
const getPublishedFormBySlug = async (slug) => {
  const form = await formBuilderService.getFormTemplateBySlug(slug);

  if (form.status !== 'published' || !form.published_version_id) {
    throw new NotFoundError('Form is not published');
  }

  const version = await getFormVersion(form.published_version_id);
  return {
    form_id: form.id,
    version_id: version.id,
    version_number: version.version_number,
    ...version.snapshot,
  };
};

/**
 * Restore a form to a previous version
 * This replaces the current draft with the snapshot from the selected version
 */
const restoreFormVersion = async (formTemplateId, versionId, userId) => {
  const version = await getFormVersion(versionId);

  if (version.form_template_id !== formTemplateId) {
    throw new BadRequestError('Version does not belong to this form');
  }

  const snapshot = version.snapshot;

  // Start transaction
  await db.transaction().execute(async (trx) => {
    // 1. Delete current steps and fields (cascade will handle fields)
    await trx
      .deleteFrom('form_steps')
      .where('form_template_id', '=', formTemplateId)
      .execute();

    // 2. Delete current conditional rules
    await trx
      .deleteFrom('form_conditional_rules')
      .where('form_template_id', '=', formTemplateId)
      .execute();

    // 3. Update form template metadata
    await trx
      .updateTable('form_templates')
      .set({
        name: snapshot.name,
        description: snapshot.description,
        will_type: snapshot.will_type,
        settings: snapshot.settings,
        status: 'draft', // Reset to draft after restore
        updated_at: new Date(),
      })
      .where('id', '=', formTemplateId)
      .execute();

    // 4. Recreate steps
    for (const step of snapshot.steps) {
      const newStepId = generateUUID();
      await trx
        .insertInto('form_steps')
        .values({
          id: newStepId,
          form_template_id: formTemplateId,
          name: step.name,
          slug: step.slug,
          description: step.description,
          icon: step.icon,
          order_index: step.order_index,
          is_required: step.is_required,
          allow_skip: step.allow_skip,
          display_conditions: step.display_conditions,
          settings: step.settings || {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      // 5. Recreate fields for this step
      for (const field of step.fields) {
        await trx
          .insertInto('form_fields')
          .values({
            id: generateUUID(),
            form_step_id: newStepId,
            name: field.name,
            label: field.label,
            placeholder: field.placeholder,
            help_text: field.help_text,
            field_type: field.field_type,
            order_index: field.order_index,
            width: field.width,
            is_required: field.is_required,
            validation_rules: field.validation_rules || {},
            default_value: field.default_value,
            options: field.options,
            display_conditions: field.display_conditions,
            is_active: true,
            is_read_only: false,
            is_system_field: field.is_system_field || false,
            legacy_table: field.legacy_table,
            legacy_column: field.legacy_column,
            settings: field.settings || {},
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      }
    }

    // 6. Recreate conditional rules
    if (snapshot.conditional_rules) {
      for (const rule of snapshot.conditional_rules) {
        await trx
          .insertInto('form_conditional_rules')
          .values({
            id: generateUUID(),
            form_template_id: formTemplateId,
            target_type: rule.target_type,
            target_id: rule.target_id,
            action: rule.action,
            conditions: rule.conditions,
            logic_operator: rule.logic_operator || 'AND',
            action_value: rule.action_value,
            is_active: true,
            order_index: rule.order_index || 0,
            created_at: new Date(),
          })
          .execute();
      }
    }
  });

  logger.info('Form restored from version', {
    formId: formTemplateId,
    versionId,
    versionNumber: version.version_number,
    userId,
  });

  return await formBuilderService.getFormTemplateWithStructure(formTemplateId);
};

/**
 * Compare two versions (returns diff summary)
 */
const compareVersions = async (versionId1, versionId2) => {
  const v1 = await getFormVersion(versionId1);
  const v2 = await getFormVersion(versionId2);

  const diff = {
    steps_added: [],
    steps_removed: [],
    steps_modified: [],
    fields_added: [],
    fields_removed: [],
    fields_modified: [],
  };

  const v1StepSlugs = new Set(v1.snapshot.steps.map((s) => s.slug));
  const v2StepSlugs = new Set(v2.snapshot.steps.map((s) => s.slug));

  // Find added/removed steps
  for (const step of v2.snapshot.steps) {
    if (!v1StepSlugs.has(step.slug)) {
      diff.steps_added.push(step.name);
    }
  }
  for (const step of v1.snapshot.steps) {
    if (!v2StepSlugs.has(step.slug)) {
      diff.steps_removed.push(step.name);
    }
  }

  return diff;
};

module.exports = {
  publishForm,
  unpublishForm,
  getFormVersions,
  getFormVersion,
  getPublishedFormVersion,
  getPublishedFormBySlug,
  restoreFormVersion,
  compareVersions,
};
