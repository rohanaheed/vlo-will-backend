const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

// Property Assets Schema
const propertyAssetSchema = z.object({
  id: uuidSchema.optional().nullable(),
  building_number: z.string().trim().max(50).optional().nullable(),
  building_name: z.string().trim().max(100).optional().nullable(),
  street: z.string().trim().max(255).optional().nullable(),
  town: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  ownership_type: z.string().trim().max(100).optional().nullable(),
  estimated_value: z.number().min(0, 'Estimated value must be positive').optional().nullable(),
  mortgage_outstanding: z.number().min(0, 'Mortgage outstanding must be positive').optional().nullable(),
  property_type: z.string().trim().max(100).optional().nullable(),
});

// Bank Accounts Schema
const bankAccountSchema = z.object({
  id: uuidSchema.optional().nullable(),
  institution_name: z.string().trim().max(255).optional().nullable(),
  account_type: z.string().trim().max(100).optional().nullable(),
  account_number: z.string().trim().max(100).optional().nullable(),
  sort_code: z.string().trim().max(20).optional().nullable(),
  estimated_balance: z.number().min(0, 'Estimated balance must be positive').optional().nullable(),
  additional_information: z.string().trim().max(1000).optional().nullable(),
});

// Investments Schema
const investmentSchema = z.object({
  id: uuidSchema.optional().nullable(),
  investment_type: z.string().trim().max(100).optional().nullable(),
  institution_name: z.string().trim().max(255).optional().nullable(),
  account_number: z.string().trim().max(100).optional().nullable(),
  estimated_value: z.number().min(0, 'Estimated value must be positive').optional().nullable(),
  additional_information: z.string().trim().max(1000).optional().nullable(),
});

// Valuable Items Schema
const valuableItemSchema = z.object({
  id: uuidSchema.optional().nullable(),
  item_type: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  estimated_value: z.number().min(0, 'Estimated value must be positive').optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  additional_information: z.string().trim().max(1000).optional().nullable(),
});

// Digital Assets Schema
const digitalAssetSchema = z.object({
  id: uuidSchema.optional().nullable(),
  asset_type: z.string().trim().max(50).optional().nullable(),
  platform: z.string().trim().max(255).optional().nullable(),
  account_id: z.string().trim().max(255).optional().nullable(),
  additional_information: z.string().trim().max(1000).optional().nullable(),
});

// Intellectual Assets Schema
const intellectualAssetSchema = z.object({
  id: uuidSchema.optional().nullable(),
  asset_type: z.string().trim().max(50).optional().nullable(),
  title: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.string().trim().max(50).optional().nullable(),
});

// Params Schemas
const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const propertyIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    propertyId: uuidSchema,
  }),
};

const accountIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    accountId: uuidSchema,
  }),
};

const investmentIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    investmentId: uuidSchema,
  }),
};

const itemIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    itemId: uuidSchema,
  }),
};

const assetIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    assetId: uuidSchema,
  }),
};

// Create Schemas
const createPropertyAssetSchema = {
  params: willIdParamSchema.params,
  body: propertyAssetSchema,
};

const createBankAccountSchema = {
  params: willIdParamSchema.params,
  body: bankAccountSchema,
};

const createInvestmentSchema = {
  params: willIdParamSchema.params,
  body: investmentSchema,
};

const createValuableItemSchema = {
  params: willIdParamSchema.params,
  body: valuableItemSchema,
};

const createDigitalAssetSchema = {
  params: willIdParamSchema.params,
  body: digitalAssetSchema,
};

const createIntellectualAssetSchema = {
  params: willIdParamSchema.params,
  body: intellectualAssetSchema,
};

// Update Schemas
const updatePropertyAssetSchema = {
  params: propertyIdParamSchema.params,
  body: propertyAssetSchema,
};

const updateBankAccountSchema = {
  params: accountIdParamSchema.params,
  body: bankAccountSchema,
};

const updateInvestmentSchema = {
  params: investmentIdParamSchema.params,
  body: investmentSchema,
};

const updateValuableItemSchema = {
  params: itemIdParamSchema.params,
  body: valuableItemSchema,
};

const updateDigitalAssetSchema = {
  params: assetIdParamSchema.params,
  body: digitalAssetSchema,
};

const updateIntellectualAssetSchema = {
  params: assetIdParamSchema.params,
  body: intellectualAssetSchema,
};

// Recorder Schemas
const reorderPropertyAssetsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    property_ids: z.array(uuidSchema).min(1, 'At least one property ID required'),
  }),
};

const reorderBankAccountsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    account_ids: z.array(uuidSchema).min(1, 'At least one account ID required'),
  }),
};

const reorderInvestmentsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    investment_ids: z.array(uuidSchema).min(1, 'At least one investment ID required'),
  }),
};

const reorderValuableItemsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    item_ids: z.array(uuidSchema).min(1, 'At least one item ID required'),
  }),
};

const reorderDigitalAssetsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    asset_ids: z.array(uuidSchema).min(1, 'At least one asset ID required'),
  }),
};

const reorderIntellectualAssetsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    asset_ids: z.array(uuidSchema).min(1, 'At least one asset ID required'),
  }),
};

module.exports = {
  // Schemas
  propertyAssetSchema,
  bankAccountSchema,
  investmentSchema,
  valuableItemSchema,
  digitalAssetSchema,
  intellectualAssetSchema,
  
  // Create schemas
  createPropertyAssetSchema,
  createBankAccountSchema,
  createInvestmentSchema,
  createValuableItemSchema,
  createDigitalAssetSchema,
  createIntellectualAssetSchema,
  
  // Update schemas
  updatePropertyAssetSchema,
  updateBankAccountSchema,
  updateInvestmentSchema,
  updateValuableItemSchema,
  updateDigitalAssetSchema,
  updateIntellectualAssetSchema,
  
  // Reorder schemas
  reorderPropertyAssetsSchema,
  reorderBankAccountsSchema,
  reorderInvestmentsSchema,
  reorderValuableItemsSchema,
  reorderDigitalAssetsSchema,
  reorderIntellectualAssetsSchema,
  
  // Param schemas
  propertyIdParamSchema,
  accountIdParamSchema,
  investmentIdParamSchema,
  itemIdParamSchema,
  assetIdParamSchema,
  willIdParamSchema,
};