const { db } = require('../../db');
const { createFeedbackSchema } = require('./feedback.validation');
const { generateUUID } = require('../../utils/helpers');

const createFeedback = async (userId, willId, body, files) => {
  const parsedBody = {
    ...body,
    overall_rating: body.overall_rating ? Number(body.overall_rating) : undefined,
    is_public:
      body.is_public === 'true' ? true : body.is_public === 'false' ? false : undefined
  };

  const data = createFeedbackSchema.parse(parsedBody);

  const will = await db
    .selectFrom('wills')
    .select(['id', 'user_id', 'status'])
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new Error('Will not found');
  }

  if (will.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  if (will.status !== 'completed') {
    throw new Error('Feedback allowed only after payment');
  }

  const existing = await db
    .selectFrom('will_feedback')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (existing) {
    throw new Error('Feedback already submitted');
  }

  const attachments = Array.isArray(files) && files.length > 0 
  ? files.map(file => ({
      file_name: file.originalname,
      stored_name: file.filename,
      file_size: file.size,
      mime_type: file.mimetype
    }))
  : [];


  const feedback = await db
    .insertInto('will_feedback')
    .values({
      id: data.id || generateUUID(),
      will_id: willId,
      user_id: userId,
      ease_of_use: data.ease_of_use ?? null,
      improvement_area: data.improvement_area ?? null,
      clarity_rating: data.clarity_rating ?? null,
      navigation_rating: data.navigation_rating ?? null,
      overall_rating: data.overall_rating,
      review: data.review ?? null,
      is_public: data.is_public ?? false,
      attachments: JSON.stringify(attachments)
    })
    .returningAll()
    .executeTakeFirst();

  return feedback;
};

module.exports = {
  createFeedback
};
