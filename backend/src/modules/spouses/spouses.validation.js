const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const spouseSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
  body: z.object({
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
    full_name: z.string().max(255).optional().nullable(),
    building_number: z.string().max(50).optional().nullable(),
    building_name: z.string().max(100).optional().nullable(),
    address_line_1: z.string().max(255).optional().nullable(),
    address_line_2: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    phone_country_code: z.string().max(10).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    relationship_to_testator: z.string().max(100).optional().nullable(),
    is_same_address: z.boolean().optional().nullable(),
    is_spouse: z.boolean().optional().default(false),
  }).passthrough(),
};

module.exports = {
  willIdParamSchema,
  spouseSchema,
};
