const { z } = require('zod');
const { RELATIONSHIPS } = require('../../utils/constants');

const uuidSchema = z.string().uuid('Invalid ID format');

// Spouse Schema
const spouseSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  building_number: z.string().trim().max(50).optional().nullable(),
  building_name: z.string().trim().max(100).optional().nullable(),
  street: z.string().trim().max(255).optional().nullable(),
  town: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  phone_country_code: z.string().trim().max(10).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values(RELATIONSHIPS)).optional().nullable(),
});

// Param Schemas
const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const spouseIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    spouseId: uuidSchema,
  }),
};

// Create Schema
const createSpouseSchema = {
  params: willIdParamSchema.params,
  body: spouseSchema,
};

// Update Schema
const updateSpouseSchema = {
  params: spouseIdParamSchema.params,
  body: spouseSchema,
};

// Reorder Schema
const reorderSpousesSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    spouse_ids: z.array(uuidSchema).min(1, 'At least one spouse ID required'),
  }),
};

// Step 3 Schema (for use in step validation)
const step3SpouseSchema = z.object({
  is_spouse: z.boolean().optional().default(false),
  spouse: z.array(spouseSchema).optional().default([]),
});

module.exports = {
  spouseSchema,
  step3SpouseSchema,
  
  // Create/Update schemas
  createSpouseSchema,
  updateSpouseSchema,
  
  // Reorder schema
  reorderSpousesSchema,
  
  // Param schemas
  spouseIdParamSchema,
  willIdParamSchema,
};