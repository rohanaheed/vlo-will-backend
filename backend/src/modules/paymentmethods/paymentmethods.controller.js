const paymentMethodsService = require("./paymentmethods.service");
const { sendSuccess, sendNoContent } = require("../../utils/response");
const { createAuditLog } = require("../../middleware/audit");
const { AUDIT_ACTIONS } = require("../../utils/constants");

// Get All Payment Methods
const getAllPaymentMethods = async (req, res, next) => {
  try {
    const result = await paymentMethodsService.getAllPaymentMethods(
      req.query,
      req.user.id,
      req.user.role_name,
    );

    return sendSuccess(res, result, "Payment Methods retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get Payment Method By ID
const getPaymentMethodById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paymentMethod = await paymentMethodsService.getPaymentMethodById(
      id,
      req.user.id,
    );

    if (!paymentMethod) {
      return sendNoContent(res);
    }

    return sendSuccess(
      res,
      { paymentMethod },
      "Payment Method retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

// Get User Payment Methods
const getUserPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = await paymentMethodsService.getUserPaymentMethods(
      req.params.id,
    );

    return sendSuccess(
      res,
      { paymentMethods },
      "User Payment Methods retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

// Get Default Payment Method
const getDefaultPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethod = await paymentMethodsService.getDefaultPaymentMethods(
      req.user.id,
    );

    return sendSuccess(
      res,
      { paymentMethod },
      "User Payment Methods retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};
// Create Payment Method
const createPaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await paymentMethodsService.createPaymentMethod(
      req.body,
      req.user.id,
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "paymentMethod",
      entityId: paymentMethod.id,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendSuccess(
      res,
      { paymentMethod },
      "Payment Method created successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};

// Update Payment Method
const updatePaymentMethod = async (req, res, next) => {
  try {
    const original = await paymentMethodsService.getPaymentMethodById(
      req.params.id,
      req.user.id,
    );
    const paymentMethod = await paymentMethodsService.updatePaymentMethod(
      req.params.id,
      req.body,
      req.user.id,
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "paymentMethod",
      entityId: req.params.id,
      oldValues: original,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendSuccess(
      res,
      { paymentMethod },
      "Payment Method updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

// Delete Payment Method
const deletePaymentMethod = async (req, res, next) => {
  try {
    const paymentMethod = await paymentMethodsService.getPaymentMethodById(
      req.params.id,
      req.user.id,
    );
    await paymentMethodsService.deletePaymentMethod(req.params.id, req.user.id);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "paymentMethod",
      entityId: req.params.id,
      oldValues: paymentMethod,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPaymentMethods,
  getPaymentMethodById,
  getUserPaymentMethods,
  getDefaultPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
