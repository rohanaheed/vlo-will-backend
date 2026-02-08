const { z } = require('zod');
const { RELATIONSHIPS } = require('../../utils/constants');

const uuidSchema = z.string().uuid('Invalid ID format');

const titleSchema = z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable();

const genderSchema = z.enum(['male', 'female', 'trans', 'other']).optional().nullable();

const relationshipSchema = z.enum(Object.values(RELATIONSHIPS)).optional().nullable();

// Address fields
const addressSchema = {
  building_number: z.string().trim().max(50).optional().nullable(),
  building_name: z.string().trim().max(100).optional().nullable(),
  street: z.string().trim().max(255).optional().nullable(),
  town: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
};

// Contact fields
const contactSchema = {
  phone_country_code: z.string().trim().max(10).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().email('Invalid email format').trim().max(255).optional().nullable(),
};

// Param Schemas
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
  title: titleSchema,
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  gender: genderSchema,
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: relationshipSchema,
  ...addressSchema,
  inheritance_age: z.number().int().min(18, 'Inheritance age must be at least 18').max(100, 'Inheritance age must be at most 100').optional().nullable(),
});

// Guardian Schema
const guardianSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: titleSchema,
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: relationshipSchema,
  ...addressSchema,
  ...contactSchema,
  is_alternate: z.boolean().default(false),
});

// Trustee Schema
const trusteeSchema = z.object({
  id: uuidSchema.optional().nullable(),
  role_type: z.enum(['backup_guardian', 'trustee']).optional(),
  title: titleSchema,
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: relationshipSchema,
  ...addressSchema,
  ...contactSchema,
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
  additional_powers: z.string().trim().max(2000).optional().nullable(),
});

// Beneficiary Schema
const beneficiarySchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: titleSchema,
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  relationship_to_testator: relationshipSchema,
  city: z.string().trim().max(100).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  ...contactSchema,
  is_alternate: z.boolean().default(false),
});

// Charity Schema
const charitySchema = z.object({
  id: uuidSchema.optional().nullable(),
  name: z.string().trim().min(1, 'Charity name is required').max(255),
  registration_number: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  gift_amount: z.number().min(0, 'Gift amount must be positive').optional().nullable(),
  gift_percentage: z.number().min(0, 'Gift percentage must be at least 0').max(100, 'Gift percentage must be at most 100').optional().nullable(),
  gift_description: z.string().trim().max(1000).optional().nullable(),
  is_alternate: z.boolean().default(false),
}).refine(
  (data) => {
    // Either gift_amount or gift_percentage
    const hasAmount = data.gift_amount !== null && data.gift_amount !== undefined;
    const hasPercentage = data.gift_percentage !== null && data.gift_percentage !== undefined;
    return hasAmount !== hasPercentage;
  },
  {
    message: 'Provide either gift_amount or gift_percentage, not both',
    path: ['gift_amount'],
  }
);

// Create Schemas
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

// Update Schemas
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

// Recorder Schema
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
  
  // Create schemas
  createChildSchema,
  createGuardianSchema,
  createTrusteeSchema,
  createBeneficiarySchema,
  createCharitySchema,
  
  // Update schemas
  updateChildSchema,
  updateGuardianSchema,
  updateTrusteeSchema,
  updateBeneficiarySchema,
  updateCharitySchema,
  
  // Reorder schemas
  reorderChildrenSchema,
  reorderGuardiansSchema,
  reorderTrusteesSchema,
  reorderBeneficiariesSchema,
  reorderCharitiesSchema,
  
  // Param schemas
  childIdParamSchema,
  guardianIdParamSchema,
  trusteeIdParamSchema,
  beneficiaryIdParamSchema,
  charityIdParamSchema,
  willIdParamSchema,
};