/**
 * Migration: Form Builder Production Updates
 * 
 * Adds:
 * - layout_config to form_fields for visual positioning
 * - Edit locking columns to form_templates
 * - form_edit_history table for undo/redo and change tracking
 * - Indexes for performance
 */

const { sql } = require('kysely');

const up = async (db) => {
  // Add layout_config to form_fields for visual positioning
  await sql`
    ALTER TABLE form_fields 
    ADD COLUMN IF NOT EXISTS layout_config jsonb DEFAULT '{}'::jsonb
  `.execute(db);

  // Add row_id for grouping fields in rows/columns
  await sql`
    ALTER TABLE form_fields 
    ADD COLUMN IF NOT EXISTS row_id varchar(100)
  `.execute(db);

  // Add column_span for grid layouts
  await sql`
    ALTER TABLE form_fields 
    ADD COLUMN IF NOT EXISTS column_span integer DEFAULT 12
  `.execute(db);

  // Add edit locking columns to form_templates
  await sql`
    ALTER TABLE form_templates 
    ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES users(id) ON DELETE SET NULL
  `.execute(db);

  await sql`
    ALTER TABLE form_templates 
    ADD COLUMN IF NOT EXISTS locked_at timestamptz
  `.execute(db);

  await sql`
    ALTER TABLE form_templates 
    ADD COLUMN IF NOT EXISTS last_autosave_at timestamptz
  `.execute(db);

  await sql`
    ALTER TABLE form_templates 
    ADD COLUMN IF NOT EXISTS autosave_data jsonb
  `.execute(db);

  // Create form_edit_history table for tracking changes (undo/redo)
  await db.schema
    .createTable('form_edit_history')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('form_template_id', 'uuid', (col) =>
      col.references('form_templates.id').onDelete('cascade').notNull()
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null')
    )
    .addColumn('session_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('action', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'uuid')
    .addColumn('before_state', 'jsonb')
    .addColumn('after_state', 'jsonb')
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo('{}'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Create indexes for form_edit_history
  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_edit_history_form_template 
    ON form_edit_history(form_template_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_edit_history_session 
    ON form_edit_history(session_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_edit_history_created 
    ON form_edit_history(created_at DESC)
  `.execute(db);

  // Create index on form_templates for lock queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_templates_locked 
    ON form_templates(locked_by) WHERE locked_by IS NOT NULL
  `.execute(db);

  // Create index on form_fields for row grouping
  await sql`
    CREATE INDEX IF NOT EXISTS idx_form_fields_row 
    ON form_fields(row_id) WHERE row_id IS NOT NULL
  `.execute(db);

  console.log('Migration 057: Form builder production updates completed');
};

const down = async (db) => {
  // Drop indexes
  await sql`DROP INDEX IF EXISTS idx_form_fields_row`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_form_templates_locked`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_form_edit_history_created`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_form_edit_history_session`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_form_edit_history_form_template`.execute(db);

  // Drop form_edit_history table
  await db.schema.dropTable('form_edit_history').ifExists().execute();

  // Remove columns from form_templates
  await sql`ALTER TABLE form_templates DROP COLUMN IF EXISTS autosave_data`.execute(db);
  await sql`ALTER TABLE form_templates DROP COLUMN IF EXISTS last_autosave_at`.execute(db);
  await sql`ALTER TABLE form_templates DROP COLUMN IF EXISTS locked_at`.execute(db);
  await sql`ALTER TABLE form_templates DROP COLUMN IF EXISTS locked_by`.execute(db);

  // Remove columns from form_fields
  await sql`ALTER TABLE form_fields DROP COLUMN IF EXISTS column_span`.execute(db);
  await sql`ALTER TABLE form_fields DROP COLUMN IF EXISTS row_id`.execute(db);
  await sql`ALTER TABLE form_fields DROP COLUMN IF EXISTS layout_config`.execute(db);

  console.log('Migration 057: Rollback completed');
};

module.exports = { up, down };
