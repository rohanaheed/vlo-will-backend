const { z } = require('zod');
const { MARITAL_STATUSES } = require('../../utils/constants');

const uuidSchema = z.string().uuid('Invalid ID format');

const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const testatorSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
  body: z.object({
    id: uuidSchema.optional().nullable(),
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
    full_name: z.string().max(255).optional().nullable(),
    known_as: z.string().max(255).optional().nullable(),
    gender: z.enum(['male', 'female', 'trans', 'other']).optional().nullable(),
    building_number: z.string().max(50).optional().nullable(),
    building_name: z.string().max(100).optional().nullable(),
    street: z.string().max(255).optional().nullable(),
    town: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    national_insurance_number: z.string().max(20).optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    phone_country_code: z.string().max(10).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    marital_status: z.enum(Object.values((MARITAL_STATUSES))).optional().nullable(),
    include_future_marriage_clause: z.boolean().optional().nullable(),
    declaration_confirmed: z.boolean().optional().nullable(),
    jurisdiction_country: z.string().max(50).optional().nullable(),
    jurisdiction_region: z.string().max(50).optional().nullable(),
  }).passthrough(),
};

module.exports = {
  willIdParamSchema,
  testatorSchema,
};
