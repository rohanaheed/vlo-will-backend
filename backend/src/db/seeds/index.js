/**
 * Run all seeds
 */

const path = require('path');

// Load .env from backend folder
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { db } = require('../../config/database');
const { seed: seedRoles } = require('./001_roles');
const { seed: seedPermissions } = require('./002_permissions');
const { seed: seedSuperAdmin } = require('./003_super_admin');

const runSeeds = async () => {
  try {
    console.log('Starting database seeding...\n');

    console.log('Seeding roles...');
    await seedRoles(db);

    console.log('\nSeeding permissions...');
    await seedPermissions(db);

    console.log('\nSeeding super admin...');
    await seedSuperAdmin(db);

    console.log('\n✓ All seeds completed successfully!');
  } catch (error) {
    console.error('Error running seeds:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSeeds };
