/**
 * Seed: Create default roles
 */

const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for system roles (for consistent references)
const ROLE_IDS = {
  USER: '11111111-1111-1111-1111-111111111111',
  ADMIN: '22222222-2222-2222-2222-222222222222',
  SUPER_ADMIN: '33333333-3333-3333-3333-333333333333',
};

const seed = async (db) => {
  const roles = [
    {
      id: ROLE_IDS.USER,
      name: 'user',
      description: 'Regular user - can create and manage own wills',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: ROLE_IDS.ADMIN,
      name: 'admin',
      description: 'Administrator - has permissions assigned by super admin',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: ROLE_IDS.SUPER_ADMIN,
      name: 'super_admin',
      description: 'Super Administrator - full system access',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  // Insert roles (ignore if already exists)
  for (const role of roles) {
    await db
      .insertInto('roles')
      .values(role)
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();
  }

  console.log('Roles seeded successfully');
};

module.exports = { seed, ROLE_IDS };
