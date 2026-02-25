const { z } = require('zod');
const uuidSchema = z.string().uuid('Invalid ID format');

const createFeedbackSchema = z.object({
  id: uuidSchema.optional(),
  ease_of_use: z.string().optional().nullable(),
  improvement_area: z.string().optional().nullable(),
  clarity_rating: z.string().optional().nullable(),
  navigation_rating: z.string().optional().nullable(),
  overall_rating: z.number().min(1).max(5),
  review: z.string().optional().nullable(),
  is_public: z.boolean().optional()
});

module.exports = { createFeedbackSchema };
