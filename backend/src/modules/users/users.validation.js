const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

const getUsersQuerySchema = {
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    sortBy: z.enum(['created_at', 'email', 'first_name', 'last_name']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    role: z.string().optional(),
    is_active: z.string().transform((v) => v === 'true').optional(),
  }),
};

const getUserByIdSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const updateUserSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    first_name: z.string().min(1).max(100).trim().optional(),
    last_name: z.string().min(1).max(100).trim().optional(),
    phone: z.string().max(20).optional().nullable(),
    is_active: z.boolean().optional(),
  }),
};

const assignRoleSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    role_id: uuidSchema,
  }),
};

const deleteUserSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

module.exports = {
  getUsersQuerySchema,
  getUserByIdSchema,
  updateUserSchema,
  assignRoleSchema,
  deleteUserSchema,
};
