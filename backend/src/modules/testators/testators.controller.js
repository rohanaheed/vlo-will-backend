const testatorsService = require('./testators.service');
const { sendSuccess, sendCreated } = require('../../utils/response');

/**
 * Get testator
 * GET /api/v1/wills/:willId/testator
 */
const getTestator = async (req, res, next) => {
  try {
    const testator = await testatorsService.getTestator(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { testator }, 'Testator retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update testator
 * POST /api/v1/wills/:willId/testator
 */
const upsertTestator = async (req, res, next) => {
  try {
    const testator = await testatorsService.upsertTestator(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { testator }, 'Testator saved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTestator,
  upsertTestator,
};
