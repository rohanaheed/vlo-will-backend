const express = require('express');
const router = express.Router({ mergeParams: true });

const debtsCtrl = require('./debts.controller');
const { validate } = require('../../middleware/validate');
const debtsValidation = require('./debts.validation');

// DEBTS ROUTES
router.get(
  '/',
  validate(debtsValidation.willIdParamSchema),
  debtsCtrl.getDebts
);

router.get(
  '/:debtId',
  validate(debtsValidation.debtIdParamSchema),
  debtsCtrl.getDebtById
);

router.post(
  '/',
  validate(debtsValidation.createDebtSchema),
  debtsCtrl.createDebt
);

router.put(
  '/:debtId',
  validate(debtsValidation.updateDebtSchema),
  debtsCtrl.updateDebt
);

router.delete(
  '/:debtId',
  validate(debtsValidation.debtIdParamSchema),
  debtsCtrl.deleteDebt
);

router.post(
  '/reorder',
  validate(debtsValidation.reorderDebtsSchema),
  debtsCtrl.reorderDebts
);

module.exports = router;