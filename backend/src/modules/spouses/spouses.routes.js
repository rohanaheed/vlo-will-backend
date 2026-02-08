const express = require('express');
const router = express.Router({ mergeParams: true });

const spousesCtrl = require('./spouses.controller');
const { validate } = require('../../middleware/validate');
const spousesValidation = require('./spouses.validation');

// SPOUSES ROUTES
router.get(
  '/spouses',
  validate(spousesValidation.willIdParamSchema),
  spousesCtrl.getSpouses
);

router.get(
  '/spouses/:spouseId',
  validate(spousesValidation.spouseIdParamSchema),
  spousesCtrl.getSpouseById
);

router.post(
  '/spouses',
  validate(spousesValidation.createSpouseSchema),
  spousesCtrl.createSpouse
);

router.put(
  '/spouses/:spouseId',
  validate(spousesValidation.updateSpouseSchema),
  spousesCtrl.updateSpouse
);

router.delete(
  '/spouses/:spouseId',
  validate(spousesValidation.spouseIdParamSchema),
  spousesCtrl.deleteSpouse
);

router.post(
  '/spouses/reorder',
  validate(spousesValidation.reorderSpousesSchema),
  spousesCtrl.reorderSpouses
);

module.exports = router;