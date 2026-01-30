const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const executorIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    id: uuidSchema,
  }),
};

const createExecutorSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
  body: z.object({
    full_name: z.string().min(1, 'Full name is required').max(255),
    address_line_1: z.string().max(255).optional().nullable(),
    address_line_2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    relationship_to_testator: z.string().max(100).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    is_spouse: z.boolean().default(false),
    is_backup: z.boolean().default(false),
  }),
};

const updateExecutorSchema = {
  params: z.object({
    willId: uuidSchema,
    id: uuidSchema,
  }),
  body: z.object({
    full_name: z.string().min(1).max(255).optional(),
    address_line_1: z.string().max(255).optional().nullable(),
    address_line_2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    relationship_to_testator: z.string().max(100).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    is_spouse: z.boolean().optional(),
    is_backup: z.boolean().optional(),
  }),
};

const reorderExecutorsSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
  body: z.object({
    executor_ids: z.array(uuidSchema).min(1, 'At least one executor ID required'),
  }),
};

module.exports = {
  willIdParamSchema,
  executorIdParamSchema,
  createExecutorSchema,
  updateExecutorSchema,
  reorderExecutorsSchema,
};
