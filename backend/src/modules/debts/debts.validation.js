const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid ID format');

// Debt Schema
const debtSchema = z.object({
  id: uuidSchema.optional().nullable(),
  creditor_name: z.string().max(255).optional().nullable(),
  outstanding_balance: z.number().min(0).optional().nullable(),
  type_of_debt: z.string().max(255).optional().nullable(),
  additional_information: z.string().max(1000).optional().nullable(),
});

// Param Schemas
const willIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
  }),
};

const debtIdParamSchema = {
  params: z.object({
    willId: uuidSchema,
    debtId: uuidSchema,
  }),
};

// Create Schema
const createDebtSchema = {
  params: willIdParamSchema.params,
  body: debtSchema,
};

// Update Schema
const updateDebtSchema = {
  params: debtIdParamSchema.params,
  body: debtSchema,
};

// Reorder Schema
const reorderDebtsSchema = {
  params: willIdParamSchema.params,
  body: z.object({
    debt_ids: z.array(uuidSchema).min(1, 'At least one debt ID required'),
  }),
};

// Step 6 Schema
const step6DebtSchema = z.object({
  is_debtor: z.boolean().optional().default(false),
  debts: z.array(debtSchema).optional().default([]),
});

module.exports = {
  debtSchema,
  step6DebtSchema,
  
  // Create/Update schemas
  createDebtSchema,
  updateDebtSchema,
  
  // Reorder schema
  reorderDebtsSchema,
  
  // Param schemas
  debtIdParamSchema,
  willIdParamSchema,
};