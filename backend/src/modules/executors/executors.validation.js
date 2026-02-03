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

const executorSchema = z.object({
  id: z.string().optional().nullable(),

  // Executor type: individual or professional advisor
  executor_type: z.enum(['individual', 'professional']).optional().default('individual'),

  // For Individual executors
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().max(255).optional().nullable(),
  relationship_to_testator: z.enum([
    'spouse',
    'civil_partner',
    'long_term_partner',
    'brother',
    'sister',
    'friend',
    'parent',
    'child',
    'other',
  ]).optional().nullable(),

  // For Professional Advisor executors
  business_name: z.string().max(255).optional().nullable(),
  role_title: z.enum([
    'solicitor',
    'accountant',
    'manager',
    'financial_advisor',
    'other',
  ]).optional().nullable(),

  // Contact details
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),

  // Executor role flags
  is_alternate: z.boolean().optional().default(false),
  is_backup: z.boolean().optional().default(false),
  is_spouse: z.boolean().optional().default(false),

  // Address fields
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  building_number: z.string().max(50).optional().nullable(),
  building_name: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
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
