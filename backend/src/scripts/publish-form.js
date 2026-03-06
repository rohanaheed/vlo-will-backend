/**
 * Script to publish a form template
 * Usage: npm run admin:publish-form <form-slug>
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { db } = require('../config/database');
const formBuilderService = require('../modules/form-builder/form-builder.service');
const formVersionService = require('../modules/form-builder/form-version.service');

const publishForm = async () => {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: npm run admin:publish-form <form-slug>');
    console.error('Example: npm run admin:publish-form general-will');
    process.exit(1);
  }

  try {
    console.log(`Looking for form with slug: ${slug}`);

    const form = await formBuilderService.getFormTemplateBySlug(slug);
    console.log(`Found form: ${form.name} (${form.id})`);

    if (form.status === 'published') {
      console.log('Form is already published.');
      console.log('To create a new version, make changes and run this script again.');
    }

    console.log('Publishing form...');
    const result = await formVersionService.publishForm(
      form.id,
      null, // No user ID for CLI
      'Published via CLI'
    );

    console.log(`\n✓ Form published successfully!`);
    console.log(`  Version: ${result.version.version_number}`);
    console.log(`  Version ID: ${result.version.id}`);
    console.log(`  Status: ${result.form.status}`);
  } catch (error) {
    console.error('Error publishing form:', error.message);
    process.exit(1);
  }
};

publishForm()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
