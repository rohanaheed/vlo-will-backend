const { z } = require('zod')

const uuidSchema = z.string().uuid('Invalid ID format')

const createPackageSchema = z.object({
    id: uuidSchema.optional(),
    name: z.string().min(1, 'Name is required'),
    subscription_type: z.enum(['paid', 'free', 'trial', 'one_time'], 'Invalid subscription type'),
    currency: z.string().min(1, 'Currency is required'),
    billing_cycle: z.enum(['monthly', 'yearly', 'one_time'], 'Invalid billing type'),
    price_monthly: z.number().min(0, 'Price must be a positive number').optional(),
    price_yearly: z.number().min(0, 'Price must be a positive number').optional(),
    price_one_time: z.number().min(0, 'Price must be a positive number').optional(),
    discount: z.string().optional(),
    trial_days: z.number().min(0, 'Trial days must be a non-negative number').optional(),
    before_day: z.number().min(0, 'Before day must be a non-negative number').optional(),
    trial_message: z.string().optional(),
    status: z.enum(['active', 'inactive'], 'Invalid status').optional(),
    included_features: z.array(z.string(), 'Included features must be an array of strings').optional(),
    strip_product_id: z.string().optional(),
    stripe_price_yearly_id: z.string().optional(),
    stripe_price_monthly_id: z.string().optional(),
    stripe_one_time_price_id: z.string().optional()
})

const updatePackageSchema = z.object({
    id: uuidSchema.optional(),
    name: z.string().min(1, 'Name is required').optional(),
    subscription_type: z.enum(['paid', 'free', 'trial'], 'Invalid subscription type'),
    currency: z.string().min(1, 'Currency is required').optional(),
    billing_cycle: z.enum(['monthly', 'yearly', 'one_time'], 'Invalid billing type'),
    price_monthly: z.number().min(0, 'Price must be a positive number').optional(),
    price_yearly: z.number().min(0, 'Price must be a positive number').optional(),
    price_one_time: z.number().min(0, 'Price must be a positive number').optional(),
    discount: z.string().optional(),
    trial_days: z.number().min(0, 'Trial days must be a non-negative number').optional(),
    before_day: z.number().min(0, 'Before day must be a non-negative number').optional(),
    trial: z.string().optional(),
    status: z.enum(['active', 'inactive'], 'Invalid status').optional(),
    included_features: z.array(z.string(), 'Included features must be an array of strings').optional(),
    stripe_product_id: z.string().optional(),
    stripe_price_yearly_id: z.string().optional(),
    stripe_price_monthly_id: z.string().optional(),
    stripe_one_time_price_id: z.string().optional()
})

module.exports = { createPackageSchema, updatePackageSchema }