const express = require("express");
const packagesController = require("./packages.controller");
const packagesValidation = require("./packages.validation");
const { validate } = require("../../middleware/validate");
const { authenticate } = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();
const packagesWriteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many package write requests, please try again later",
});

// Public routes
router.get("/", packagesController.getPackages);
router.get("/:id", packagesController.getPackageById);

// Protected routes
router.use(authenticate);

router.post(
  "/create-package",
  packagesWriteLimiter,
  validate(packagesValidation.createPackageSchema),
  packagesController.createPackage,
);

router.put(
  "/:id/update-package",
  packagesWriteLimiter,
  validate(packagesValidation.updatePackageSchema),
  packagesController.updatePackage,
);

router.delete("/:id", packagesController.deletePackage);

router.put("/:id/select-package", packagesController.selectPackage);

module.exports = router;
