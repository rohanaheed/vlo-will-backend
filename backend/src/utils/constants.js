// User Roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

// Will Types
const WILL_TYPES = {
  GENERAL: 'general',
  ISLAMIC: 'islamic',
};

// Will Statuses
const WILL_STATUSES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SIGNED: 'signed',
};

// Marital Status
const MARITAL_STATUSES = {
  SINGLE: 'single',
  MARRIED: 'married',
  CIVIL_PARTNER: 'civil_partner',
  PREVIOUSLY_MARRIED: 'previously_married',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed',
  SEPARATED: 'separated',
  LIVING_AS_PARTNER: 'living_partner'
};

// Asset Types
const ASSET_TYPES = {
  PROPERTY: 'property',
  BANK_ACCOUNT: 'bank_account',
  INVESTMENT: 'investment',
  VEHICLE: 'vehicle',
  OTHER: 'other',
};

// Beneficiary Types
const BENEFICIARY_TYPES = {
  INDIVIDUAL: 'individual',
  CHARITY: 'charity',
};

// Subscription Plan Types
const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  PROFESSIONAL: 'professional',
};

// Subscription Statuses
const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
  EXPIRED: 'expired',
};

// Payment Statuses
const PAYMENT_STATUSES = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Islamic Schools of Thought
const ISLAMIC_SCHOOLS = {
  HANAFI: 'hanafi',
  MALIKI: 'maliki',
  SHAFII: 'shafii',
  HANBALI: 'hanbali',
  JAFARI: 'jafari',
};

// Islamic Heir Relationships
const ISLAMIC_HEIR_RELATIONSHIPS = {
  HUSBAND: 'husband',
  WIFE: 'wife',
  SON: 'son',
  DAUGHTER: 'daughter',
  FATHER: 'father',
  MOTHER: 'mother',
  FULL_BROTHER: 'full_brother',
  FULL_SISTER: 'full_sister',
  PATERNAL_BROTHER: 'paternal_brother',
  PATERNAL_SISTER: 'paternal_sister',
  MATERNAL_BROTHER: 'maternal_brother',
  MATERNAL_SISTER: 'maternal_sister',
  GRANDFATHER: 'grandfather',
  GRANDMOTHER: 'grandmother',
  GRANDSON: 'grandson',
  GRANDDAUGHTER: 'granddaughter',
};

// Common Relationships for Beneficiaries/Executors
const RELATIONSHIPS = [
  'spouse',
  'son',
  'daughter',
  'father',
  'mother',
  'brother',
  'sister',
  'grandfather',
  'grandmother',
  'grandson',
  'granddaughter',
  'uncle',
  'aunt',
  'nephew',
  'niece',
  'cousin',
  'friend',
  'partner',
  'parent',
  'child',
  'stepson',
  'stepdaughter',
  'stepfather',
  'stepmother',
  'stepbrother',
  'stepsister',
  'father_in_law',
  'mother_in_law',
  'son_in_law',
  'daughter_in_law',
  'brother_in_law',
  'sister_in_law',
  'legal_guardian',
  'civil_partner', 
  'long_term_partner',
  'adopted_child',
  'other',
];

// Will Form Steps
const WILL_STEPS = {
  GENERAL: {
    YOUR_DETAILS: 1,
    EXECUTORS: 2,
    SPOUSE: 3,
    BENEFICIARIES: 4,
    ASSESTS: 5,
    LIABILITIES: 6,
    GIFTS: 7,
    RESIDUAL: 8,
    FUNERAL: 9,
    WITNESSES: 10,
    SIGNING: 11
  },
  ISLAMIC: {
    YOUR_DETAILS: 1,
    FAITH: 2,
    EXECUTORS: 3,
    SPOUSE: 4,
    BENEFICIARIES: 5,
    ASSESTS: 6,
    LIABILITIES: 7,
    GIFTS: 8,
    FUNERAL: 9,
    DISTRIBUTION: 10,
    WITNESSES: 11,
    SIGNING: 12
  }
};

// Total Step Counts
const TOTAL_STEPS = {
  GENERAL: 11,
  ISLAMIC: 12
};

// Audit Actions
const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFIED: 'email_verified',
  ROLE_ASSIGNED: 'role_assigned',
  PERMISSION_CHANGED: 'permission_changed',
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  ROLES,
  WILL_TYPES,
  WILL_STATUSES,
  MARITAL_STATUSES,
  ASSET_TYPES,
  BENEFICIARY_TYPES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  PAYMENT_STATUSES,
  ISLAMIC_SCHOOLS,
  ISLAMIC_HEIR_RELATIONSHIPS,
  RELATIONSHIPS,
  WILL_STEPS,
  TOTAL_STEPS,
  AUDIT_ACTIONS,
  HTTP_STATUS,
};
