const feedbackService = require('./feedback.service');
const { sendCreated } = require('../../utils/response');
const { createAuditLog } = require('../../middleware/audit');
const { AUDIT_ACTIONS } = require('../../utils/constants');

const createFeedback = async (req, res, next) => {
  try {
    const feedback = await feedbackService.createFeedback(
      req.user.id,
      req.params.willId,
      req.body,
      req.files
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'will_feedback',
      entityId: feedback?.id || null,
      newValues: { ...req.body, will_id: req.params.willId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return sendCreated(res, { feedback }, 'Will Feedback Created');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFeedback,
};
