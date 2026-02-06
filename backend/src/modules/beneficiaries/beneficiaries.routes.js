const express = require('express');
const router = express.Router({ mergeParams: true });

const beneficiariesCtrl = require('./beneficiaries.controller');
const { validate } = require('../../middleware/validate');
const beneficiariesValidation = require('./beneficiaries.validation');

// Children ROUTES
router.get('/children',validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getChildren);

router.get('/children/:childId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getChildById);

router.post(
  '/children',
  validate(beneficiariesValidation.createChildSchema),
  beneficiariesCtrl.createChild
);

router.put(
  '/children/:childId',
  validate(beneficiariesValidation.updateChildSchema),
  beneficiariesCtrl.updateChild
);

router.delete('/children/:childId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.deleteChild);

router.post(
  '/children/reorder',
  validate(beneficiariesValidation.reorderChildrenSchema),
  beneficiariesCtrl.reorderChildren
);

// Guardians ROUTES
router.get('/guardians', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getGuardians);

router.get('/guardians/:guardianId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getGuardianById);

router.post(
  '/guardians',
  validate(beneficiariesValidation.createGuardianSchema),
  beneficiariesCtrl.createGuardian
);

router.put(
  '/guardians/:guardianId',
  validate(beneficiariesValidation.updateGuardianSchema),
  beneficiariesCtrl.updateGuardian
);

router.delete('/guardians/:guardianId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.deleteGuardian);

router.post(
  '/guardians/reorder',
  validate(beneficiariesValidation.reorderGuardiansSchema),
  beneficiariesCtrl.reorderGuardians
);

// Trustees ROUTES
router.get('/trustees', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getTrustees);

router.get('/trustees/:trusteeId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getTrusteeById);

router.post(
  '/trustees',
  validate(beneficiariesValidation.createTrusteeSchema),
  beneficiariesCtrl.createTrustee
);

router.put(
  '/trustees/:trusteeId',
  validate(beneficiariesValidation.updateTrusteeSchema),
  beneficiariesCtrl.updateTrustee
);

router.delete('/trustees/:trusteeId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.deleteTrustee);

router.post(
  '/trustees/reorder',
  validate(beneficiariesValidation.reorderTrusteesSchema),
  beneficiariesCtrl.reorderTrustees
);

// Beneficiaries ROUTES
router.get('/beneficiaries', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getBeneficiaries);

router.get('/beneficiaries/:beneficiaryId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getBeneficiaryById);

router.post(
  '/beneficiaries',
  validate(beneficiariesValidation.createBeneficiarySchema),
  beneficiariesCtrl.createBeneficiary
);

router.put(
  '/beneficiaries/:beneficiaryId',
  validate(beneficiariesValidation.updateBeneficiarySchema),
  beneficiariesCtrl.updateBeneficiary
);

router.delete('/beneficiaries/:beneficiaryId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.deleteBeneficiary);

router.post(
  '/beneficiaries/reorder',
  validate(beneficiariesValidation.reorderBeneficiariesSchema),
  beneficiariesCtrl.reorderBeneficiaries
);

// Charities ROUTES
router.get('/charities', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getCharities);

router.get('/charities/:charityId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.getCharityById);

router.post(
  '/charities',
  validate(beneficiariesValidation.createCharitySchema),
  beneficiariesCtrl.createCharity
);

router.put(
  '/charities/:charityId',
  validate(beneficiariesValidation.updateCharitySchema),
  beneficiariesCtrl.updateCharity
);

router.delete('/charities/:charityId', validate(beneficiariesValidation.willIdParamSchema), beneficiariesCtrl.deleteCharity);

router.post(
  '/charities/reorder',
  validate(beneficiariesValidation.reorderCharitiesSchema),
  beneficiariesCtrl.reorderCharities
);

module.exports = router;
