const { db } = require("../../db");
const { generateUUID } = require("../../utils/helpers");
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} = require("../../utils/errors");
const {
  WILL_STATUSES,
  WILL_TYPES,
  TOTAL_STEPS,
  ROLES,
} = require("../../utils/constants");
const logger = require("../../utils/logger");

// Get will with ownership check
const getWillWithAccess = async (willId, userId, userRole) => {
  const will = await db
    .selectFrom("wills")
    .selectAll()
    .where("id", "=", willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError("Will");
  }

  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    if (will.user_id !== userId) {
      throw new NotFoundError("Will");
    }
  }

  return will;
};

/**
 * Check if a step is editable
 *
 * NEW LOGIC:
 * - Before payment: User can edit any step up to current progress
 * - After payment: All steps locked unless edit_unlocked=true
 *
 * @param {object} will - Will object
 * @param {number} stepNumber - Step to check
 * @returns {object} { canEdit: boolean, reason: string }
 */
const checkStepEditable = (will, stepNumber) => {
  const highestCompleted = will.highest_completed_step || 0;

  // CASE 1: Will has been paid for
  if (will.is_paid) {
    // If edit is unlocked (paid to edit again), allow editing
    if (will.edit_unlocked) {
      // Can edit any step up to highest completed or current
      if (stepNumber <= highestCompleted + 1) {
        return { canEdit: true, reason: null };
      }
      return {
        canEdit: false,
        reason: `Cannot access step ${stepNumber}. Please complete step ${highestCompleted + 1} first.`,
      };
    }
    // Paid but not unlocked - locked for editing
    return {
      canEdit: false,
      reason:
        "Will is locked after payment. Payment required to unlock editing.",
    };
  }

  // CASE 2: Will has NOT been paid for - free to edit any completed step
  // Can edit any step up to current progress
  if (stepNumber <= highestCompleted + 1) {
    return { canEdit: true, reason: null };
  }

  // Trying to skip ahead
  return {
    canEdit: false,
    reason: `Cannot access step ${stepNumber}. Please complete step ${highestCompleted + 1} first.`,
  };
};

/**
 * Get step status for frontend
 *
 * Status values:
 * - 'completed': Step is done (before payment - still editable)
 * - 'current': Current step to fill
 * - 'upcoming': Future step, not accessible yet
 * - 'locked': Paid and locked (cannot edit)
 * - 'editable': Paid and unlocked (can edit)
 *
 * @param {object} will - Will object
 * @param {number} stepNumber - Step to check
 * @returns {string} 'completed' | 'current' | 'upcoming' | 'locked' | 'editable'
 */
const getStepStatus = (will, stepNumber) => {
  const highestCompleted = will.highest_completed_step || 0;

  // CASE 1: Will has been paid
  if (will.is_paid) {
    if (will.edit_unlocked) {
      // Paid and unlocked - editable
      if (stepNumber <= highestCompleted) {
        return "editable";
      }
      if (stepNumber === highestCompleted + 1) {
        return "current";
      }
      return "upcoming";
    }
    // Paid but locked
    if (stepNumber <= highestCompleted) {
      return "locked";
    }
    if (stepNumber === highestCompleted + 1) {
      return "locked"; // Current step also locked after payment
    }
    return "upcoming";
  }

  // CASE 2: Not paid yet - steps are editable before payment
  if (stepNumber <= highestCompleted) {
    return "completed"; // Done but still editable (before payment)
  }

  if (stepNumber === highestCompleted + 1) {
    return "current"; // Current step to fill
  }

  return "upcoming"; // Not yet accessible
};

/**
 * Save step data and auto-advance
 * Single unified endpoint for all step operations
 *
 * @param {string} willId - Will ID
 * @param {number} stepNumber - Current step being saved
 * @param {object} stepData - Data for this step
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {object} options - { action: 'save' | 'save_and_continue' | 'save_and_back' | 'skip_and_continue' }
 */
const saveStepData = async (
  willId,
  stepNumber,
  stepData,
  userId,
  userRole,
  options = {},
) => {
  const { action } = options;

  // Verify will access
  const will = await getWillWithAccess(willId, userId, userRole);

  // Validate step number
  const maxSteps =
    will.will_type === WILL_TYPES.ISLAMIC
      ? TOTAL_STEPS.ISLAMIC
      : TOTAL_STEPS.GENERAL;
  if (stepNumber < 1 || stepNumber > maxSteps) {
    throw new BadRequestError(
      `Invalid step number. Must be between 1 and ${maxSteps}`,
    );
  }

  // Check if step is editable (STEP LOCKING LOGIC)
  const editCheck = checkStepEditable(will, stepNumber);
  if (!editCheck.canEdit) {
    throw new ForbiddenError(editCheck.reason);
  }

  // Track if this is a post-payment edit
  const isPostPaymentEdit = will.is_paid && will.edit_unlocked;

  // Use transaction to ensure atomicity
  const result = await db.transaction().execute(async (trx) => {
    // Save step-specific data unless skipping
    if (action !== "skip_and_continue") {
      await saveStepSpecificData(trx, willId, stepNumber, stepData, will);
    }

    // Calculate new values
    let newCurrentStep = will.current_step;
    let newHighestCompleted = will.highest_completed_step || 0;
    let newEditUnlocked = will.edit_unlocked;
    let newStatus = will.status;

    if (action === "save_and_continue" || action === "skip_and_continue") {
      // Advance current step
      newCurrentStep = Math.min(stepNumber + 1, maxSteps);

      // Update highest completed step (only if moving forward for first time)
      if (stepNumber > newHighestCompleted) {
        newHighestCompleted = stepNumber;
      }

      // Check if will is now completed (all steps done)
      if (stepNumber >= maxSteps) {
        newStatus = WILL_STATUSES.COMPLETED;
      } else if (newStatus === WILL_STATUSES.DRAFT) {
        newStatus = WILL_STATUSES.IN_PROGRESS;
      }

      // If this was a post-payment edit, lock editing after save
      // User gets ONE edit session after paying, then locked again
      if (isPostPaymentEdit) {
        newEditUnlocked = false;
        logger.info("Post-payment edit completed, locking edits", {
          willId,
          stepNumber,
        });
      }
      // NOTE: Before payment, NO locking - user can freely go back and edit
    } else if (action === "save_and_back") {
      // Go back one step (but not below 1)
      newCurrentStep = Math.max(stepNumber - 1, 1);

      // Update highest completed if this step wasn't completed before
      if (stepNumber > newHighestCompleted) {
        newHighestCompleted = stepNumber;
      }

      // If post-payment edit, lock after saving (even when going back)
      if (isPostPaymentEdit) {
        newEditUnlocked = false;
        logger.info("Post-payment edit completed (back), locking edits", {
          willId,
          stepNumber,
        });
      }
    } else if (action === "save") {
      // Just save, don't change step
      // Update highest completed if needed
      if (stepNumber > newHighestCompleted) {
        newHighestCompleted = stepNumber;
      }

      // If post-payment edit, lock after saving
      if (isPostPaymentEdit) {
        newEditUnlocked = false;
        logger.info("Post-payment edit completed (save only), locking edits", {
          willId,
          stepNumber,
        });
      }
    }

    // Update will
    const updatedWill = await trx
      .updateTable("wills")
      .set({
        current_step: newCurrentStep,
        highest_completed_step: newHighestCompleted,
        status: newStatus,
        edit_unlocked: newEditUnlocked,
        updated_at: new Date(),
      })
      .where("id", "=", willId)
      .returning([
        "id",
        "will_type",
        "status",
        "current_step",
        "highest_completed_step",
        "is_paid",
        "edit_unlocked",
        "updated_at",
      ])
      .executeTakeFirst();

    return updatedWill;
  });

  logger.info("Step data saved", {
    willId,
    stepNumber,
    action,
    newStep: result.current_step,
    highestCompleted: result.highest_completed_step,
    editUnlocked: result.edit_unlocked,
    userId,
  });

  return result;
};

/**
 * Unlock will for editing after payment
 * Called after successful payment
 */
const unlockWillForEditing = async (willId, paymentId, userId, userRole) => {
  const will = await getWillWithAccess(willId, userId, userRole);

  if (!will.is_paid) {
    // First time payment
    const updatedWill = await db
      .updateTable("wills")
      .set({
        is_paid: true,
        paid_at: new Date(),
        payment_id: paymentId,
        edit_unlocked: true,
        edit_count: 1,
        updated_at: new Date(),
      })
      .where("id", "=", willId)
      .returningAll()
      .executeTakeFirst();

    logger.info("Will unlocked for editing (first payment)", {
      willId,
      paymentId,
    });
    return updatedWill;
  } else {
    // Subsequent payment for more edits
    const updatedWill = await db
      .updateTable("wills")
      .set({
        payment_id: paymentId,
        edit_unlocked: true,
        edit_count: (will.edit_count || 0) + 1,
        updated_at: new Date(),
      })
      .where("id", "=", willId)
      .returningAll()
      .executeTakeFirst();

    logger.info("Will unlocked for editing (subsequent payment)", {
      willId,
      paymentId,
      editCount: updatedWill.edit_count,
    });
    return updatedWill;
  }
};

/**
 * Save data for specific step
 * Routes to appropriate table based on step number
 */
const saveStepSpecificData = async (
  trx,
  willId,
  stepNumber,
  stepData,
  will,
) => {
  const isIslamic = will.will_type === WILL_TYPES.ISLAMIC;

  switch (stepNumber) {
    case 1: // YOUR DETAILS
      await upsertTestator(trx, willId, stepData);
      break;

    case 2: // GENERAL: EXECUTORS | ISLAMIC: FAITH
      if (isIslamic) {
        await saveIslamicFaith(trx, willId, stepData);
      } else {
        await saveExecutors(trx, willId, stepData);
      }
      break;

    case 3: // EXECUTORS (Islamic) | SPOUSE (General)
      if (isIslamic) {
        await saveExecutors(trx, willId, stepData);
      } else {
        await saveSpouse(trx, willId, stepData);
      }
      break;

    case 4: // SPOUSE (Islamic) | BENEFICIARIES (General)
      if (isIslamic) {
        await saveSpouse(trx, willId, stepData);
      } else {
        await saveBeneficiary(trx, willId, stepData);
      }
      break;

    case 5: // BENEFICIARIES (Islamic) | ASSETS (General)
      if (isIslamic) {
        await saveBeneficiary(trx, willId, stepData);
      } else {
        await saveAssets(trx, willId, stepData);
      }
      break;

    case 6: // ASSETS (Islamic) | LIABILITIES (General)
      if (isIslamic) {
        await saveAssets(trx, willId, stepData);
      } else {
        await saveDebts(trx, willId, stepData);
      }
      break;

    case 7: // LIABILITIES (Islamic) | GIFTS (General)
      if (isIslamic) {
        await saveDebts(trx, willId, stepData);
      } else {
        await saveGifts(trx, willId, stepData);
      }
      break;

    case 8: // GIFTS (Islamic) | RESIDUAL (General)
      if (isIslamic) {
        await saveGifts(trx, willId, stepData);
      } else {
        await saveResidual(trx, willId, stepData);
      }
      break;

    case 9: // FUNERAL
      await saveFuneral(trx, willId, stepData);
      break;

    case 10: // GENERAL: WITNESSES | ISLAMIC: DISTRIBUTION
      if (isIslamic) {
        await saveIslamicDistribution(trx, willId, stepData);
      } else {
        await saveWitnesses(trx, willId, stepData);
      }
      break;

    case 11: // GENERAL: SIGNING | ISLAMIC: WITNESSES
      if (isIslamic) {
        await saveWitnesses(trx, willId, stepData);
      } else {
        await saveSigningDetails(trx, willId, stepData);
      }
      break;

    case 12: // SIGNING (Islamic only)
      if (!isIslamic) {
        throw new BadRequestError("Invalid step for general will");
      }
      await saveSigningDetails(trx, willId, stepData);
      break;

    default:
      throw new BadRequestError(`Unknown step number: ${stepNumber}`);
  }
};

// Upsert Testator
const upsertTestator = async (trx, willId, data) => {
  if (!data) return;

  const { ...testatorData } = data;

  if (Object.keys(testatorData).length === 0) return;

  const existing = await trx
    .selectFrom("testators")
    .select("id")
    .where("will_id", "=", willId)
    .executeTakeFirst();

  if (existing) {
    await trx
      .updateTable("testators")
      .set({
        ...testatorData,
        updated_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();
  } else {
    await trx
      .insertInto("testators")
      .values({
        id: generateUUID(),
        will_id: willId,
        ...testatorData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
  }
};

// Step 2  Executors
const saveExecutors = async (trx, willId, data) => {
  if (!data?.executors) return;

  await trx.deleteFrom("executors").where("will_id", "=", willId).execute();

  if (!data.executors.length) return;

  const rows = data.executors.map((e, index) => ({
    id: e.id || generateUUID(),
    will_id: willId,
    executor_type: e.executor_type,
    title: e.title,
    full_name: e.full_name,
    business_name: e.business_name,
    role_title: e.role_title,
    relationship_to_testator: e.relationship_to_testator,
    phone_country_code: e.phone_country_code,
    phone: e.phone,
    email: e.email,
    is_alternate: e.is_alternate,
    is_backup: e.is_backup,
    order_index: index + 1,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  await trx.insertInto("executors").values(rows).execute();
};

// Step 2 (Islamic) - Faith
const saveIslamicFaith = async () => {};

// Step 3 - Spouse
const saveSpouse = async (trx, willId, data) => {
  if (!data) return;

  const { is_spouse = false, spouse = [] } = data;

  // If user explicitly says no spouse → delete all spouse records
  if (!is_spouse) {
    await trx.deleteFrom("spouses").where("will_id", "=", willId).execute();
    return;
  }

  await trx.deleteFrom("spouses").where("will_id", "=", willId).execute();

  await trx
    .insertInto("spouses")
    .values(
      spouse.map((s, index) => ({
        id: s.id || generateUUID(),
        will_id: willId,
        is_spouse: true,
        title: s.title,
        full_name: s.full_name,
        building_number: s.building_number,
        building_name: s.building_name,
        street: s.street,
        town: s.town,
        city: s.city,
        county: s.county,
        postcode: s.postcode,
        country: s.country,
        phone_country_code: s.phone_country_code,
        phone: s.phone,
        date_of_birth: s.date_of_birth,
        relationship_to_testator: s.relationship_to_testator,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

// Step 4 - Beneficiaries (children, guardians, trustees, charities)
const saveChildren = async (trx, beneficiaryId, children = []) => {
  await trx
    .deleteFrom("children")
    .where("beneficiary_id", "=", beneficiaryId)
    .execute();

  if (!children.length) return;

  await trx
    .insertInto("children")
    .values(
      children.map((c, index) => ({
        id: c.id || generateUUID(),
        beneficiary_id: beneficiaryId,
        title: c.title,
        full_name: c.full_name,
        gender: c.gender,
        date_of_birth: c.date_of_birth,
        relationship_to_testator: c.relationship_to_testator,
        building_number: c.building_number,
        building_name: c.building_name,
        street: c.street,
        town: c.town,
        city: c.city,
        county: c.county,
        postcode: c.postcode,
        country: c.country,
        inheritance_age: c.inheritance_age,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveGuardians = async (trx, beneficiaryId, guardians = []) => {
  await trx
    .deleteFrom("guardians")
    .where("beneficiary_id", "=", beneficiaryId)
    .execute();

  if (!guardians.length) return;

  await trx
    .insertInto("guardians")
    .values(
      guardians.map((g, index) => ({
        id: g.id || generateUUID(),
        beneficiary_id: beneficiaryId,
        title: g.title,
        full_name: g.full_name,
        date_of_birth: g.date_of_birth,
        relationship_to_testator: g.relationship_to_testator,
        building_number: g.building_number,
        building_name: g.building_name,
        street: g.street,
        town: g.town,
        city: g.city,
        county: g.county,
        postcode: g.postcode,
        country: g.country,
        phone_country_code: g.phone_country_code,
        phone: g.phone,
        email: g.email,
        is_alternate: g.is_alternate ?? false,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveTrustees = async (trx, beneficiaryId, trustees = []) => {
  await trx
    .deleteFrom("trustees")
    .where("beneficiary_id", "=", beneficiaryId)
    .execute();

  if (!trustees.length) return;

  await trx
    .insertInto("trustees")
    .values(
      trustees.map((t, index) => ({
        id: t.id || generateUUID(),
        beneficiary_id: beneficiaryId,
        role_type: t.role_type,
        title: t.title,
        full_name: t.full_name,
        date_of_birth: t.date_of_birth,
        relationship_to_testator: t.relationship_to_testator,
        building_number: t.building_number,
        building_name: t.building_name,
        street: t.street,
        town: t.town,
        city: t.city,
        county: t.county,
        postcode: t.postcode,
        country: t.country,
        phone_country_code: t.phone_country_code,
        phone: t.phone,
        email: t.email,
        include_all_general_powers: t.include_all_general_powers,
        power_of_management: t.power_of_management,
        power_of_investment: t.power_of_investment,
        power_to_delegate: t.power_to_delegate,
        power_in_relation_to_property: t.power_in_relation_to_property,
        power_to_lend_and_borrow: t.power_to_lend_and_borrow,
        power_to_apply_income_for_minors: t.power_to_apply_income_for_minors,
        power_to_make_advancements: t.power_to_make_advancements,
        power_to_appropriate_assets: t.power_to_appropriate_assets,
        power_to_act_by_majority: t.power_to_act_by_majority,
        power_to_charge: t.power_to_charge,
        power_to_invest_in_non_interest_accounts:
          t.power_to_invest_in_non_interest_accounts,
        additional_powers: t.additional_powers,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveBeneficiaries = async (trx, beneficiaryId, beneficiaries = []) => {
  await trx
    .deleteFrom("beneficiaries")
    .where("beneficiary_id", "=", beneficiaryId)
    .execute();

  if (!beneficiaries.length) return;

  await trx
    .insertInto("beneficiaries")
    .values(
      beneficiaries.map((b, index) => ({
        id: b.id || generateUUID(),
        beneficiary_id: beneficiaryId,
        title: b.title,
        full_name: b.full_name,
        relationship_to_testator: b.relationship_to_testator,
        building_number: b.building_number,
        building_name: b.building_name,
        city: b.city,
        county: b.county,
        postcode: b.postcode,
        country: b.country,
        phone_country_code: b.phone_country_code,
        phone: b.phone,
        email: b.email,
        is_alternate: b.is_alternate ?? false,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveCharities = async (trx, beneficiaryId, charities = []) => {
  await trx
    .deleteFrom("charities")
    .where("beneficiary_id", "=", beneficiaryId)
    .execute();

  if (!charities.length) return;

  await trx
    .insertInto("charities")
    .values(
      charities.map((c, index) => ({
        id: c.id || generateUUID(),
        beneficiary_id: beneficiaryId,
        name: c.name,
        registration_number: c.registration_number,
        address: c.address,
        gift_amount: c.gift_amount,
        gift_percentage: c.gift_percentage,
        gift_description: c.gift_description,
        is_alternate: c.is_alternate ?? false,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveBeneficiary = async (trx, willId, data) => {
  if (!data) return;

  const {
    have_children,
    children,
    guardians,
    wants_backup,
    trustees,
    beneficiaries,
    has_charity,
    charities,
  } = data;

  // Check if Exists
  const existingBeneficiary = await trx
    .selectFrom("beneficiary")
    .select("id")
    .where("will_id", "=", willId)
    .executeTakeFirst();

  let beneficiaryId;

  if (existingBeneficiary) {
    // Update existing beneficiary
    beneficiaryId = existingBeneficiary.id;

    await trx
      .updateTable("beneficiary")
      .set({
        have_children,
        wants_backup,
        has_charity,
        updated_at: new Date(),
      })
      .where("id", "=", beneficiaryId)
      .execute();
  } else {
    // Insert new beneficiary
    beneficiaryId = generateUUID();

    await trx
      .insertInto("beneficiary")
      .values({
        id: beneficiaryId,
        will_id: willId,
        have_children,
        wants_backup,
        has_charity,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
  }

  // Children + Guardians
  if (have_children) {
    await saveChildren(trx, beneficiaryId, children);
    await saveGuardians(trx, beneficiaryId, guardians);
  } else {
    await saveChildren(trx, beneficiaryId, []);
    await saveGuardians(trx, beneficiaryId, []);
  }

  // Trustees
  if (wants_backup) {
    await saveTrustees(trx, beneficiaryId, trustees);
  } else {
    await saveTrustees(trx, beneficiaryId, []);
  }

  // Beneficiaries (always saved)
  await saveBeneficiaries(trx, beneficiaryId, beneficiaries);

  // Charities
  if (has_charity) {
    await saveCharities(trx, beneficiaryId, charities);
  } else {
    await saveCharities(trx, beneficiaryId, []);
  }
};

// Step 5 - Assets (property, bank accounts, investments, digital assets, intellectual assets, valuable items)
const savePropertyAssets = async (trx, assetsId, properties = []) => {
  await trx
    .deleteFrom("property_assets")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!properties.length) return;

  await trx
    .insertInto("property_assets")
    .values(
      properties.map((p, index) => {
        const isMortgage = p.is_mortgage === true;

        return {
          id: p.id || generateUUID(),
          assets_id: assetsId,

          building_number: p.building_number,
          building_name: p.building_name,
          street: p.street,
          town: p.town,
          county: p.county,
          postcode: p.postcode,
          country: p.country,
          ownership_type: p.ownership_type,
          estimated_value: p.estimated_value,
          account_location: p.account_location,
          is_mortgage: isMortgage,
          lender_name: isMortgage ? p.lender_name : null,
          note: isMortgage ? p.note : null,
          order_index: index + 1,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    )
    .execute();
};

const saveBankAccounts = async (trx, assetsId, bank_accounts) => {
  await trx
    .deleteFrom("bank_accounts")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!bank_accounts.length) return;

  await trx
    .insertInto("bank_accounts")
    .values(
      bank_accounts.map((b, index) => ({
        id: b.id || generateUUID(),
        assets_id: assetsId,
        bank_name: b.bank_name,
        account_type: b.account_type,
        account_number: b.account_number,
        account_location: b.account_location,
        additional_information: b.additional_information,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveInvestments = async (trx, assetsId, investments) => {
  await trx
    .deleteFrom("investments")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!investments.length) return;

  await trx
    .insertInto("investments")
    .values(
      investments.map((i, index) => ({
        id: i.id || generateUUID(),
        assets_id: assetsId,
        company_or_fund_name: i.company_or_fund_name,
        investment_type: i.investment_type,
        account_or_policy_number: i.account_or_policy_number,
        managed_by: i.managed_by,
        additional_information: i.additional_information,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveValuableItems = async (trx, assetsId, valuable_items) => {
  await trx
    .deleteFrom("valuable_items")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!valuable_items.length) return;

  await trx
    .insertInto("valuable_items")
    .values(
      valuable_items.map((v, index) => ({
        id: v.id || generateUUID(),
        assets_id: assetsId,
        category: v.category,
        description: v.description,
        location: v.location,
        additional_information: v.additional_information,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveDigitalAssets = async (trx, assetsId, digital_assets) => {
  await trx
    .deleteFrom("digital_assets")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!digital_assets.length) return;

  await trx
    .insertInto("digital_assets")
    .values(
      digital_assets.map((d, index) => ({
        id: d.id || generateUUID(),
        assets_id: assetsId,
        asset_type: d.asset_type,
        platform: d.platform,
        account_id: d.account_id,
        additional_information: d.additional_information,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveIntellectualAssets = async (trx, assetsId, intellectual_assets) => {
  await trx
    .deleteFrom("intellectual_assets")
    .where("assets_id", "=", assetsId)
    .execute();

  if (!intellectual_assets.length) return;

  await trx
    .insertInto("intellectual_assets")
    .values(
      intellectual_assets.map((i, index) => ({
        id: i.id || generateUUID(),
        assets_id: assetsId,
        asset_type: i.asset_type,
        title: i.title,
        description: i.description,
        status: i.status,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

const saveAssets = async (trx, willId, data) => {
  if (!data) return;

  const {
    has_property,
    properties,
    has_bank_account,
    bank_accounts,
    has_investment,
    investments,
    has_valuable_item,
    valuable_items,
    has_digital_asset,
    digital_assets,
    has_intellectual_asset,
    intellectual_assets,
  } = data;

  // Check If Exists
  const existingAssets = await trx
    .selectFrom("assets")
    .select("id")
    .where("will_id", "=", willId)
    .executeTakeFirst();

  let assetsId;

  if (existingAssets) {
    // Update existing assets
    assetsId = existingAssets.id;

    await trx
      .updateTable("assets")
      .set({
        has_property,
        has_bank_account,
        has_investment,
        has_valuable_item,
        has_digital_asset,
        has_intellectual_asset,
        updated_at: new Date(),
      })
      .where("id", "=", assetsId)
      .execute();
  } else {
    // Insert new assets row
    assetsId = generateUUID();

    await trx
      .insertInto("assets")
      .values({
        id: assetsId,
        will_id: willId,
        has_property,
        has_bank_account,
        has_investment,
        has_valuable_item,
        has_digital_asset,
        has_intellectual_asset,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
  }

  if (has_property) {
    await savePropertyAssets(trx, assetsId, properties);
  } else {
    await savePropertyAssets(trx, assetsId, []);
  }

  if (has_bank_account) {
    await saveBankAccounts(trx, assetsId, bank_accounts);
  } else {
    await saveBankAccounts(trx, assetsId, []);
  }

  if (has_investment) {
    await saveInvestments(trx, assetsId, investments);
  } else {
    await saveInvestments(trx, assetsId, []);
  }

  if (has_valuable_item) {
    await saveValuableItems(trx, assetsId, valuable_items);
  } else {
    await saveValuableItems(trx, assetsId, []);
  }

  if (has_digital_asset) {
    await saveDigitalAssets(trx, assetsId, digital_assets);
  } else {
    await saveDigitalAssets(trx, assetsId, []);
  }

  if (has_intellectual_asset) {
    await saveIntellectualAssets(trx, assetsId, intellectual_assets);
  } else {
    await saveIntellectualAssets(trx, assetsId, []);
  }
};

// Step 6 - Debts
const saveDebts = async (trx, willId, data) => {
if (!data) return;

  const { is_debtor = false, debts = [] } = data;

  // If NO then delete all debts records according to will id
  if (!is_debtor) {
    await trx.deleteFrom("debts").where("will_id", "=", willId).execute();
    return;
  }

  await trx.deleteFrom("debts").where("will_id", "=", willId).execute();

  await trx
    .insertInto("debts")
    .values(
      debts.map((s, index) => ({
        id: s.id || generateUUID(),
        will_id: willId,
        creditor_name: s.creditor_name,
        type_of_debt: s.type_of_debt,
        amount: s.outstanding_balance,
        additional_information: s.additional_information,
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )
    .execute();
};

// Step 7 Gifts (General) and Step 8 Gifts - (Islamic)
const saveGifts = async (trx, willId, data) => {
  if (!data) return;

  const { gifts = [] } = data;

  await trx
    .deleteFrom('gifts')
    .where('will_id', '=', willId)
    .execute();

  if (!gifts.length) return;

  await trx
    .insertInto('gifts')
    .values(
      gifts.map((g) => {
        const isCharity = g.is_charity === true;

        return {
          id: g.id || generateUUID(),
          will_id: willId,
          beneficiary_name:  g.beneficiary_name,
          asset_type_beneficiary: g.asset_type_beneficiary,
          gift_type_beneficiary:  g.gift_type_beneficiary,
          gift_description_beneficiary:g.gift_description_beneficiary,
          additional_information_beneficiary: g.additional_information_beneficiary,
          is_charity: isCharity,
          organization_name: isCharity ? g.organization_name : null,
          asset_type_charity: isCharity ? g.asset_type_charity : null,
          gift_type_charity: isCharity ? g.gift_type_charity : null,
          gift_description_charity: isCharity ? g.gift_description_charity : null,
          additional_information_charity: isCharity ? g.additional_information_charity : null,
        };
      })
    )
    .execute();
};

// Step 8 Residual (General)
const saveResidual = async (trx, willId, data) => {
  if(!data) return;

  const { residual_estates } = data;

  await trx
    .deleteFrom('residual_estates')
    .where('will_id', '=', willId)
    .execute();
  
  if (!residual_estates.length) return;

  await trx
  .insertInto('residual_estates')
  .values(
    residual_estates.map((r, index) => ({
      id: r.id || generateUUID(),
      will_id: willId,
      full_name: r.full_name,
      description: r.description,
      relationship_to_testator: r.relationship_to_testator,
      additional_information: r.additional_information,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  )
  .execute();
};

// Step 9 Funeral
const saveFuneral = async (trx, willId, data) => {
  if(!data) return;

  await trx
    .deleteFrom('funeral_wishes')
    .where('will_id', '=', willId)
    .execute();

  const funeral = data.funeral || data;
  if (!funeral || Object.keys(funeral).length === 0) return;

  const burialLocation = funeral.burial_location === true;
  const funeralExpense = funeral.funeral_expense === true;
  const donateOrgan = funeral.donate_organ === true;
  const donationType = funeral.organ_donation_type === 'all';
  const registeredDonor = funeral.is_registered_donor === true;

  await trx
    .insertInto('funeral_wishes')
    .values({
      id: funeral.id || generateUUID(),
      will_id: willId,
      body_disposition: funeral.body_disposition,
      burial_location: funeral.burial_location,
      location: burialLocation ? funeral.location : null,
      specific_request: burialLocation ? funeral.specific_request : null,
      funeral_expense: funeral.funeral_expense,
      payment_priority: funeralExpense ? funeral.payment_priority : null,
      provider_name: funeralExpense ? funeral.provider_name : null,
      policy_number: funeralExpense ? funeral.policy_number : null,
      title: funeralExpense ? funeral.title : null,
      holder_name: funeralExpense ? funeral.holder_name : null,
      coverage_amount: funeralExpense ? funeral.coverage_amount : null,
      phone_country_code: funeralExpense ? funeral.phone_country_code : null,
      phone: funeralExpense ? funeral.phone : null,
      email: funeralExpense ? funeral.email : null,
      website_url: funeralExpense ? funeral.website_url : null,
      document_location: funeralExpense ? funeral.document_location : null,
      donate_organ: funeral.donate_organ,
      organ_donation_type: donateOrgan ? funeral.organ_donation_type : null,
      heart: donationType ? null : funeral.heart,
      lungs: donationType ? null : funeral.lungs,
      kidneys: donationType ? null : funeral.kidneys,
      liver: donationType ? null : funeral.liver,
      corneas: donationType ? null : funeral.corneas,
      pancreas: donationType ? null : funeral.pancreas,
      tissue: donationType ? null : funeral.tissue,
      small_bowel: donationType ? null : funeral.small_bowel,
      is_registered_donor: funeral.is_registered_donor,
      reference_number: registeredDonor ? funeral.reference_number : null,
      additional_notes: funeral.additional_notes,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();
};

// Step 10 Distribution (Islamic)
const saveIslamicDistribution = async () => {};

// Step 10 Witnesses (General) and Step 11 Witnesses (Islamic)
const saveWitnesses = async () => {};

// Step 11 Signing (General) and Step 12 Signing (Islamic)
const saveSigningDetails = async () => {};

/**
 * Get step data for loading a specific step
 * Includes step status (locked, current, upcoming, editable)
 */
const getStepData = async (willId, stepNumber, userId, userRole) => {
  const will = await getWillWithAccess(willId, userId, userRole);
  const isIslamic = will.will_type === WILL_TYPES.ISLAMIC;
  const maxSteps = isIslamic ? TOTAL_STEPS.ISLAMIC : TOTAL_STEPS.GENERAL;

  const status = getStepStatus(will, stepNumber);
  const editCheck = checkStepEditable(will, stepNumber);

  let data = null;

  switch (stepNumber) {
    // STEP 1 — TESTATOR
    case 1: {
      const testator = await db
        .selectFrom("testators")
        .selectAll()
        .where("will_id", "=", willId)
        .executeTakeFirst();

      data = {
        ...testator,
        jurisdiction_country: testator?.jurisdiction_country,
        jurisdiction_region: testator?.jurisdiction_region,
      };
      break;
    }

    // STEP 3 — GENERAL: EXECUTORS | ISLAMIC: FAITH
    case 2: {
      if (isIslamic) {
        data = await db
          .selectFrom("islamic_faith")
          .selectAll()
          .where("will_id", "=", willId)
          .executeTakeFirst();
      } else {
        data = {
          executors: await db
            .selectFrom("executors")
            .selectAll()
            .where("will_id", "=", willId)
            .orderBy("order_index")
            .execute(),
        };
      }
      break;
    }

    // STEP 3 — GENERAL: SPOUSE | ISLAMIC: EXECUTORS
    case 3: {
      if (isIslamic) {
        data = {
          executors: await db
            .selectFrom("executors")
            .selectAll()
            .where("will_id", "=", willId)
            .orderBy("order_index")
            .execute(),
        };
      } else {
        const spouse = await db
          .selectFrom("spouses")
          .selectAll()
          .where("will_id", "=", willId)
          .orderBy("order_index")
          .execute();

        data = {
          is_spouse: spouse.some((s) => s.is_spouse === true),
          spouse,
        };
      }
      break;
    }

    // STEP 4 — GENERAL: BENEFICIARY BUNDLE | ISLAMIC: SPOUSE
    case 4: {
      if (isIslamic) {
        const spouse = await db
          .selectFrom("spouses")
          .selectAll()
          .where("will_id", "=", willId)
          .orderBy("order_index")
          .execute();

        data = {
          is_spouse: spouse.some((s) => s.is_spouse === true),
          spouse,
        };
      } else {
        const beneficiary = await db
          .selectFrom("beneficiary")
          .select(["id", "have_children", "wants_backup", "has_charity"])
          .where("will_id", "=", willId)
          .executeTakeFirst();

        let children = [],
          guardians = [],
          trustees = [],
          beneficiaries = [],
          charities = [];

        if (beneficiary) {
          children = await db
            .selectFrom("children")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          guardians = await db
            .selectFrom("guardians")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          trustees = await db
            .selectFrom("trustees")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          beneficiaries = await db
            .selectFrom("beneficiaries")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          charities = await db
            .selectFrom("charities")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
        }

        data = {
          have_children: beneficiary.have_children ?? false,
          children,
          guardians,
          wants_backup: beneficiary.wants_backup ?? false,
          trustees,
          beneficiaries,
          has_charity: beneficiary.has_charity ?? false,
          charities,
        };
      }
      break;
    }
    // STEP 5 — GENERAL: ASSETS | ISLAMIC: BENEFICIARY
    case 5: {
      if (isIslamic) {
        // Get beneficiary
        const beneficiary = await db
          .selectFrom("beneficiary")
          .select(["id", "have_children", "wants_backup", "has_charity"])
          .where("will_id", "=", willId)
          .executeTakeFirst();

        let children = [],
          guardians = [],
          trustees = [],
          beneficiaries = [],
          charities = [];
        if (beneficiary) {
          children = await db
            .selectFrom("children")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          guardians = await db
            .selectFrom("guardians")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          trustees = await db
            .selectFrom("trustees")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          beneficiaries = await db
            .selectFrom("beneficiaries")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
          charities = await db
            .selectFrom("charities")
            .selectAll()
            .where("beneficiary_id", "=", beneficiary.id)
            .orderBy("order_index")
            .execute();
        }

        data = {
          have_children: beneficiary.have_children ?? false,
          children,
          guardians,
          wants_backup: beneficiary.wants_backup ?? false,
          trustees,
          beneficiaries,
          has_charity: beneficiary.has_charity ?? false,
          charities,
        };
      } else {
        // Get assets
        const assets = await db
          .selectFrom("assets")
          .select([
            "id",
            "has_property",
            "has_bank_account",
            "has_investment",
            "has_valuable_item",
            "has_digital_asset",
            "has_intellectual_asset",
          ])
          .where("will_id", "=", willId)
          .executeTakeFirst();

        if (assets) {
          const properties = await db
            .selectFrom("property_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const bank_accounts = await db
            .selectFrom("bank_accounts")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const investments = await db
            .selectFrom("investments")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const valuable_items = await db
            .selectFrom("valuable_items")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const digital_assets = await db
            .selectFrom("digital_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const intellectual_assets = await db
            .selectFrom("intellectual_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();

          data = {
            has_property: assets.has_property ?? false,
            properties,
            has_bank_account: assets.has_bank_account ?? false,
            bank_accounts,
            has_investment: assets.has_investment ?? false,
            investments,
            has_valuable_item: assets.has_valuable_item ?? false,
            valuable_items,
            has_digital_asset: assets.has_digital_asset ?? false,
            digital_assets,
            has_intellectual_asset: assets.has_intellectual_asset ?? false,
            intellectual_assets,
          };
        }
      }
      break;
    }

    // STEP 6 — ASSETS (Islamic) | DEBTS (General)
    case 6:
      if (isIslamic) {
        // Get assets record first, then query child tables
        const assets = await db
          .selectFrom("assets")
          .select([
            "id",
            "has_property",
            "has_bank_account",
            "has_investment",
            "has_valuable_item",
            "has_digital_asset",
            "has_intellectual_asset",
          ])
          .where("will_id", "=", willId)
          .executeTakeFirst();

        if (assets) {
          const properties = await db
            .selectFrom("property_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const bank_accounts = await db
            .selectFrom("bank_accounts")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const investments = await db
            .selectFrom("investments")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const valuable_items = await db
            .selectFrom("valuable_items")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const digital_assets = await db
            .selectFrom("digital_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();
          const intellectual_assets = await db
            .selectFrom("intellectual_assets")
            .selectAll()
            .where("assets_id", "=", assets.id)
            .orderBy("order_index")
            .execute();

          data = {
            has_property: assets?.has_property ?? false,
            properties,
            has_bank_account: assets?.has_bank_account ?? false,
            bank_accounts,
            has_investment: assets?.has_investment ?? false,
            investments,
            has_valuable_item: assets?.has_valuable_item ?? false,
            valuable_items,
            has_digital_asset: assets?.has_digital_asset ?? false,
            digital_assets,
            has_intellectual_asset: assets?.has_intellectual_asset ?? false,
            intellectual_assets,
          };
        }
      } else {
        const debts = await db
          .selectFrom("debts")
          .selectAll()
          .where("will_id", "=", willId)
          .orderBy("order_index")
          .execute();
        const is_debtor = debts.length > 0;  
        data = { is_debtor, debts };
      }
      break;

    // STEP 7 — DEBTS (Islamic) | GIFTS (General)
    case 7:
      data = {};
      break;

    // STEP 8 — GIFTS (Islamic) | RESIDUAL (General)
    case 8:
      data = {};
      break;

    // STEP 9 — FUNERAL
    case 9:
      data = {};
      break;

    // STEP 10 — GENERAL: WITNESSES | ISLAMIC: DISTRIBUTION
    case 10:
      if (isIslamic) {
        data = {};
      } else {
        data = {
          witnesses: await db
            .selectFrom("witnesses")
            .selectAll()
            .where("will_id", "=", willId)
            .orderBy("order_index")
            .execute(),
        };
      }
      break;

    // STEP 11 — GENERAL: SIGNING | ISLAMIC: WITNESSES
    case 11:
      if (isIslamic) {
        data = {
          witnesses: await db
            .selectFrom("witnesses")
            .selectAll()
            .where("will_id", "=", willId)
            .orderBy("order_index")
            .execute(),
        };
      } else {
        data = { additional_clauses: [] };
      }
      break;

    // STEP 12 — SIGNING (Islamic only)
    case 12:
      if (isIslamic) {
        data = { additional_clauses: [] };
      }
      break;
  }

  return {
    step: stepNumber,
    status,
    can_edit: editCheck.canEdit,
    locked_reason: editCheck.reason,
    data,
    will_info: {
      id: will.id,
      status: will.status,
      current_step: will.current_step,
      highest_completed_step: will.highest_completed_step || 0,
      is_paid: will.is_paid || false,
      edit_unlocked: will.edit_unlocked || false,
      total_steps: maxSteps,
    },
  };
};

/**
 * Get all steps status for progress bar
 */
const getAllStepsStatus = async (willId, userId, userRole) => {
  const will = await getWillWithAccess(willId, userId, userRole);
  const maxSteps =
    will.will_type === WILL_TYPES.ISLAMIC
      ? TOTAL_STEPS.ISLAMIC
      : TOTAL_STEPS.GENERAL;

  const steps = [];

  for (let step = 1; step <= maxSteps; step++) {
    const status = getStepStatus(will, step);
    const editCheck = checkStepEditable(will, step);

    steps.push({
      step,
      status,
      can_edit: editCheck.canEdit,
      locked_reason: editCheck.reason,
    });
  }

  return {
    steps,
    will_info: {
      id: will.id,
      status: will.status,
      current_step: will.current_step,
      highest_completed_step: will.highest_completed_step || 0,
      is_paid: will.is_paid || false,
      edit_unlocked: will.edit_unlocked || false,
      total_steps: maxSteps,
    },
  };
};

module.exports = {
  saveStepData,
  getStepData,
  getAllStepsStatus,
  unlockWillForEditing,
  checkStepEditable,
  getStepStatus,
  getWillWithAccess,
};
