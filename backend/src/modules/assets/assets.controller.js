const assetsService = require('./assets.service');
const { sendSuccess } = require('../../utils/response');

// Property Assets CONTROLLER
const getPropertyAssets = async (req, res, next) => {
  try {
    const properties = await assetsService.getPropertyAssets(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { properties }, 'Property assets retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getPropertyAssetById = async (req, res, next) => {
  try {
    const property = await assetsService.getPropertyAssetById(
      req.params.willId,
      req.params.propertyId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { property }, 'Property asset retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createPropertyAsset = async (req, res, next) => {
  try {
    const property = await assetsService.createPropertyAsset(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { property }, 'Property asset created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updatePropertyAsset = async (req, res, next) => {
  try {
    const property = await assetsService.updatePropertyAsset(
      req.params.willId,
      req.params.propertyId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { property }, 'Property asset updated successfully');
  } catch (error) {
    next(error);
  }
};

const deletePropertyAsset = async (req, res, next) => {
  try {
    await assetsService.deletePropertyAsset(
      req.params.willId,
      req.params.propertyId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Property asset deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderPropertyAssets = async (req, res, next) => {
  try {
    const properties = await assetsService.reorderPropertyAssets(
      req.params.willId,
      req.body.property_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { properties }, 'Property assets reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Bank Accounts CONTROLLER
const getBankAccounts = async (req, res, next) => {
  try {
    const bank_accounts = await assetsService.getBankAccounts(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { bank_accounts }, 'Bank accounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getBankAccountById = async (req, res, next) => {
  try {
    const bank_account = await assetsService.getBankAccountById(
      req.params.willId,
      req.params.accountId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { bank_account }, 'Bank account retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createBankAccount = async (req, res, next) => {
  try {
    const bank_account = await assetsService.createBankAccount(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { bank_account }, 'Bank account created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateBankAccount = async (req, res, next) => {
  try {
    const bank_account = await assetsService.updateBankAccount(
      req.params.willId,
      req.params.accountId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { bank_account }, 'Bank account updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteBankAccount = async (req, res, next) => {
  try {
    await assetsService.deleteBankAccount(
      req.params.willId,
      req.params.accountId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Bank account deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderBankAccounts = async (req, res, next) => {
  try {
    const bank_accounts = await assetsService.reorderBankAccounts(
      req.params.willId,
      req.body.account_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { bank_accounts }, 'Bank accounts reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Valuable Items CONTROLLER
const getInvestments = async (req, res, next) => {
  try {
    const investments = await assetsService.getInvestments(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { investments }, 'Investments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getInvestmentById = async (req, res, next) => {
  try {
    const investment = await assetsService.getInvestmentById(
      req.params.willId,
      req.params.investmentId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { investment }, 'Investment retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createInvestment = async (req, res, next) => {
  try {
    const investment = await assetsService.createInvestment(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { investment }, 'Investment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateInvestment = async (req, res, next) => {
  try {
    const investment = await assetsService.updateInvestment(
      req.params.willId,
      req.params.investmentId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { investment }, 'Investment updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteInvestment = async (req, res, next) => {
  try {
    await assetsService.deleteInvestment(
      req.params.willId,
      req.params.investmentId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Investment deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderInvestments = async (req, res, next) => {
  try {
    const investments = await assetsService.reorderInvestments(
      req.params.willId,
      req.body.investment_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { investments }, 'Investments reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Valuable Items CONTROLLER
const getValuableItems = async (req, res, next) => {
  try {
    const valuable_items = await assetsService.getValuableItems(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { valuable_items }, 'Valuable items retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getValuableItemById = async (req, res, next) => {
  try {
    const valuable_item = await assetsService.getValuableItemById(
      req.params.willId,
      req.params.itemId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { valuable_item }, 'Valuable item retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createValuableItem = async (req, res, next) => {
  try {
    const valuable_item = await assetsService.createValuableItem(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { valuable_item }, 'Valuable item created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateValuableItem = async (req, res, next) => {
  try {
    const valuable_item = await assetsService.updateValuableItem(
      req.params.willId,
      req.params.itemId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { valuable_item }, 'Valuable item updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteValuableItem = async (req, res, next) => {
  try {
    await assetsService.deleteValuableItem(
      req.params.willId,
      req.params.itemId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Valuable item deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderValuableItems = async (req, res, next) => {
  try {
    const valuable_items = await assetsService.reorderValuableItems(
      req.params.willId,
      req.body.item_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { valuable_items }, 'Valuable items reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Digital Assets CONTROLLER
const getDigitalAssets = async (req, res, next) => {
  try {
    const digital_assets = await assetsService.getDigitalAssets(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { digital_assets }, 'Digital assets retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getDigitalAssetById = async (req, res, next) => {
  try {
    const digital_asset = await assetsService.getDigitalAssetById(
      req.params.willId,
      req.params.assetId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { digital_asset }, 'Digital asset retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createDigitalAsset = async (req, res, next) => {
  try {
    const digital_asset = await assetsService.createDigitalAsset(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { digital_asset }, 'Digital asset created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateDigitalAsset = async (req, res, next) => {
  try {
    const digital_asset = await assetsService.updateDigitalAsset(
      req.params.willId,
      req.params.assetId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { digital_asset }, 'Digital asset updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteDigitalAsset = async (req, res, next) => {
  try {
    await assetsService.deleteDigitalAsset(
      req.params.willId,
      req.params.assetId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Digital asset deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderDigitalAssets = async (req, res, next) => {
  try {
    const digital_assets = await assetsService.reorderDigitalAssets(
      req.params.willId,
      req.body.asset_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { digital_assets }, 'Digital assets reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Intellectual Assets CONTROLLER
const getIntellectualAssets = async (req, res, next) => {
  try {
    const intellectual_assets = await assetsService.getIntellectualAssets(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { intellectual_assets }, 'Intellectual assets retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getIntellectualAssetById = async (req, res, next) => {
  try {
    const intellectual_asset = await assetsService.getIntellectualAssetById(
      req.params.willId,
      req.params.assetId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { intellectual_asset }, 'Intellectual asset retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createIntellectualAsset = async (req, res, next) => {
  try {
    const intellectual_asset = await assetsService.createIntellectualAsset(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { intellectual_asset }, 'Intellectual asset created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateIntellectualAsset = async (req, res, next) => {
  try {
    const intellectual_asset = await assetsService.updateIntellectualAsset(
      req.params.willId,
      req.params.assetId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { intellectual_asset }, 'Intellectual asset updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteIntellectualAsset = async (req, res, next) => {
  try {
    await assetsService.deleteIntellectualAsset(
      req.params.willId,
      req.params.assetId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Intellectual asset deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderIntellectualAssets = async (req, res, next) => {
  try {
    const intellectual_assets = await assetsService.reorderIntellectualAssets(
      req.params.willId,
      req.body.asset_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { intellectual_assets }, 'Intellectual assets reordered successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Property Assets
  getPropertyAssets,
  getPropertyAssetById,
  createPropertyAsset,
  updatePropertyAsset,
  deletePropertyAsset,
  reorderPropertyAssets,
  // Bank Accounts
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  reorderBankAccounts,
  // Investments
  getInvestments,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  reorderInvestments,
  // Valuable Items
  getValuableItems,
  getValuableItemById,
  createValuableItem,
  updateValuableItem,
  deleteValuableItem,
  reorderValuableItems,
  // Digital Assets
  getDigitalAssets,
  getDigitalAssetById,
  createDigitalAsset,
  updateDigitalAsset,
  deleteDigitalAsset,
  reorderDigitalAssets,
  // Intellectual Assets
  getIntellectualAssets,
  getIntellectualAssetById,
  createIntellectualAsset,
  updateIntellectualAsset,
  deleteIntellectualAsset,
  reorderIntellectualAssets,
};