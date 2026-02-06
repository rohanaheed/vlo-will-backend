const { z } = require('zod');
const { RELATIONSHIPS } = require('../../utils/constants');

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

const executorSchema = z.object({
  id: uuidSchema.optional().nullable(),
  executor_type: z.enum(['individual', 'professional']).optional().default('individual'),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().max(255).optional().nullable(),
  business_name: z.string().max(255).optional().nullable(),
  role_title: z.enum(['solicitor', 'accountant', 'manager', 'financial_advisor', 'other']).optional().nullable(),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable(),
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  is_alternate: z.boolean().optional().default(false),
  is_backup: z.boolean().optional().default(false),
}).passthrough();

const createExecutorSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
  body: executorSchema,
};

const updateExecutorSchema = {
  params: z.object({
    willId: uuidSchema,
    id: uuidSchema,
  }),
  body: executorSchema,
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
