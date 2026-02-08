const spousesService = require('./spouses.service');
const { sendSuccess } = require('../../utils/response');

// SPOUSES CONTROLLER
const getSpouses = async (req, res, next) => {
  try {
    const spouses = await spousesService.getSpouses(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouses }, 'Spouses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getSpouseById = async (req, res, next) => {
  try {
    const spouse = await spousesService.getSpouseById(
      req.params.willId,
      req.params.spouseId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouse }, 'Spouse retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createSpouse = async (req, res, next) => {
  try {
    const spouse = await spousesService.createSpouse(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouse }, 'Spouse created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateSpouse = async (req, res, next) => {
  try {
    const spouse = await spousesService.updateSpouse(
      req.params.willId,
      req.params.spouseId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouse }, 'Spouse updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteSpouse = async (req, res, next) => {
  try {
    await spousesService.deleteSpouse(
      req.params.willId,
      req.params.spouseId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Spouse deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderSpouses = async (req, res, next) => {
  try {
    const spouses = await spousesService.reorderSpouses(
      req.params.willId,
      req.body.spouse_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { spouses }, 'Spouses reordered successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSpouses,
  getSpouseById,
  createSpouse,
  updateSpouse,
  deleteSpouse,
  reorderSpouses,
};