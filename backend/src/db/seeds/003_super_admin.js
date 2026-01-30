/**
 * Seed: Create super admin user
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { ROLE_IDS } = require('./001_roles');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@willbe.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

const seed = async (db) => {
  // Check if super admin already exists
  const existingAdmin = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', SUPER_ADMIN_EMAIL)
    .executeTakeFirst();

  if (existingAdmin) {
    console.log('Super admin user already exists, skipping...');
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  // Create super admin user
  await db
    .insertInto('users')
    .values({
      id: uuidv4(),
      email: SUPER_ADMIN_EMAIL,
      password_hash: passwordHash,
      first_name: 'Super',
      last_name: 'Admin',
      is_active: true,
      is_email_verified: true,
      email_verified_at: new Date(),
      role_id: ROLE_IDS.SUPER_ADMIN,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  console.log(`Super admin created with email: ${SUPER_ADMIN_EMAIL}`);
  console.log('IMPORTANT: Change the default password immediately!');
};

module.exports = { seed };
