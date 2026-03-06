/**
 * Migration: Create Form Builder Tables
 * 
 * Tables:
 * - form_templates: Form definitions
 * - form_versions: Version history with snapshots
 * - form_steps: Dynamic steps
 * - form_fields: Dynamic fields
 * - form_field_options: Options for select/radio/checkbox
 * - form_conditional_rules: Show/hide logic
 * - will_responses: User form data (dynamic)
 */

const { sql } = require('kysely');

const up = async (db) => {
  // 1. Form Templates
  await db.schema
    .createTable('form_templates')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.unique().notNull())
    .addColumn('description', 'text')
    .addColumn('will_type', 'varchar(50)') // general, islamic, mirror, trust, etc.
    .addColumn('status', 'varchar(20)', (col) => col.defaultTo('draft').notNull()) // draft, published, archived
    .addColumn('published_version_id', 'uuid') // FK added later
    .addColumn('settings', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_by', 'uuid', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 2. Form Versions (Version History)
  await db.schema
    .createTable('form_versions')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_template_id', 'uuid', (col) => 
      col.references('form_templates.id').onDelete('cascade').notNull()
    )
    .addColumn('version_number', 'integer', (col) => col.notNull())
    .addColumn('version_label', 'varchar(100)')
    .addColumn('snapshot', 'jsonb', (col) => col.notNull()) // Full form structure
    .addColumn('change_summary', 'text')
    .addColumn('created_by', 'uuid', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Add unique constraint for version per form
  await db.schema
    .createIndex('idx_form_versions_unique')
    .ifNotExists()
    .on('form_versions')
    .columns(['form_template_id', 'version_number'])
    .unique()
    .execute();

  // Add FK from form_templates to form_versions for published_version_id
  try {
    await db.schema
      .alterTable('form_templates')
      .addForeignKeyConstraint('fk_form_templates_published_version', ['published_version_id'], 'form_versions', ['id'])
      .onDelete('set null')
      .execute();
  } catch (e) {
    // Constraint might already exist
  }

  // 3. Form Steps
  await db.schema
    .createTable('form_steps')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_template_id', 'uuid', (col) => 
      col.references('form_templates.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon', 'varchar(50)')
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('is_required', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('allow_skip', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('display_conditions', 'jsonb') // Conditional display
    .addColumn('settings', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Unique slug per form
  await db.schema
    .createIndex('idx_form_steps_unique_slug')
    .ifNotExists()
    .on('form_steps')
    .columns(['form_template_id', 'slug'])
    .unique()
    .execute();

  // Index for ordering
  await db.schema
    .createIndex('idx_form_steps_order')
    .ifNotExists()
    .on('form_steps')
    .columns(['form_template_id', 'order_index'])
    .execute();

  // 4. Form Fields
  await db.schema
    .createTable('form_fields')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_step_id', 'uuid', (col) => 
      col.references('form_steps.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('label', 'varchar(255)', (col) => col.notNull())
    .addColumn('placeholder', 'varchar(255)')
    .addColumn('help_text', 'text')
    .addColumn('field_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('width', 'varchar(20)', (col) => col.defaultTo('full')) // full, half, third, quarter
    .addColumn('is_required', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('validation_rules', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('default_value', 'text')
    .addColumn('options', 'jsonb') // For select, radio, checkbox
    .addColumn('display_conditions', 'jsonb') // Conditional display
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('is_read_only', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('is_system_field', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('legacy_table', 'varchar(100)') // Map to existing tables
    .addColumn('legacy_column', 'varchar(100)') // Map to existing columns
    .addColumn('settings', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Unique field name per step
  await db.schema
    .createIndex('idx_form_fields_unique_name')
    .ifNotExists()
    .on('form_fields')
    .columns(['form_step_id', 'name'])
    .unique()
    .execute();

  // Index for ordering
  await db.schema
    .createIndex('idx_form_fields_order')
    .ifNotExists()
    .on('form_fields')
    .columns(['form_step_id', 'order_index'])
    .execute();

  // 5. Form Field Options (for complex dropdowns/radios)
  await db.schema
    .createTable('form_field_options')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_field_id', 'uuid', (col) => 
      col.references('form_fields.id').onDelete('cascade').notNull()
    )
    .addColumn('value', 'varchar(255)', (col) => col.notNull())
    .addColumn('label', 'varchar(255)', (col) => col.notNull())
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('is_default', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('parent_option_id', 'uuid', (col) => col.references('form_field_options.id').onDelete('cascade'))
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Index for ordering options
  await db.schema
    .createIndex('idx_form_field_options_order')
    .ifNotExists()
    .on('form_field_options')
    .columns(['form_field_id', 'order_index'])
    .execute();

  // 6. Form Conditional Rules
  await db.schema
    .createTable('form_conditional_rules')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_template_id', 'uuid', (col) => 
      col.references('form_templates.id').onDelete('cascade').notNull()
    )
    .addColumn('target_type', 'varchar(20)', (col) => col.notNull()) // 'field', 'step'
    .addColumn('target_id', 'uuid', (col) => col.notNull()) // field_id or step_id
    .addColumn('action', 'varchar(20)', (col) => col.notNull()) // 'show', 'hide', 'require', 'set_value'
    .addColumn('conditions', 'jsonb', (col) => col.notNull()) // Array of conditions
    .addColumn('logic_operator', 'varchar(10)', (col) => col.defaultTo('AND')) // 'AND', 'OR'
    .addColumn('action_value', 'text') // Value for 'set_value' action
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('order_index', 'integer', (col) => col.defaultTo(0).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Index for looking up rules by target
  await db.schema
    .createIndex('idx_form_conditional_rules_target')
    .ifNotExists()
    .on('form_conditional_rules')
    .columns(['target_type', 'target_id'])
    .execute();

  // 7. Will Responses (User Form Data - Dynamic)
  await db.schema
    .createTable('will_responses')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('will_id', 'uuid', (col) => 
      col.references('wills.id').onDelete('cascade').notNull()
    )
    .addColumn('form_step_id', 'uuid', (col) => 
      col.references('form_steps.id').onDelete('set null')
    )
    .addColumn('form_version_id', 'uuid', (col) => 
      col.references('form_versions.id').onDelete('set null')
    )
    .addColumn('step_slug', 'varchar(100)') // Backup in case step is deleted
    .addColumn('data', 'jsonb', (col) => col.defaultTo('{}').notNull())
    .addColumn('is_complete', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Unique response per will per step
  await db.schema
    .createIndex('idx_will_responses_unique')
    .ifNotExists()
    .on('will_responses')
    .columns(['will_id', 'form_step_id'])
    .unique()
    .execute();

  // Index for will lookups
  await db.schema
    .createIndex('idx_will_responses_will')
    .ifNotExists()
    .on('will_responses')
    .column('will_id')
    .execute();

  // 8. Add form_template_id and form_version_id to wills table
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS form_template_id uuid REFERENCES form_templates(id) ON DELETE SET NULL`.execute(db);
  await sql`ALTER TABLE wills ADD COLUMN IF NOT EXISTS form_version_id uuid REFERENCES form_versions(id) ON DELETE SET NULL`.execute(db);
};

const down = async (db) => {
  // Remove columns from wills
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS form_template_id`.execute(db);
  await sql`ALTER TABLE wills DROP COLUMN IF EXISTS form_version_id`.execute(db);

  // Drop tables in reverse order
  await db.schema.dropTable('will_responses').ifExists().execute();
  await db.schema.dropTable('form_conditional_rules').ifExists().execute();
  await db.schema.dropTable('form_field_options').ifExists().execute();
  await db.schema.dropTable('form_fields').ifExists().execute();
  await db.schema.dropTable('form_steps').ifExists().execute();
  
  // Remove FK before dropping form_versions
  try {
    await db.schema.alterTable('form_templates').dropConstraint('fk_form_templates_published_version').execute();
  } catch (e) {}
  
  await db.schema.dropTable('form_versions').ifExists().execute();
  await db.schema.dropTable('form_templates').ifExists().execute();
};

module.exports = { up, down };
