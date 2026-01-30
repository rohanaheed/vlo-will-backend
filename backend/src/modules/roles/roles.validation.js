const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

const getRoleByIdSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const createRoleSchema = {
  body: z.object({
    name: z.string().min(1).max(50).trim().toLowerCase(),
    description: z.string().max(500).optional(),
  }),
};

const updateRoleSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(50).trim().toLowerCase().optional(),
    description: z.string().max(500).optional().nullable(),
  }),
};

const deleteRoleSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const assignPermissionsSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    permission_ids: z.array(uuidSchema).min(1, 'At least one permission is required'),
  }),
};

const removePermissionsSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    permission_ids: z.array(uuidSchema).min(1, 'At least one permission is required'),
  }),
};

module.exports = {
  getRoleByIdSchema,
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
  assignPermissionsSchema,
  removePermissionsSchema,
};
