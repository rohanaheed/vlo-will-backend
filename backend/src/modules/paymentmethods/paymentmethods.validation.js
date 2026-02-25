const { z } = require("zod");

const uuidSchema = z.string().uuid("Invalid ID format");

const createPaymentMethodSchema = z.object({
  id: uuidSchema.optional(),
  full_name: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  method_type: z.string().min(1).optional(),
  payment_type: z.string().min(1).optional(),
  stripe_payment_method_id: z.string().min(1).optional(),
  card_number: z.string().min(1).optional(),
  cvv: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  exp_month: z.number().optional(),
  exp_year: z.number().optional(),
  zip_code: z.string().min(1).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const updatePaymentMethodSchema = z.object({
  id: uuidSchema.optional(),
  full_name: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  method_type: z.string().min(1).optional(),
  payment_type: z.string().min(1).optional(),
  stripe_payment_method_id: z.string().min(1).optional(),
  card_number: z.string().min(1).optional(),
  cvv: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  exp_month: z.number().optional(),
  exp_year: z.number().optional(),
  zip_code: z.string().min(1).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

module.exports = { createPaymentMethodSchema, updatePaymentMethodSchema };
