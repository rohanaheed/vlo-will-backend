const packagesService = require("./packages.service");
const { sendSuccess, sendNoContent } = require("../../utils/response");
const { createAuditLog } = require("../../middleware/audit");
const { AUDIT_ACTIONS } = require("../../utils/constants");

// Get All Packages
const getPackages = async (req, res, next) => {
  try {
    const packages = await packagesService.getPackages();

    return sendSuccess(res, { packages }, "Packages retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get Package By ID
const getPackageById = async (req, res, next) => {
  try {
    const pkg = await packagesService.getPackageById(req.params.id);

    return sendSuccess(res, { package: pkg }, "Package retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Create Package
const createPackage = async (req, res, next) => {
  try {
    const pkg = await packagesService.createPackage(req.body, req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "package",
      entityId: pkg.id,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendSuccess(
      res,
      { package: pkg },
      "Package created successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};

// Update Package
const updatePackage = async (req, res, next) => {
  try {
    const original = await packagesService.getPackageById(req.params.id);

    const pkg = await packagesService.updatePackage(
      req.params.id,
      req.body,
      req.user,
    );

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "package",
      entityId: req.params.id,
      oldValues: original,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendSuccess(res, { package: pkg }, "Package updated successfully");
  } catch (error) {
    next(error);
  }
};

// Delete Package
const deletePackage = async (req, res, next) => {
  try {
    const pkg = await packagesService.getPackageById(req.params.id);

    await packagesService.deletePackage(req.params.id, req.user);

    await createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "package",
      entityId: req.params.id,
      oldValues: pkg,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

const selectPackage = async (req, res, next) => {
  try {
    const pkg = await packagesService.selectPackage(req.params.id, req.user.id);
    return sendSuccess(res, { package: pkg }, "Package selected successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  selectPackage,
};
