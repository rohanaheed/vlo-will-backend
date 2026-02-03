const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

// Step 1: Testator (Updated to match Figma)
const step1Schema = z.object({
  // Personal Details
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Mx']).optional().nullable(),
  full_name: z.string().max(255).optional().nullable(),
  known_as: z.string().max(255).optional().nullable(), // "Known by any other name"
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
  phone_country_code: z.string().max(10).optional().nullable(), // e.g., "+44"
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
    'living_as_partners'
  ]).optional().nullable(),
  include_future_marriage_clause: z.boolean().optional().nullable(), // Keep will valid after marriage
  declaration_confirmed: z.boolean().optional().nullable(), // Over 18, sound mind checkbox
  
  // Jurisdiction (stored on wills table)
  jurisdiction: z.enum([
    'england',
    'wales', 
    'scotland',
    'northern_ireland'
  ]).optional().nullable(),
  
  // Legacy fields (keep for backward compatibility)
  first_name: z.string().max(100).optional().nullable(),
  middle_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
}).passthrough();

// Step 3: Executors (Updated to match Figma)
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
    'other'
  ]).optional().nullable(),
  
  // For Professional Advisor executors
  business_name: z.string().max(255).optional().nullable(),
  role_title: z.enum([
    'solicitor',
    'accountant',
    'manager',
    'financial_advisor',
    'other'
  ]).optional().nullable(),
  
  // Contact details (shared)
  phone_country_code: z.string().max(10).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  
  // Executor role flags
  is_alternate: z.boolean().optional().default(false), // Alternate Executor
  is_backup: z.boolean().optional().default(false),    // Backup Executor
  is_spouse: z.boolean().optional().default(false),    // Is this the spouse
  
  // Legacy address fields (keep for compatibility)
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  building_number: z.string().max(50).optional().nullable(),
  building_name: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
}).passthrough();

const step3Schema = z.object({
  executors: z.array(executorSchema).optional().default([]),
}).passthrough();

// Step 2: Spouse
const step2Schema = z.object({
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
  is_spouse: z.boolean().optional().default(false)
}).passthrough();


// Step 4: Children
const childSchema = z.object({
  id: z.string().optional().nullable(),
  full_name: z.string().min(1).max(255),
  date_of_birth: z.string().optional().nullable(),
  is_minor: z.boolean().optional().default(false),
  is_dependent: z.boolean().optional().default(false),
}).passthrough();

const step4Schema = z.object({
  children: z.array(childSchema).optional().default([]),
}).passthrough();

// Step 5: Guardians
const guardianSchema = z.object({
  id: z.string().optional().nullable(),
  full_name: z.string().min(1).max(255),
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  relationship_to_testator: z.string().max(100).optional().nullable(),
  is_substitute: z.boolean().optional().default(false),
}).passthrough();

const step5Schema = z.object({
  guardians: z.array(guardianSchema).optional().default([]),
}).passthrough();

// Step 6: Inheritance Age
const step6Schema = z.object({
  delay_inheritance: z.boolean().optional().default(false),
  inheritance_age: z.number().int().min(18).max(100).optional().nullable(),
}).passthrough();

// Step 7 & 8: Beneficiaries
const beneficiarySchema = z.object({
  id: z.string().optional().nullable(),
  beneficiary_type: z.enum(['individual', 'charity']).optional().default('individual'),
  full_name: z.string().max(255).optional().nullable(),
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  relationship_to_testator: z.string().max(100).optional().nullable(),
  share_percentage: z.number().min(0).max(100).optional().nullable(),
  specific_gift_description: z.string().max(1000).optional().nullable(),
  inheritance_age: z.number().int().min(18).max(100).optional().nullable(),
  pass_to_children_if_deceased: z.boolean().optional().default(true),
  is_alternate: z.boolean().optional().default(false),
  alternate_for_id: z.string().optional().nullable(),
}).passthrough();

const charitySchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(1).max(255),
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  registration_number: z.string().max(100).optional().nullable(),
  gift_amount: z.number().min(0).optional().nullable(),
  gift_percentage: z.number().min(0).max(100).optional().nullable(),
  gift_description: z.string().max(1000).optional().nullable(),
  is_alternate: z.boolean().optional().default(false),
  alternate_for_id: z.string().optional().nullable(),
}).passthrough();

const step7Schema = z.object({
  beneficiaries: z.array(beneficiarySchema).optional().default([]),
  charities: z.array(charitySchema).optional().default([]),
}).passthrough();

const step8Schema = z.object({
  beneficiaries: z.array(beneficiarySchema).optional().default([]),
}).passthrough();

// Step 9: Total Failure
const wipeoutBeneficiarySchema = z.object({
  beneficiary_type: z.enum(['individual', 'charity']).optional().default('individual'),
  full_name: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  share_percentage: z.number().min(0).max(100).optional().nullable(),
  is_alternate: z.boolean().optional().default(false),
}).passthrough();

const step9Schema = z.object({
  distribution_type: z.enum(['equal_family', 'custom']).optional().default('equal_family'),
  wipeout_beneficiaries: z.array(wipeoutBeneficiarySchema).optional().default([]),
}).passthrough();

// Step 10: Pets
const petSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  fund_amount: z.number().min(0).optional().nullable(),
  let_executor_appoint_caretaker: z.boolean().optional().default(true),
  caretaker_name: z.string().max(255).optional().nullable(),
  caretaker_address: z.string().max(500).optional().nullable(),
}).passthrough();

const step10Schema = z.object({
  pets: z.array(petSchema).optional().default([]),
}).passthrough();

// Step 11: Additional Instructions
const additionalClauseSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  content: z.string().max(2000),
}).passthrough();

const funeralWishesSchema = z.object({
  wishes_details: z.string().max(2000).optional().nullable(),
  expense_clause: z.string().max(1000).optional().nullable(),
  islamic_burial_wishes: z.string().max(2000).optional().nullable(),
}).passthrough();

const step11Schema = z.object({
  additional_clauses: z.array(additionalClauseSchema).optional().default([]),
  funeral_wishes: funeralWishesSchema.optional().nullable(),
}).passthrough();

// Step 12: Signing
const witnessSchema = z.object({
  id: z.string().optional().nullable(),
  full_name: z.string().min(1).max(255),
  address_line_1: z.string().max(255).optional().nullable(),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  county: z.string().max(100).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
}).passthrough();

const step12Schema = z.object({
  signing_date: z.string().optional().nullable(),
  signing_place: z.string().max(255).optional().nullable(),
  witnesses: z.array(witnessSchema).optional().default([]),
}).passthrough();

// Islamic Steps
const step13Schema = z.object({
  school_of_thought: z.enum(['hanafi', 'maliki', 'shafii', 'hanbali', 'jafari']).optional().nullable(),
  declaration_of_faith: z.string().max(2000).optional().nullable(),
}).passthrough();

const step14Schema = z.object({
  unfulfilled_obligations: z.object({
    missed_prayers: z.boolean().optional().default(false),
    missed_fasting: z.boolean().optional().default(false),
    unpaid_zakat: z.boolean().optional().default(false),
    hajj_not_performed: z.boolean().optional().default(false),
    details: z.string().max(1000).optional().nullable(),
  }).optional().nullable(),
  kaffarah_description: z.string().max(1000).optional().nullable(),
  kaffarah_amount: z.number().min(0).optional().nullable(),
  unpaid_mahr: z.number().min(0).optional().nullable(),
}).passthrough();

const step15Schema = z.object({
  charitable_bequest_percentage: z.number().min(0).max(33.34).optional().nullable(),
  sadaqa_jariyah_details: z.string().max(2000).optional().nullable(),
  loan_forgiveness_details: z.string().max(1000).optional().nullable(),
}).passthrough();

const heirSchema = z.object({
  relationship: z.enum([
    'husband', 'wife', 'son', 'daughter', 'father', 'mother',
    'full_brother', 'full_sister', 'paternal_brother', 'paternal_sister',
    'maternal_brother', 'maternal_sister', 'grandfather', 'grandmother',
    'grandson', 'granddaughter'
  ]),
  full_name: z.string().max(255).optional().nullable(),
  is_alive: z.boolean().optional().default(true),
  calculated_share: z.number().min(0).max(100).optional().nullable(),
}).passthrough();

const step16Schema = z.object({
  heirs: z.array(heirSchema).optional().default([]),
  appointed_scholar_name: z.string().max(255).optional().nullable(),
  appointed_scholar_contact: z.string().max(255).optional().nullable(),
}).passthrough();

// Map step numbers to their schemas
// Step 2 = Executors, Step 3 = Spouse (swapped)
const stepSchemas = {
  1: step1Schema,
  2: step3Schema,  // Executors (was step 3)
  3: step2Schema,  // Spouse (was step 2)
  4: step4Schema,
  5: step5Schema,
  6: step6Schema,
  7: step7Schema,
  8: step8Schema,
  9: step9Schema,
  10: step10Schema,
  11: step11Schema,
  12: step12Schema,
  13: step13Schema,
  14: step14Schema,
  15: step15Schema,
  16: step16Schema,
};

// Main save step validation - using passthrough to allow any data
const saveStepSchema = {
  params: z.object({
    id: uuidSchema,
    stepNumber: z.string().refine((s) => {
      const n = parseInt(s, 10);
      return !isNaN(n) && n >= 1 && n <= 16;
    }, {
      message: 'Step number must be between 1 and 16',
    }),
  }),
  body: z.object({
    data: z.object({}).passthrough().optional(),
    action: z.enum(['save', 'save_and_continue', 'save_and_back', 'skip_and_continue']).optional(),
  }).passthrough(),
};

// Get step data validation
const getStepSchema = {
  params: z.object({
    id: uuidSchema,
    stepNumber: z.string().refine((s) => {
      const n = parseInt(s, 10);
      return !isNaN(n) && n >= 1 && n <= 16;
    }, {
      message: 'Step number must be between 1 and 16',
    }),
  }),
};

// Dynamic step validation function
const validateStepData = (stepNumber, data) => {
  const schema = stepSchemas[stepNumber];
  if (!schema) {
    return { success: false, error: `No schema for step ${stepNumber}` };
  }
  return schema.safeParse(data);
};

module.exports = {
  saveStepSchema,
  getStepSchema,
  validateStepData,
  stepSchemas,
};
