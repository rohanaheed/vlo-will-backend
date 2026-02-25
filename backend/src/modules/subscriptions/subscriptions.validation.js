const { z, uuid } = require('zod')

const uuidSchema = z.string().uuid('Invalid ID format')

const createSubscriptionSchema = z.object({
    id: uuidSchema.optional(),
    user_id: uuidSchema.optional(),
    package_id: uuidSchema.optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive', 'expired', 'cancelled']).default('inactive'),
    auto_renew: z.boolean().default(true),
    stripe_subscription_id: z.string().optional()
})

const updateSubscriptionSchema = z.object({
    id: uuidSchema.optional(),
    user_id: uuidSchema.optional(),
    package_id: uuidSchema.optional(),
    payment_method_id: uuidSchema.optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive', 'expired', 'cancelled']).optional(),
    auto_renew: z.boolean().optional(),
    stripe_subscription_id: z.string().optional()
})

module.exports = { createSubscriptionSchema, updateSubscriptionSchema }