const beneficiariesService = require('./beneficiaries.service');
const { sendSuccess } = require('../../utils/response');

// Children CONTROLLERS
const getChildren = async (req, res, next) => {
  try {
    const children = await beneficiariesService.getChildren(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { children }, 'Children retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getChildById = async (req, res, next) => {
  try {
    const child = await beneficiariesService.getChildById(
      req.params.willId,
      req.params.childId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { child }, 'Child retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createChild = async (req, res, next) => {
  try {
    const child = await beneficiariesService.createChild(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { child }, 'Child created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateChild = async (req, res, next) => {
  try {
    const child = await beneficiariesService.updateChild(
      req.params.willId,
      req.params.childId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { child }, 'Child updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteChild = async (req, res, next) => {
  try {
    await beneficiariesService.deleteChild(
      req.params.willId,
      req.params.childId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Child deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderChildren = async (req, res, next) => {
  try {
    const children = await beneficiariesService.reorderChildren(
      req.params.willId,
      req.body.child_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { children }, 'Children reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Guardians CONTROLLERS
const getGuardians = async (req, res, next) => {
  try {
    const guardians = await beneficiariesService.getGuardians(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { guardians }, 'Guardians retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getGuardianById = async (req, res, next) => {
  try {
    const guardian = await beneficiariesService.getGuardianById(
      req.params.willId,
      req.params.guardianId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { guardian }, 'Guardian retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createGuardian = async (req, res, next) => {
  try {
    const guardian = await beneficiariesService.createGuardian(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { guardian }, 'Guardian created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateGuardian = async (req, res, next) => {
  try {
    const guardian = await beneficiariesService.updateGuardian(
      req.params.willId,
      req.params.guardianId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { guardian }, 'Guardian updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteGuardian = async (req, res, next) => {
  try {
    await beneficiariesService.deleteGuardian(
      req.params.willId,
      req.params.guardianId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Guardian deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderGuardians = async (req, res, next) => {
  try {
    const guardians = await beneficiariesService.reorderGuardians(
      req.params.willId,
      req.body.guardian_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { guardians }, 'Guardians reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Trustees CONTROLLERS
const getTrustees = async (req, res, next) => {
  try {
    const trustees = await beneficiariesService.getTrustees(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { trustees }, 'Trustees retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getTrusteeById = async (req, res, next) => {
  try {
    const trustee = await beneficiariesService.getTrusteeById(
      req.params.willId,
      req.params.trusteeId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { trustee }, 'Trustee retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createTrustee = async (req, res, next) => {
  try {
    const trustee = await beneficiariesService.createTrustee(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { trustee }, 'Trustee created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateTrustee = async (req, res, next) => {
  try {
    const trustee = await beneficiariesService.updateTrustee(
      req.params.willId,
      req.params.trusteeId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { trustee }, 'Trustee updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteTrustee = async (req, res, next) => {
  try {
    await beneficiariesService.deleteTrustee(
      req.params.willId,
      req.params.trusteeId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Trustee deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderTrustees = async (req, res, next) => {
  try {
    const trustees = await beneficiariesService.reorderTrustees(
      req.params.willId,
      req.body.trustee_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { trustees }, 'Trustees reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Beneficiaries CONTROLLERS
const getBeneficiaries = async (req, res, next) => {
  try {
    const beneficiaries = await beneficiariesService.getBeneficiaries(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { beneficiaries }, 'Beneficiaries retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getBeneficiaryById = async (req, res, next) => {
  try {
    const beneficiary = await beneficiariesService.getBeneficiaryById(
      req.params.willId,
      req.params.beneficiaryId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { beneficiary }, 'Beneficiary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await beneficiariesService.createBeneficiary(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { beneficiary }, 'Beneficiary created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await beneficiariesService.updateBeneficiary(
      req.params.willId,
      req.params.beneficiaryId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { beneficiary }, 'Beneficiary updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteBeneficiary = async (req, res, next) => {
  try {
    await beneficiariesService.deleteBeneficiary(
      req.params.willId,
      req.params.beneficiaryId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Beneficiary deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderBeneficiaries = async (req, res, next) => {
  try {
    const beneficiaries = await beneficiariesService.reorderBeneficiaries(
      req.params.willId,
      req.body.beneficiary_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { beneficiaries }, 'Beneficiaries reordered successfully');
  } catch (error) {
    next(error);
  }
};

// Charities CONTROLLERS
const getCharities = async (req, res, next) => {
  try {
    const charities = await beneficiariesService.getCharities(
      req.params.willId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { charities }, 'Charities retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getCharityById = async (req, res, next) => {
  try {
    const charity = await beneficiariesService.getCharityById(
      req.params.willId,
      req.params.charityId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { charity }, 'Charity retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createCharity = async (req, res, next) => {
  try {
    const charity = await beneficiariesService.createCharity(
      req.params.willId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { charity }, 'Charity created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateCharity = async (req, res, next) => {
  try {
    const charity = await beneficiariesService.updateCharity(
      req.params.willId,
      req.params.charityId,
      req.body,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { charity }, 'Charity updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteCharity = async (req, res, next) => {
  try {
    await beneficiariesService.deleteCharity(
      req.params.willId,
      req.params.charityId,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, {}, 'Charity deleted successfully');
  } catch (error) {
    next(error);
  }
};

const reorderCharities = async (req, res, next) => {
  try {
    const charities = await beneficiariesService.reorderCharities(
      req.params.willId,
      req.body.charity_ids,
      req.user.id,
      req.user.role_name
    );

    return sendSuccess(res, { charities }, 'Charities reordered successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Children
  getChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
  reorderChildren,
  // Guardians
  getGuardians,
  getGuardianById,
  createGuardian,
  updateGuardian,
  deleteGuardian,
  reorderGuardians,
  // Trustees
  getTrustees,
  getTrusteeById,
  createTrustee,
  updateTrustee,
  deleteTrustee,
  reorderTrustees,
  // Beneficiaries
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  reorderBeneficiaries,
  // Charities
  getCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity,
  reorderCharities,
};
