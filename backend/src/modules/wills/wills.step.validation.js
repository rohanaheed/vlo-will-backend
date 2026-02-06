const { z } = require('zod');

const { MARITAL_STATUSES, RELATIONSHIPS } = require('../../utils/constants')
const uuidSchema = z.string().uuid('Invalid ID format');
  
// Step 1: Testator
const step1Schema = z.object({
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
}).passthrough();


// Step 2: EXECUTORS
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

const step2Schema = z.object({
  executors: z.array(executorSchema).optional().default([]),
}).passthrough();

// Step 3: SPOUSE
const spouseSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().max(255).optional().nullable(),
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
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable(),
}).passthrough();

const step3Schema = z.object({
  is_spouse: z.boolean().optional().default(false),
  spouse: z.array(spouseSchema).optional().default([])
}).passthrough();

// STEP 4: CHILDREN, GUARDIANS, TRUSTEES, BENEFICIARIES, CHARITIES
const childSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  gender: z.enum(['male', 'female', 'trans', 'other']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable(),
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

const guardianSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.string().max(100),
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

const trusteeSchema = z.object({
  id: uuidSchema.optional().nullable(),
  role_type: z.enum(['backup_guardian', 'trustee']).optional(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255).optional(),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable(),
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

const beneficiarySchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  is_alternate: z.boolean().default(false)
}).passthrough();

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

const step4Schema = z.object({
  have_children: z.boolean().optional().default(false),
  children: z.array(childSchema).optional().default([]),
  guardians: z.array(guardianSchema).optional().default([]),
  wants_backup: z.boolean().optional().default(false),
  trustees: z.array(trusteeSchema).optional().default([]),
  beneficiaries: z.array(beneficiarySchema).optional().default([]),
  has_charity: z.boolean().optional().default(false),
  charities: z.array(charitySchema).optional().default([]),
}).passthrough();

// STEP 5: ASSETS
const assetsSchema = z.object({
  id: uuidSchema.optional().nullable(),
  type: z.enum(['property', 'savings', 'investments', 'business', 'other']).optional()
}).passthrough();

const step5Schema = z.object({
  assets: z.array(assetsSchema).optional().default([]),
}).passthrough();

// STEP 6: LIABILITIES
const debtsSchema = z.object({
  id: uuidSchema.optional().nullable(),
  type: z.enum(['mortgage', 'loan', 'credit_card', 'other']).optional(),
}).passthrough();

const step6Schema = z.object({
  debts: z.array(debtsSchema).optional().default([]),
}).passthrough();

// STEP 7: GIFTS
const giftsSchema = z.object({
  id: uuidSchema.optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
}).passthrough();

const step7Schema = z.object({
  gifts: z.array(giftsSchema).optional().default([]),
}).passthrough();

// STEP 8: RESIDUAL
const residualSchema = z.object({
  id: uuidSchema.optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
}).passthrough();

const step8Schema = z.object({
  residual: z.array(residualSchema).optional().default([]),
}).passthrough();

// STEP 9: FUNERAL
const funeralSchema = z.object({
  id: uuidSchema.optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
}).passthrough();

const step9Schema = z.object({
  funeral: z.array(funeralSchema).optional().default([]),
}).passthrough();

// STEP 10: WITNESSES
const witnessSchema = z.object({
  id: uuidSchema.optional().nullable(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().min(1).max(255),
  date_of_birth: z.string().optional().nullable(),
  relationship_to_testator: z.enum(Object.values((RELATIONSHIPS))).optional().nullable()
}).passthrough();

const step10Schema = z.object({
  witnesses: z.array(witnessSchema).optional().default([]),
}).passthrough();

// STEP 11: SIGNING
const step11Schema = z.object({
  additional_clauses: z.array(z.object({
    title: z.string().optional(),
    content: z.string(),
  })).optional().default([]),
}).passthrough();

// ISLAMIC STEP 2: FAITH
const islamicStep2Schema = z.object({
  include_shahada: z.boolean().optional().default(false),
}).passthrough();

// ISLAMIC STEP 10: DISBRIBUTION
const disbributionSchema = z.object({
  id: uuidSchema.optional().nullable(),
  default_inheritance_share: z.boolean().optional().default(false)
}).passthrough();

const islamicStep10Schema = z.object({
  disbributions: z.array(disbributionSchema).optional().default([]),
}).passthrough();

// STEP SCHEMA MAPS
const GENERAL_STEP_SCHEMAS = {
  1: step1Schema,      
  2: step2Schema,    
  3: step3Schema, 
  4: step4Schema,
  5: step5Schema, 
  6: step6Schema,      
  7: step7Schema,
  8: step8Schema,     
  9: step9Schema,      
  10: step10Schema,   
  11: step11Schema
};

const ISLAMIC_STEP_SCHEMAS = {
  1: step1Schema,             
  2: islamicStep2Schema,
  3: step2Schema,          
  4: step3Schema,       
  5: step4Schema,              
  6: step5Schema,        
  7: step6Schema,             
  8: step7Schema,       
  9: step9Schema,         
  10: islamicStep10Schema,
  11: step10Schema,     
  12: step11Schema     
};

// VALIDATION SCHEMAS
const saveStepSchema = {
  params: z.object({
    id: uuidSchema,
    stepNumber: z.string().refine((s) => {
      const n = parseInt(s, 10);
      return !isNaN(n) && n >= 1 && n <= 12;
    }, {
      message: 'Step number must be between 1 and 11 for general wills, or between 1 and 12 for Islamic wills',
    }),
  }),
  body: z.object({
    data: z.object({}).passthrough().optional(),
    action: z.enum(['save', 'save_and_continue', 'save_and_back', 'skip_and_continue']).optional(),
  }).passthrough(),
};

const getStepSchema = {
  params: z.object({
    id: uuidSchema,
    stepNumber: z.string().refine((s) => {
      const n = parseInt(s, 10);
      return !isNaN(n) && n >= 1 && n <= 12;
    }, {
      message: 'Step number must be between 1 and 11 for general wills, or between 1 and 12 for Islamic wills',
    }),
  }),
};

// VALIDATION FUNCTION
const validateStepData = (stepNumber, data, willType = 'general') => {
  const step = Number(stepNumber);

  const stepMap =
    willType === 'islamic'
      ? ISLAMIC_STEP_SCHEMAS
      : GENERAL_STEP_SCHEMAS;

  const schema = stepMap[step];

  if (!schema) {
    return {
      success: false,
      error: `No schema for step ${step} (${willType} will)`
    };
  }

  return schema.safeParse(data);
};

module.exports = {
  saveStepSchema,
  getStepSchema,
  validateStepData,
  GENERAL_STEP_SCHEMAS,
  ISLAMIC_STEP_SCHEMAS
};
