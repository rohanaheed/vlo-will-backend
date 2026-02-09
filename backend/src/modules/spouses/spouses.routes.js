const express = require('express');
const router = express.Router({ mergeParams: true });

const spousesCtrl = require('./spouses.controller');
const { validate } = require('../../middleware/validate');
const spousesValidation = require('./spouses.validation');

// SPOUSES ROUTES
router.get(
  '/',
  validate(spousesValidation.willIdParamSchema),
  spousesCtrl.getSpouses
);

router.get(
  '/:spouseId',
  validate(spousesValidation.spouseIdParamSchema),
  spousesCtrl.getSpouseById
);

router.post(
  '/',
  validate(spousesValidation.createSpouseSchema),
  spousesCtrl.createSpouse
);

router.put(
  '/:spouseId',
  validate(spousesValidation.updateSpouseSchema),
  spousesCtrl.updateSpouse
);

router.delete(
  '/:spouseId',
  validate(spousesValidation.spouseIdParamSchema),
  spousesCtrl.deleteSpouse
);

router.post(
  '/reorder',
  validate(spousesValidation.reorderSpousesSchema),
  spousesCtrl.reorderSpouses
);

module.exports = router;