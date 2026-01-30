/**
 * Seed: Create default permissions
 */

const { v4: uuidv4 } = require('uuid');
const { ROLE_IDS } = require('./001_roles');

const PERMISSIONS = [
  // Users module
  { name: 'users:read', description: 'View user list', module: 'users' },
  { name: 'users:read_own', description: 'View own profile', module: 'users' },
  { name: 'users:create', description: 'Create new users', module: 'users' },
  { name: 'users:update', description: 'Update any user', module: 'users' },
  { name: 'users:update_own', description: 'Update own profile', module: 'users' },
  { name: 'users:delete', description: 'Delete users', module: 'users' },

  // Wills module
  { name: 'wills:read', description: 'View all wills', module: 'wills' },
  { name: 'wills:read_own', description: 'View own wills', module: 'wills' },
  { name: 'wills:create', description: 'Create wills', module: 'wills' },
  { name: 'wills:update', description: 'Update any will', module: 'wills' },
  { name: 'wills:update_own', description: 'Update own wills', module: 'wills' },
  { name: 'wills:delete', description: 'Delete any will', module: 'wills' },
  { name: 'wills:delete_own', description: 'Delete own wills', module: 'wills' },

  // Admin module
  { name: 'admin:dashboard', description: 'Access admin dashboard', module: 'admin' },
  { name: 'admin:reports', description: 'View reports', module: 'admin' },
  { name: 'admin:settings', description: 'Manage system settings', module: 'admin' },

  // Roles & Permissions
  { name: 'roles:read', description: 'View roles', module: 'roles' },
  { name: 'roles:create', description: 'Create roles', module: 'roles' },
  { name: 'roles:update', description: 'Update roles', module: 'roles' },
  { name: 'roles:delete', description: 'Delete roles', module: 'roles' },
  { name: 'roles:assign', description: 'Assign roles to users', module: 'roles' },

  // Subscriptions
  { name: 'subscriptions:read', description: 'View all subscriptions', module: 'subscriptions' },
  { name: 'subscriptions:read_own', description: 'View own subscription', module: 'subscriptions' },
  { name: 'subscriptions:manage', description: 'Manage subscriptions', module: 'subscriptions' },

  // PDF
  { name: 'pdf:generate', description: 'Generate PDF wills', module: 'pdf' },
  { name: 'pdf:generate_own', description: 'Generate own PDF wills', module: 'pdf' },

  // Audit
  { name: 'audit:read', description: 'View audit logs', module: 'audit' },
];

// Permissions for each role
const USER_PERMISSIONS = [
  'users:read_own',
  'users:update_own',
  'wills:read_own',
  'wills:create',
  'wills:update_own',
  'wills:delete_own',
  'subscriptions:read_own',
  'pdf:generate_own',
];

const ADMIN_PERMISSIONS = [
  // All user permissions
  ...USER_PERMISSIONS,
  // Additional admin permissions
  'users:read',
  'wills:read',
  'admin:dashboard',
  'admin:reports',
  'subscriptions:read',
  'pdf:generate',
];

const seed = async (db) => {
  // Insert permissions
  const permissionRecords = [];
  for (const permission of PERMISSIONS) {
    const id = uuidv4();
    permissionRecords.push({
      id,
      name: permission.name,
      description: permission.description,
      module: permission.module,
      created_at: new Date(),
    });
  }

  // Insert all permissions (ignore if already exists)
  for (const permission of permissionRecords) {
    await db
      .insertInto('permissions')
      .values(permission)
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();
  }

  // Fetch all permissions from DB
  const allPermissions = await db
    .selectFrom('permissions')
    .select(['id', 'name'])
    .execute();

  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // Assign permissions to user role
  for (const permName of USER_PERMISSIONS) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await db
        .insertInto('role_permissions')
        .values({
          id: uuidv4(),
          role_id: ROLE_IDS.USER,
          permission_id: permId,
          created_at: new Date(),
        })
        .onConflict((oc) => 
          oc.columns(['role_id', 'permission_id']).doNothing()
        )
        .execute();
    }
  }

  // Assign permissions to admin role
  for (const permName of ADMIN_PERMISSIONS) {
    const permId = permissionMap.get(permName);
    if (permId) {
      await db
        .insertInto('role_permissions')
        .values({
          id: uuidv4(),
          role_id: ROLE_IDS.ADMIN,
          permission_id: permId,
          created_at: new Date(),
        })
        .onConflict((oc) => 
          oc.columns(['role_id', 'permission_id']).doNothing()
        )
        .execute();
    }
  }

  console.log('Permissions seeded successfully');
};

module.exports = { seed, PERMISSIONS };
