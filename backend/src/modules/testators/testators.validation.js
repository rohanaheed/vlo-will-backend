const { z } = require('zod');

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
    full_name: z.string().max(255).optional(),
    first_name: z.string().max(100).optional(),
    middle_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional(),
    date_of_birth: z.string().date().optional().nullable(),
    father_name: z.string().max(255).optional().nullable(),
    husband_name: z.string().max(255).optional().nullable(),
    address_line_1: z.string().max(255).optional().nullable(),
    address_line_2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    has_property_abroad: z.boolean().optional(),
    national_id: z.string().max(100).optional().nullable(),
    passport_number: z.string().max(100).optional().nullable(),
  }),
};

module.exports = {
  willIdParamSchema,
  testatorSchema,
};
