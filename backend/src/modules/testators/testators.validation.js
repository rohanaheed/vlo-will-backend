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
    // Personal Details
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
    full_name: z.string().max(255).optional().nullable(),
    known_as: z.string().max(255).optional().nullable(),
    gender: z.enum(['male', 'female', 'trans', 'other']).optional().nullable(),

    // Address Details
    building_number: z.string().max(50).optional().nullable(),
    building_name: z.string().max(100).optional().nullable(),
    street: z.string().max(255).optional().nullable(),
    town: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    county: z.string().max(100).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),

    // Identification
    national_insurance_number: z.string().max(20).optional().nullable(),
    date_of_birth: z.string().optional().nullable(),

    // Contact
    phone_country_code: z.string().max(10).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),

    // Marital Status & Legal
    marital_status: z.enum([
      'single',
      'married',
      'divorced',
      'widowed',
      'civil_partner',
      'previously_married',
      'separated',
      'living_as_partners',
    ]).optional().nullable(),
    include_future_marriage_clause: z.boolean().optional().nullable(),
    declaration_confirmed: z.boolean().optional().nullable(),

    // Jurisdiction
    jurisdiction: z.enum([
      'england',
      'wales',
      'scotland',
      'northern_ireland',
    ]).optional().nullable(),

    // Legacy fields (keep for backward compatibility)
    first_name: z.string().max(100).optional().nullable(),
    middle_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    address_line_1: z.string().max(255).optional().nullable(),
    address_line_2: z.string().max(255).optional().nullable(),
    father_name: z.string().max(255).optional().nullable(),
    husband_name: z.string().max(255).optional().nullable(),
    has_property_abroad: z.boolean().optional().nullable(),
    national_id: z.string().max(100).optional().nullable(),
    passport_number: z.string().max(100).optional().nullable(),
  }).passthrough(),
};

module.exports = {
  willIdParamSchema,
  testatorSchema,
};
