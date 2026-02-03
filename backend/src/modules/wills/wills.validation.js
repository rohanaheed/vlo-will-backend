const { z } = require('zod');
const { WILL_TYPES, MARITAL_STATUSES, WILL_STATUSES } = require('../../utils/constants');

const uuidSchema = z.string().uuid('Invalid ID format');

const getWillsQuerySchema = {
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    sortBy: z.enum(['created_at', 'updated_at', 'status']).default('updated_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    status: z.enum(Object.values(WILL_STATUSES)).optional(),
    will_type: z.enum(Object.values(WILL_TYPES)).optional(),
  }),
};

const getWillByIdSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const createWillSchema = {
  body: z.object({
    will_type: z.enum(Object.values(WILL_TYPES)),
    // marital_status is collected in Step 1 (Testator form), not on will creation
    marital_status: z.enum(Object.values(MARITAL_STATUSES)).optional(),
    is_for_self: z.boolean().default(true),
    not_for_self_explanation: z.string().max(1000).optional().nullable(),
    jurisdiction: z.enum([
        'england',
        'wales', 
        'scotland',
        'northern_ireland'
      ]).optional().nullable()
  })
};

const updateWillSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    marital_status: z.enum(Object.values(MARITAL_STATUSES)).optional(),
    is_for_self: z.boolean().optional(),
    not_for_self_explanation: z.string().max(1000).optional().nullable(),
    signing_date: z.string().date().optional().nullable(),
    signing_place: z.string().max(255).optional().nullable(),
    execution_date: z.string().date().optional().nullable(),
    execution_place: z.string().max(255).optional().nullable(),
    revocation_clause_date: z.string().date().optional().nullable(),
    additional_clauses: z.array(z.object({
      title: z.string().optional(),
      content: z.string(),
    })).optional().nullable(),
  }),
};

const updateStepSchema = {
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    current_step: z.number().int().min(1).max(16),
  }),
};

const completeWillSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

const deleteWillSchema = {
  params: z.object({
    id: uuidSchema,
  }),
};

// Common address schema for will-related entities
const addressSchema = z.object({
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

module.exports = {
  getWillsQuerySchema,
  getWillByIdSchema,
  createWillSchema,
  updateWillSchema,
  updateStepSchema,
  completeWillSchema,
  deleteWillSchema,
  addressSchema,
  uuidSchema,
};
