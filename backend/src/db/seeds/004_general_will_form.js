/**
 * Seed: General Will Form Template
 * Creates the default General Will form with all steps and fields
 */

const { v4: uuidv4 } = require('uuid');

const seed = async (db) => {
  console.log('Seeding General Will form template...');

  // Check if form already exists
  const existingForm = await db
    .selectFrom('form_templates')
    .select('id')
    .where('slug', '=', 'general-will')
    .executeTakeFirst();

  if (existingForm) {
    console.log('General Will form template already exists, skipping...');
    return;
  }

  const formId = uuidv4();
  const now = new Date();

  // Create form template
  await db.insertInto('form_templates').values({
    id: formId,
    name: 'General Will',
    slug: 'general-will',
    description: 'Standard will for England & Wales',
    will_type: 'general',
    status: 'draft',
    settings: JSON.stringify({
      allow_step_navigation: true,
      show_progress_bar: true,
    }),
    created_at: now,
    updated_at: now,
  }).execute();

  // Define steps with their fields
  const steps = [
    {
      name: 'Your Details',
      slug: 'testator',
      icon: 'user',
      order_index: 1,
      fields: [
        { name: 'title', label: 'Title', field_type: 'select', width: 'quarter', is_required: true, options: [
          { value: 'mr', label: 'Mr' }, { value: 'mrs', label: 'Mrs' }, { value: 'miss', label: 'Miss' },
          { value: 'ms', label: 'Ms' }, { value: 'dr', label: 'Dr' }, { value: 'prof', label: 'Prof' },
        ], legacy_table: 'testators', legacy_column: 'title' },
        { name: 'first_name', label: 'First Name', field_type: 'text', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'first_name' },
        { name: 'middle_name', label: 'Middle Name(s)', field_type: 'text', width: 'half', legacy_table: 'testators', legacy_column: 'middle_name' },
        { name: 'last_name', label: 'Last Name', field_type: 'text', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'last_name' },
        { name: 'known_as', label: 'Known As (if different)', field_type: 'text', width: 'half', legacy_table: 'testators', legacy_column: 'known_as' },
        { name: 'date_of_birth', label: 'Date of Birth', field_type: 'date', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'date_of_birth' },
        { name: 'gender', label: 'Gender', field_type: 'select', width: 'half', is_required: true, options: [
          { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' },
        ], legacy_table: 'testators', legacy_column: 'gender' },
        { name: 'building_number', label: 'Building Number', field_type: 'text', width: 'quarter', legacy_table: 'testators', legacy_column: 'building_number' },
        { name: 'building_name', label: 'Building Name', field_type: 'text', width: 'quarter', legacy_table: 'testators', legacy_column: 'building_name' },
        { name: 'street', label: 'Street', field_type: 'text', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'street' },
        { name: 'town', label: 'Town/City', field_type: 'text', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'town' },
        { name: 'county', label: 'County', field_type: 'text', width: 'half', legacy_table: 'testators', legacy_column: 'county' },
        { name: 'postcode', label: 'Postcode', field_type: 'text', width: 'quarter', is_required: true, legacy_table: 'testators', legacy_column: 'postcode' },
        { name: 'country', label: 'Country', field_type: 'text', width: 'quarter', default_value: 'United Kingdom', legacy_table: 'testators', legacy_column: 'country' },
        { name: 'national_insurance_number', label: 'National Insurance Number', field_type: 'text', width: 'half', legacy_table: 'testators', legacy_column: 'national_insurance_number' },
        { name: 'phone_country_code', label: 'Country Code', field_type: 'text', width: 'quarter', default_value: '+44', legacy_table: 'testators', legacy_column: 'phone_country_code' },
        { name: 'phone', label: 'Phone Number', field_type: 'phone', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'phone' },
        { name: 'email', label: 'Email Address', field_type: 'email', width: 'half', is_required: true, legacy_table: 'testators', legacy_column: 'email' },
        { name: 'marital_status', label: 'Marital Status', field_type: 'select', width: 'half', is_required: true, options: [
          { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' },
          { value: 'civil_partnership', label: 'Civil Partnership' }, { value: 'divorced', label: 'Divorced' },
          { value: 'widowed', label: 'Widowed' }, { value: 'separated', label: 'Separated' },
        ], legacy_table: 'wills', legacy_column: 'marital_status' },
        { name: 'include_future_marriage_clause', label: 'Include future marriage clause?', field_type: 'toggle', width: 'full', help_text: 'This clause ensures your will remains valid if you marry in the future', legacy_table: 'testators', legacy_column: 'include_future_marriage_clause' },
        { name: 'jurisdiction', label: 'Jurisdiction', field_type: 'select', width: 'half', is_required: true, options: [
          { value: 'england', label: 'England & Wales' }, { value: 'scotland', label: 'Scotland' },
          { value: 'northern_ireland', label: 'Northern Ireland' },
        ], legacy_table: 'wills', legacy_column: 'jurisdiction' },
        { name: 'declaration_confirmed', label: 'I confirm the information above is correct', field_type: 'checkbox', width: 'full', is_required: true, legacy_table: 'testators', legacy_column: 'declaration_confirmed' },
      ],
    },
    {
      name: 'Executors',
      slug: 'executors',
      icon: 'users',
      order_index: 2,
      fields: [
        { name: 'executors', label: 'Executors', field_type: 'repeater', width: 'full', is_required: true, settings: JSON.stringify({
          min_items: 1,
          max_items: 4,
          item_label: 'Executor',
          add_label: 'Add Another Executor',
          fields: [
            { name: 'executor_type', label: 'Type', field_type: 'select', options: [
              { value: 'individual', label: 'Individual' }, { value: 'professional', label: 'Professional' },
            ]},
            { name: 'title', label: 'Title', field_type: 'select', options: [
              { value: 'mr', label: 'Mr' }, { value: 'mrs', label: 'Mrs' }, { value: 'miss', label: 'Miss' },
              { value: 'ms', label: 'Ms' }, { value: 'dr', label: 'Dr' },
            ]},
            { name: 'first_name', label: 'First Name', field_type: 'text', is_required: true },
            { name: 'middle_name', label: 'Middle Name(s)', field_type: 'text' },
            { name: 'last_name', label: 'Last Name', field_type: 'text', is_required: true },
            { name: 'relationship_to_testator', label: 'Relationship', field_type: 'text' },
            { name: 'phone_country_code', label: 'Country Code', field_type: 'text', default_value: '+44' },
            { name: 'phone', label: 'Phone', field_type: 'phone' },
            { name: 'email', label: 'Email', field_type: 'email' },
            { name: 'building_number', label: 'Building Number', field_type: 'text' },
            { name: 'building_name', label: 'Building Name', field_type: 'text' },
            { name: 'street', label: 'Street', field_type: 'text' },
            { name: 'town', label: 'Town/City', field_type: 'text' },
            { name: 'county', label: 'County', field_type: 'text' },
            { name: 'postcode', label: 'Postcode', field_type: 'text' },
            { name: 'country', label: 'Country', field_type: 'text', default_value: 'United Kingdom' },
            { name: 'is_alternate', label: 'Alternate Executor?', field_type: 'toggle' },
            { name: 'business_name', label: 'Business Name (if professional)', field_type: 'text' },
            { name: 'role_title', label: 'Role/Title', field_type: 'text' },
          ],
        }), legacy_table: 'executors' },
      ],
    },
    {
      name: 'Spouse/Partner',
      slug: 'spouse',
      icon: 'heart',
      order_index: 3,
      display_conditions: JSON.stringify({
        field: 'marital_status',
        operator: 'in',
        value: ['married', 'civil_partnership'],
      }),
      fields: [
        { name: 'title', label: 'Title', field_type: 'select', width: 'quarter', options: [
          { value: 'mr', label: 'Mr' }, { value: 'mrs', label: 'Mrs' }, { value: 'miss', label: 'Miss' },
          { value: 'ms', label: 'Ms' }, { value: 'dr', label: 'Dr' },
        ], legacy_table: 'spouses', legacy_column: 'title' },
        { name: 'first_name', label: 'First Name', field_type: 'text', width: 'half', is_required: true, legacy_table: 'spouses', legacy_column: 'first_name' },
        { name: 'middle_name', label: 'Middle Name(s)', field_type: 'text', width: 'half', legacy_table: 'spouses', legacy_column: 'middle_name' },
        { name: 'last_name', label: 'Last Name', field_type: 'text', width: 'half', is_required: true, legacy_table: 'spouses', legacy_column: 'last_name' },
        { name: 'date_of_birth', label: 'Date of Birth', field_type: 'date', width: 'half', legacy_table: 'spouses', legacy_column: 'date_of_birth' },
        { name: 'same_address', label: 'Same address as testator?', field_type: 'toggle', width: 'full' },
        { name: 'building_number', label: 'Building Number', field_type: 'text', width: 'quarter', legacy_table: 'spouses', legacy_column: 'building_number' },
        { name: 'street', label: 'Street', field_type: 'text', width: 'half', legacy_table: 'spouses', legacy_column: 'street' },
        { name: 'town', label: 'Town/City', field_type: 'text', width: 'half', legacy_table: 'spouses', legacy_column: 'town' },
        { name: 'postcode', label: 'Postcode', field_type: 'text', width: 'quarter', legacy_table: 'spouses', legacy_column: 'postcode' },
      ],
    },
    {
      name: 'Children',
      slug: 'children',
      icon: 'users',
      order_index: 4,
      fields: [
        { name: 'has_children', label: 'Do you have children?', field_type: 'toggle', width: 'full', is_required: true },
        { name: 'children', label: 'Children', field_type: 'repeater', width: 'full', display_conditions: JSON.stringify({ field: 'has_children', operator: 'equals', value: true }), settings: JSON.stringify({
          min_items: 0,
          max_items: 20,
          item_label: 'Child',
          add_label: 'Add Child',
          fields: [
            { name: 'first_name', label: 'First Name', field_type: 'text', is_required: true },
            { name: 'last_name', label: 'Last Name', field_type: 'text', is_required: true },
            { name: 'date_of_birth', label: 'Date of Birth', field_type: 'date' },
            { name: 'relationship', label: 'Relationship', field_type: 'select', options: [
              { value: 'biological', label: 'Biological' }, { value: 'adopted', label: 'Adopted' },
              { value: 'step', label: 'Step-child' },
            ]},
          ],
        }), legacy_table: 'children' },
      ],
    },
    {
      name: 'Guardians',
      slug: 'guardians',
      icon: 'shield',
      order_index: 5,
      display_conditions: JSON.stringify({
        field: 'has_children',
        operator: 'equals',
        value: true,
      }),
      fields: [
        { name: 'guardians', label: 'Guardians', field_type: 'repeater', width: 'full', settings: JSON.stringify({
          min_items: 0,
          max_items: 4,
          item_label: 'Guardian',
          add_label: 'Add Guardian',
          fields: [
            { name: 'first_name', label: 'First Name', field_type: 'text', is_required: true },
            { name: 'last_name', label: 'Last Name', field_type: 'text', is_required: true },
            { name: 'relationship', label: 'Relationship', field_type: 'text' },
            { name: 'phone', label: 'Phone', field_type: 'phone' },
            { name: 'email', label: 'Email', field_type: 'email' },
          ],
        }), legacy_table: 'guardians' },
      ],
    },
    {
      name: 'Beneficiaries',
      slug: 'beneficiaries',
      icon: 'gift',
      order_index: 6,
      fields: [
        { name: 'beneficiaries', label: 'Beneficiaries', field_type: 'repeater', width: 'full', is_required: true, settings: JSON.stringify({
          min_items: 1,
          max_items: 50,
          item_label: 'Beneficiary',
          add_label: 'Add Beneficiary',
          fields: [
            { name: 'beneficiary_type', label: 'Type', field_type: 'select', options: [
              { value: 'individual', label: 'Individual' }, { value: 'charity', label: 'Charity' },
              { value: 'organization', label: 'Organization' },
            ]},
            { name: 'first_name', label: 'First Name', field_type: 'text' },
            { name: 'last_name', label: 'Last Name', field_type: 'text' },
            { name: 'organization_name', label: 'Organization/Charity Name', field_type: 'text' },
            { name: 'charity_number', label: 'Charity Number', field_type: 'text' },
            { name: 'relationship', label: 'Relationship', field_type: 'text' },
            { name: 'share_type', label: 'Gift Type', field_type: 'select', options: [
              { value: 'percentage', label: 'Percentage of Estate' }, { value: 'specific', label: 'Specific Item' },
              { value: 'pecuniary', label: 'Fixed Amount' },
            ]},
            { name: 'share_value', label: 'Share/Amount', field_type: 'text' },
          ],
        }), legacy_table: 'beneficiaries' },
      ],
    },
    {
      name: 'Assets',
      slug: 'assets',
      icon: 'home',
      order_index: 7,
      fields: [
        { name: 'assets', label: 'Assets', field_type: 'repeater', width: 'full', settings: JSON.stringify({
          min_items: 0,
          max_items: 100,
          item_label: 'Asset',
          add_label: 'Add Asset',
          fields: [
            { name: 'asset_type', label: 'Type', field_type: 'select', options: [
              { value: 'property', label: 'Property' }, { value: 'vehicle', label: 'Vehicle' },
              { value: 'bank_account', label: 'Bank Account' }, { value: 'investment', label: 'Investment' },
              { value: 'business', label: 'Business Interest' }, { value: 'personal_item', label: 'Personal Item' },
              { value: 'other', label: 'Other' },
            ]},
            { name: 'description', label: 'Description', field_type: 'textarea' },
            { name: 'estimated_value', label: 'Estimated Value (£)', field_type: 'currency' },
            { name: 'ownership_type', label: 'Ownership', field_type: 'select', options: [
              { value: 'sole', label: 'Sole Owner' }, { value: 'joint', label: 'Joint Owner' },
              { value: 'tenants_in_common', label: 'Tenants in Common' },
            ]},
          ],
        }), legacy_table: 'assets' },
      ],
    },
    {
      name: 'Debts',
      slug: 'debts',
      icon: 'credit-card',
      order_index: 8,
      fields: [
        { name: 'has_debts', label: 'Do you have any debts?', field_type: 'toggle', width: 'full' },
        { name: 'debts', label: 'Debts', field_type: 'repeater', width: 'full', display_conditions: JSON.stringify({ field: 'has_debts', operator: 'equals', value: true }), settings: JSON.stringify({
          min_items: 0,
          max_items: 50,
          item_label: 'Debt',
          add_label: 'Add Debt',
          fields: [
            { name: 'debt_type', label: 'Type', field_type: 'select', options: [
              { value: 'mortgage', label: 'Mortgage' }, { value: 'loan', label: 'Loan' },
              { value: 'credit_card', label: 'Credit Card' }, { value: 'other', label: 'Other' },
            ]},
            { name: 'creditor', label: 'Creditor', field_type: 'text' },
            { name: 'amount', label: 'Amount (£)', field_type: 'currency' },
          ],
        }), legacy_table: 'debts' },
      ],
    },
    {
      name: 'Funeral Wishes',
      slug: 'funeral-wishes',
      icon: 'flower',
      order_index: 9,
      fields: [
        { name: 'funeral_type', label: 'Preferred Funeral Type', field_type: 'select', width: 'half', options: [
          { value: 'burial', label: 'Burial' }, { value: 'cremation', label: 'Cremation' },
          { value: 'no_preference', label: 'No Preference' },
        ], legacy_table: 'funeral_wishes', legacy_column: 'funeral_type' },
        { name: 'specific_wishes', label: 'Specific Wishes', field_type: 'textarea', width: 'full', help_text: 'Any specific requests for your funeral service', legacy_table: 'funeral_wishes', legacy_column: 'specific_wishes' },
        { name: 'organ_donation', label: 'Organ Donation', field_type: 'select', width: 'half', options: [
          { value: 'yes', label: 'Yes, I wish to donate' }, { value: 'no', label: 'No' },
          { value: 'specific_organs', label: 'Specific organs only' },
        ], legacy_table: 'funeral_wishes', legacy_column: 'organ_donation' },
      ],
    },
    {
      name: 'Gifts',
      slug: 'gifts',
      icon: 'package',
      order_index: 10,
      fields: [
        { name: 'specific_gifts', label: 'Specific Gifts', field_type: 'repeater', width: 'full', settings: JSON.stringify({
          min_items: 0,
          max_items: 100,
          item_label: 'Gift',
          add_label: 'Add Specific Gift',
          fields: [
            { name: 'item', label: 'Item Description', field_type: 'text', is_required: true },
            { name: 'recipient_name', label: 'Recipient Name', field_type: 'text', is_required: true },
            { name: 'recipient_relationship', label: 'Relationship', field_type: 'text' },
            { name: 'conditions', label: 'Conditions', field_type: 'textarea' },
          ],
        }), legacy_table: 'gifts' },
      ],
    },
    {
      name: 'Additional Instructions',
      slug: 'additional-instructions',
      icon: 'file-text',
      order_index: 11,
      fields: [
        { name: 'additional_instructions', label: 'Additional Instructions', field_type: 'textarea', width: 'full', help_text: 'Any other instructions or wishes not covered above', legacy_table: 'wills', legacy_column: 'additional_instructions' },
        { name: 'digital_assets_instructions', label: 'Digital Assets Instructions', field_type: 'textarea', width: 'full', help_text: 'Instructions for social media accounts, digital files, etc.', legacy_table: 'wills', legacy_column: 'digital_assets_instructions' },
        { name: 'pet_care_instructions', label: 'Pet Care Instructions', field_type: 'textarea', width: 'full', legacy_table: 'wills', legacy_column: 'pet_care_instructions' },
      ],
    },
    {
      name: 'Review & Submit',
      slug: 'review',
      icon: 'check-circle',
      order_index: 12,
      fields: [
        { name: 'review_heading', label: 'Review Your Will', field_type: 'heading', width: 'full', settings: JSON.stringify({ level: 2 }) },
        { name: 'review_instructions', label: '', field_type: 'paragraph', width: 'full', default_value: 'Please review all the information you have provided. You can go back to any section to make changes.' },
        { name: 'terms_accepted', label: 'I confirm all information provided is accurate and complete', field_type: 'checkbox', width: 'full', is_required: true },
        { name: 'understand_legal', label: 'I understand this will needs to be signed and witnessed to be legally valid', field_type: 'checkbox', width: 'full', is_required: true },
      ],
    },
  ];

  // Create steps and fields
  for (const stepData of steps) {
    const stepId = uuidv4();
    
    await db.insertInto('form_steps').values({
      id: stepId,
      form_template_id: formId,
      name: stepData.name,
      slug: stepData.slug,
      icon: stepData.icon,
      order_index: stepData.order_index,
      is_required: true,
      allow_skip: false,
      display_conditions: stepData.display_conditions || null,
      settings: JSON.stringify({}),
      is_active: true,
      created_at: now,
      updated_at: now,
    }).execute();

    // Create fields for this step
    let fieldOrder = 1;
    for (const fieldData of stepData.fields) {
      await db.insertInto('form_fields').values({
        id: uuidv4(),
        form_step_id: stepId,
        name: fieldData.name,
        label: fieldData.label,
        placeholder: fieldData.placeholder || null,
        help_text: fieldData.help_text || null,
        field_type: fieldData.field_type,
        order_index: fieldOrder++,
        width: fieldData.width || 'full',
        is_required: fieldData.is_required || false,
        validation_rules: JSON.stringify(fieldData.validation_rules || {}),
        default_value: fieldData.default_value || null,
        options: fieldData.options ? JSON.stringify(fieldData.options) : null,
        display_conditions: fieldData.display_conditions || null,
        is_active: true,
        is_read_only: false,
        is_system_field: false,
        legacy_table: fieldData.legacy_table || null,
        legacy_column: fieldData.legacy_column || null,
        settings: fieldData.settings || JSON.stringify({}),
        created_at: now,
        updated_at: now,
      }).execute();
    }

    console.log(`  Created step: ${stepData.name} with ${stepData.fields.length} fields`);
  }

  console.log('General Will form template seeded successfully!');
  console.log('Note: Run "npm run admin:publish-form general-will" to publish the form');
};

module.exports = { seed };
