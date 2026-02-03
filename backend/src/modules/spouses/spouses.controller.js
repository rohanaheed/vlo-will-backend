const spousesService = require('./spouses.service');
const { sendSuccess } = require('../../utils/response');

/**
 * Get spouse
 * GET /api/v1/wills/:willId/spouse
 */
const getSpouse = async (req, res, next) => {
  try {
    const spouse = await spousesService.getSpouse(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouse }, 'Spouse retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update spouse
 * POST /api/v1/wills/:willId/spouse
 */
const upsertSpouse = async (req, res, next) => {
  try {
    const spouse = await spousesService.upsertSpouse(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouse }, 'Spouse saved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSpouse,
  upsertSpouse,
};
