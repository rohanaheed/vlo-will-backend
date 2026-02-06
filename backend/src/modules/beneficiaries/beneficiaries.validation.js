const { z } = require('zod');

const { RELATIONSHIPS } = require('../../utils/constants');
const uuidSchema = z.string().uuid('Invalid ID format');

const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const childIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    childId: uuidSchema,
  }),
};

const guardianIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    guardianId: uuidSchema,
  }),
};

const trusteeIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    trusteeId: uuidSchema,
  }),
};

const beneficiaryIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    beneficiaryId: uuidSchema,
  }),
};

const charityIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    charityId: uuidSchema,
  }),
};

// Child Schema
const childSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  gender: z.enum(['male', 'female', 'trans', 'other']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values(RELATIONSHIPS)).optional().nullable(),
  building_number: z.string().max(50).optional().nullable(),
  building_name: z.string().max(100).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  town: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  inheritance_age: z.number().int().min(18).max(100).optional().nullable(),
}).passthrough();

// Guardian Schema
const guardianSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values(RELATIONSHIPS)).optional().nullable(),
  building_number: z.string().max(50).optional().nullable(),
  building_name: z.string().max(100).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  town: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  is_alternate: z.boolean().default(false),
}).passthrough();

// Trustee Schema
const trusteeSchema = z.object({
  id: uuidSchema.optional().nullable(),
  role_type: z.enum(['backup_guardian', 'trustee']).optional(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255).optional(),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values(RELATIONSHIPS)).optional().nullable(),
  building_number: z.string().max(50).optional().nullable(),
  building_name: z.string().max(100).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  town: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  include_all_general_powers: z.boolean().optional(),
  power_of_management: z.boolean().optional(),
  power_of_investment: z.boolean().optional(),
  power_to_delegate: z.boolean().optional(),
  power_in_relation_to_property: z.boolean().optional(),
  power_to_lend_and_borrow: z.boolean().optional(),
  power_to_apply_income_for_minors: z.boolean().optional(),
  power_to_make_advancements: z.boolean().optional(),
  power_to_appropriate_assets: z.boolean().optional(),
  power_to_act_by_majority: z.boolean().optional(),
  power_to_charge: z.boolean().optional(),
  power_to_invest_in_non_interest_accounts: z.boolean().optional(),
  additional_powers: z.string().max(2000).optional().nullable(),
}).passthrough();

// Beneficiary Schema
const beneficiarySchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  relationship_to_testator: z.enum(Object.values(RELATIONSHIPS)).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  is_alternate: z.boolean().default(false),
}).passthrough();

// Charity Schema
const charitySchema = z.object({
  id: uuidSchema.optional().nullable(),
  name: z.string().min(1).max(255),
  registration_number: z.string().max(100).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  gift_amount: z.number().min(0).optional().nullable(),
  gift_percentage: z.number().min(0).max(100).optional().nullable(),
  gift_description: z.string().max(1000).optional().nullable(),
  is_alternate: z.boolean().default(false),
}).passthrough();

// Create schemas
const createChildSchema = {
  params: willIdParamSchema.params,
  body: childSchema,
};

const createGuardianSchema = {
  params: willIdParamSchema.params,
  body: guardianSchema,
};

const createTrusteeSchema = {
  params: willIdParamSchema.params,
  body: trusteeSchema,
};

const createBeneficiarySchema = {
  params: willIdParamSchema.params,
  body: beneficiarySchema,
};

const createCharitySchema = {
  params: willIdParamSchema.params,
  body: charitySchema,
};

// Update schemas
const updateChildSchema = {
  params: childIdParamSchema.params,
  body: childSchema,
};

const updateGuardianSchema = {
  params: guardianIdParamSchema.params,
  body: guardianSchema,
};

const updateTrusteeSchema = {
  params: trusteeIdParamSchema.params,
  body: trusteeSchema,
};

const updateBeneficiarySchema = {
  params: beneficiaryIdParamSchema.params,
  body: beneficiarySchema,
};

const updateCharitySchema = {
  params: charityIdParamSchema.params,
  body: charitySchema,
};

// Reorder schemas
const reorderChildrenSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    child_ids: z.array(uuidSchema).min(1, 'At least one child ID required'),
  }),
};

const reorderGuardiansSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    guardian_ids: z.array(uuidSchema).min(1, 'At least one guardian ID required'),
  }),
};

const reorderTrusteesSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    trustee_ids: z.array(uuidSchema).min(1, 'At least one trustee ID required'),
  }),
};

const reorderBeneficiariesSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    beneficiary_ids: z.array(uuidSchema).min(1, 'At least one beneficiary ID required'),
  }),
};

const reorderCharitiesSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    charity_ids: z.array(uuidSchema).min(1, 'At least one charity ID required'),
  }),
};

module.exports = {
  childSchema,
  guardianSchema,
  trusteeSchema,
  beneficiarySchema,
  charitySchema,
  createChildSchema,
  createGuardianSchema,
  createTrusteeSchema,
  createBeneficiarySchema,
  createCharitySchema,
  updateChildSchema,
  updateGuardianSchema,
  updateTrusteeSchema,
  updateBeneficiarySchema,
  updateCharitySchema,
  reorderChildrenSchema,
  reorderGuardiansSchema,
  reorderTrusteesSchema,
  reorderBeneficiariesSchema,
  reorderCharitiesSchema,
  childIdParamSchema,
  guardianIdParamSchema,
  trusteeIdParamSchema,
  beneficiaryIdParamSchema,
  charityIdParamSchema,
  willIdParamSchema,
};
