const debtsService = require('./debts.service');
const { sendSuccess } = require('../../utils/response');

// DEBTS CONTROLLER
const getDebts = async (req, res, next) => {
  try {
    const debts = await debtsService.getDebts(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { debts }, 'Debts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDebtById = async (req, res, next) => {
  try {
    const debt = await debtsService.getDebtById(
      req.params.willId,
      req.params.debtId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { debt }, 'Debt retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createDebt = async (req, res, next) => {
  try {
    const debt = await debtsService.createDebt(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { debt }, 'Debt created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateDebt = async (req, res, next) => {
  try {
    const debt = await debtsService.updateDebt(
      req.params.willId,
      req.params.debtId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { debt }, 'Debt updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteDebt = async (req, res, next) => {
  try {
    await debtsService.deleteDebt(
      req.params.willId,
      req.params.debtId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Debt deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderDebts = async (req, res, next) => {
  try {
    const debts = await debtsService.reorderDebts(
      req.params.willId,
      req.body.debt_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { debts }, 'Debts reordered successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  reorderDebts,
};