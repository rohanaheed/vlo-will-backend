const express = require('express');
const router = express.Router({ mergeParams: true });

const assetsCtrl = require('./assets.controller');
const { validate } = require('../../middleware/validate');
const assetsValidation = require('./assets.validation');

// Property Assets Routes
router.get(
  '/properties',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getPropertyAssets
);

router.get(
  '/properties/:propertyId',
  validate(assetsValidation.propertyIdParamSchema),
  assetsCtrl.getPropertyAssetById
);

router.post(
  '/properties',
  validate(assetsValidation.createPropertyAssetSchema),
  assetsCtrl.createPropertyAsset
);

router.put(
  '/properties/:propertyId',
  validate(assetsValidation.updatePropertyAssetSchema),
  assetsCtrl.updatePropertyAsset
);

router.delete(
  '/properties/:propertyId',
  validate(assetsValidation.propertyIdParamSchema),
  assetsCtrl.deletePropertyAsset
);

router.post(
  '/properties/reorder',
  validate(assetsValidation.reorderPropertyAssetsSchema),
  assetsCtrl.reorderPropertyAssets
);

// Bank Accounts Routes
router.get(
  '/bank-accounts',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getBankAccounts
);

router.get(
  '/bank-accounts/:accountId',
  validate(assetsValidation.accountIdParamSchema),
  assetsCtrl.getBankAccountById
);

router.post(
  '/bank-accounts',
  validate(assetsValidation.createBankAccountSchema),
  assetsCtrl.createBankAccount
);

router.put(
  '/bank-accounts/:accountId',
  validate(assetsValidation.updateBankAccountSchema),
  assetsCtrl.updateBankAccount
);

router.delete(
  '/bank-accounts/:accountId',
  validate(assetsValidation.accountIdParamSchema),
  assetsCtrl.deleteBankAccount
);

router.post(
  '/bank-accounts/reorder',
  validate(assetsValidation.reorderBankAccountsSchema),
  assetsCtrl.reorderBankAccounts
);

// Investments Routes
router.get(
  '/investments',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getInvestments
);

router.get(
  '/investments/:investmentId',
  validate(assetsValidation.investmentIdParamSchema),
  assetsCtrl.getInvestmentById
);

router.post(
  '/investments',
  validate(assetsValidation.createInvestmentSchema),
  assetsCtrl.createInvestment
);

router.put(
  '/investments/:investmentId',
  validate(assetsValidation.updateInvestmentSchema),
  assetsCtrl.updateInvestment
);

router.delete(
  '/investments/:investmentId',
  validate(assetsValidation.investmentIdParamSchema),
  assetsCtrl.deleteInvestment
);

router.post(
  '/investments/reorder',
  validate(assetsValidation.reorderInvestmentsSchema),
  assetsCtrl.reorderInvestments
);

// Valuable Items Routes
router.get(
  '/valuable-items',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getValuableItems
);

router.get(
  '/valuable-items/:itemId',
  validate(assetsValidation.itemIdParamSchema),
  assetsCtrl.getValuableItemById
);

router.post(
  '/valuable-items',
  validate(assetsValidation.createValuableItemSchema),
  assetsCtrl.createValuableItem
);

router.put(
  '/valuable-items/:itemId',
  validate(assetsValidation.updateValuableItemSchema),
  assetsCtrl.updateValuableItem
);

router.delete(
  '/valuable-items/:itemId',
  validate(assetsValidation.itemIdParamSchema),
  assetsCtrl.deleteValuableItem
);

router.post(
  '/valuable-items/reorder',
  validate(assetsValidation.reorderValuableItemsSchema),
  assetsCtrl.reorderValuableItems
);

// Digital Assets Routes
router.get(
  '/digital-assets',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getDigitalAssets
);

router.get(
  '/digital-assets/:assetId',
  validate(assetsValidation.assetIdParamSchema),
  assetsCtrl.getDigitalAssetById
);

router.post(
  '/digital-assets',
  validate(assetsValidation.createDigitalAssetSchema),
  assetsCtrl.createDigitalAsset
);

router.put(
  '/digital-assets/:assetId',
  validate(assetsValidation.updateDigitalAssetSchema),
  assetsCtrl.updateDigitalAsset
);

router.delete(
  '/digital-assets/:assetId',
  validate(assetsValidation.assetIdParamSchema),
  assetsCtrl.deleteDigitalAsset
);

router.post(
  '/digital-assets/reorder',
  validate(assetsValidation.reorderDigitalAssetsSchema),
  assetsCtrl.reorderDigitalAssets
);

// Intellectual Assets Routes
router.get(
  '/intellectual-assets',
  validate(assetsValidation.willIdParamSchema),
  assetsCtrl.getIntellectualAssets
);

router.get(
  '/intellectual-assets/:assetId',
  validate(assetsValidation.assetIdParamSchema),
  assetsCtrl.getIntellectualAssetById
);

router.post(
  '/intellectual-assets',
  validate(assetsValidation.createIntellectualAssetSchema),
  assetsCtrl.createIntellectualAsset
);

router.put(
  '/intellectual-assets/:assetId',
  validate(assetsValidation.updateIntellectualAssetSchema),
  assetsCtrl.updateIntellectualAsset
);

router.delete(
  '/intellectual-assets/:assetId',
  validate(assetsValidation.assetIdParamSchema),
  assetsCtrl.deleteIntellectualAsset
);

router.post(
  '/intellectual-assets/reorder',
  validate(assetsValidation.reorderIntellectualAssetsSchema),
  assetsCtrl.reorderIntellectualAssets
);

module.exports = router;