const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { WILL_STATUSES, WILL_TYPES, TOTAL_STEPS, ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');

// Get will with ownership check
const getWillWithAccess = async (willId, userId, userRole) => {
  const will = await db
    .selectFrom('wills')
    .selectAll()
    .where('id', '=', willId)
    .executeTakeFirst();

  if (!will) {
    throw new NotFoundError('Will');
  }

  if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
    if (will.user_id !== userId) {
      throw new NotFoundError('Will');
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
        reason: `Cannot access step ${stepNumber}. Please complete step ${highestCompleted + 1} first.` 
      };
    }
    // Paid but not unlocked - locked for editing
    return { 
      canEdit: false, 
      reason: 'Will is locked after payment. Payment required to unlock editing.' 
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
    reason: `Cannot access step ${stepNumber}. Please complete step ${highestCompleted + 1} first.` 
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
        return 'editable';
      }
      if (stepNumber === highestCompleted + 1) {
        return 'current';
      }
      return 'upcoming';
    }
    // Paid but locked
    if (stepNumber <= highestCompleted) {
      return 'locked';
    }
    if (stepNumber === highestCompleted + 1) {
      return 'locked'; // Current step also locked after payment
    }
    return 'upcoming';
  }

  // CASE 2: Not paid yet - steps are editable before payment
  if (stepNumber <= highestCompleted) {
    return 'completed'; // Done but still editable (before payment)
  }
  
  if (stepNumber === highestCompleted + 1) {
    return 'current'; // Current step to fill
  }
  
  return 'upcoming'; // Not yet accessible
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
const saveStepData = async (willId, stepNumber, stepData, userId, userRole, options = {}) => {
  const { action } = options;

  // Verify will access
  const will = await getWillWithAccess(willId, userId, userRole);

  // Validate step number
  const maxSteps = will.will_type === WILL_TYPES.ISLAMIC ? TOTAL_STEPS.ISLAMIC : TOTAL_STEPS.GENERAL;
  if (stepNumber < 1 || stepNumber > maxSteps) {
    throw new BadRequestError(`Invalid step number. Must be between 1 and ${maxSteps}`);
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
    if (action !== 'skip_and_continue') {
      await saveStepSpecificData(trx, willId, stepNumber, stepData, will);
    }

    // Calculate new values
    let newCurrentStep = will.current_step;
    let newHighestCompleted = will.highest_completed_step || 0;
    let newEditUnlocked = will.edit_unlocked;
    let newStatus = will.status;
    
    if (action === 'save_and_continue' || action === 'skip_and_continue') {
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
        logger.info('Post-payment edit completed, locking edits', { willId, stepNumber });
      }
      // NOTE: Before payment, NO locking - user can freely go back and edit
    } else if (action === 'save_and_back') {
      // Go back one step (but not below 1)
      newCurrentStep = Math.max(stepNumber - 1, 1);
      
      // Update highest completed if this step wasn't completed before
      if (stepNumber > newHighestCompleted) {
        newHighestCompleted = stepNumber;
      }
      
      // If post-payment edit, lock after saving (even when going back)
      if (isPostPaymentEdit) {
        newEditUnlocked = false;
        logger.info('Post-payment edit completed (back), locking edits', { willId, stepNumber });
      }
    } else if (action === 'save') {
      // Just save, don't change step
      // Update highest completed if needed
      if (stepNumber > newHighestCompleted) {
        newHighestCompleted = stepNumber;
      }
      
      // If post-payment edit, lock after saving
      if (isPostPaymentEdit) {
        newEditUnlocked = false;
        logger.info('Post-payment edit completed (save only), locking edits', { willId, stepNumber });
      }
    }

    // Update will
    const updatedWill = await trx
      .updateTable('wills')
      .set({
        current_step: newCurrentStep,
        highest_completed_step: newHighestCompleted,
        status: newStatus,
        edit_unlocked: newEditUnlocked,
        updated_at: new Date(),
      })
      .where('id', '=', willId)
      .returning([
        'id',
        'will_type',
        'marital_status',
        'status',
        'current_step',
        'highest_completed_step',
        'is_paid',
        'edit_unlocked',
        'updated_at',
      ])
      .executeTakeFirst();

    return updatedWill;
  });

  logger.info('Step data saved', { 
    willId, 
    stepNumber, 
    action, 
    newStep: result.current_step,
    highestCompleted: result.highest_completed_step,
    editUnlocked: result.edit_unlocked,
    userId 
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
      .updateTable('wills')
      .set({
        is_paid: true,
        paid_at: new Date(),
        payment_id: paymentId,
        edit_unlocked: true,
        edit_count: 1,
        updated_at: new Date(),
      })
      .where('id', '=', willId)
      .returningAll()
      .executeTakeFirst();

    logger.info('Will unlocked for editing (first payment)', { willId, paymentId });
    return updatedWill;
  } else {
    // Subsequent payment for more edits
    const updatedWill = await db
      .updateTable('wills')
      .set({
        payment_id: paymentId,
        edit_unlocked: true,
        edit_count: (will.edit_count || 0) + 1,
        updated_at: new Date(),
      })
      .where('id', '=', willId)
      .returningAll()
      .executeTakeFirst();

    logger.info('Will unlocked for editing (subsequent payment)', { 
      willId, 
      paymentId, 
      editCount: updatedWill.edit_count 
    });
    return updatedWill;
  }
};

/**
 * Save data for specific step
 * Routes to appropriate table based on step number
 */
const saveStepSpecificData = async (trx, willId, stepNumber, stepData, will) => {
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
        throw new BadRequestError('Invalid step for general will');
      }
      await saveSigningDetails(trx, willId, stepData);
      break;

    default:
      throw new BadRequestError(`Unknown step number: ${stepNumber}`);
  }
};


/**
 * Upsert testator (Step 1)
 * Also updates jurisdiction and marital_status on wills table if provided
 */
const upsertTestator = async (trx, willId, data) => {
  if (!data || Object.keys(data).length === 0) return;

  const {
    marital_status,
    ...testatorData
  } = data;

  /**
   * 1️⃣ Update WILL table (authoritative fields)
   */
  const willUpdate = {};

  if (marital_status !== undefined) {
    willUpdate.marital_status = marital_status;
    testatorData.marital_status = marital_status;
  }

  if (Object.keys(willUpdate).length > 0) {
    await trx
      .updateTable('wills')
      .set({
        ...willUpdate,
        updated_at: new Date(),
      })
      .where('id', '=', willId)
      .execute();
  }

  /**
   * 2️⃣ Upsert TESTATOR table (profile reference)
   */
  if (Object.keys(testatorData).length === 0) return;

  const existing = await trx
    .selectFrom('testators')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (existing) {
    await trx
      .updateTable('testators')
      .set({
        ...testatorData,
        updated_at: new Date(),
      })
      .where('id', '=', existing.id)
      .execute();
  } else {
    await trx
      .insertInto('testators')
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

  await trx.deleteFrom('executors').where('will_id', '=', willId).execute();

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

  await trx.insertInto('executors').values(rows).execute();
};

// Step 2 (Islamic) - Faith
const saveIslamicFaith = async () => {}

// Step 3 - Spouse
const saveSpouse = async (trx, willId, data) => {
  if (!data) return;

  const { is_spouse, spouse } = data;

  // Update wills table with is_spouse flag
  await trx
    .updateTable('wills')
    .set({
      is_spouse: is_spouse ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .execute();

  // If user says they have no spouse → delete all spouse records
  if (!is_spouse) {
    await trx
      .deleteFrom('spouses')
      .where('will_id', '=', willId)
      .execute();
    return;
  }

  // If spouse array is empty or missing → nothing to save yet (draft)
  if (!Array.isArray(spouse) || spouse.length === 0) {
    return;
  }

  // Full replace strategy
  await trx
    .deleteFrom('spouses')
    .where('will_id', '=', willId)
    .execute();

  const spouseRecords = spouse.map((s, index) => ({
    id: s.id || generateUUID(),
    will_id: willId,
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
  }));

  await trx
    .insertInto('spouses')
    .values(spouseRecords)
    .execute();
};

// Step 4 - Beneficiaries (children, guardians, trustees, charities)
const saveChildren = async (trx, willId, children = []) => {
  await trx.deleteFrom('children').where('will_id', '=', willId).execute();

  if (!children.length) return;

  await trx.insertInto('children').values(
    children.map((c, index) => ({
      id: c.id || generateUUID(),
      will_id: willId,
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
    }))
  ).execute();
};

const saveGuardians = async (trx, willId, guardians = []) => {
  await trx.deleteFrom('guardians').where('will_id', '=', willId).execute();

  if (!guardians.length) return;

  await trx.insertInto('guardians').values(
    guardians.map((g, index) => ({
      id: g.id || generateUUID(),
      will_id: willId,
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
    }))
  ).execute();
};

const saveTrustees = async (trx, willId, trustees = []) => {
  await trx.deleteFrom('trustees').where('will_id', '=', willId).execute();

  if (!trustees.length) return;

  await trx.insertInto('trustees').values(
    trustees.map((t, index) => ({
      id: t.id || generateUUID(),
      will_id: willId,
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
      power_to_invest_in_non_interest_accounts: t.power_to_invest_in_non_interest_accounts,
      additional_powers: t.additional_powers,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  ).execute();
};

const saveBeneficiaries = async (trx, willId, beneficiaries = []) => {
  await trx.deleteFrom('beneficiaries').where('will_id', '=', willId).execute();

  if (!beneficiaries.length) return;

  await trx.insertInto('beneficiaries').values(
    beneficiaries.map((b, index) => ({
      id: b.id || generateUUID(),
      will_id: willId,
      title: b.title,
      full_name: b.full_name,
      relationship_to_testator: b.relationship_to_testator,
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
    }))
  ).execute();
};

const saveCharities = async (trx, willId, charities = []) => {
  await trx.deleteFrom('charities').where('will_id', '=', willId).execute();

  if (!charities.length) return;

  await trx.insertInto('charities').values(
    charities.map((c, index) => ({
      id: c.id || generateUUID(),
      will_id: willId,
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
    }))
  ).execute();
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
    charities
  } = data;

  // Update wills table with user-choice flags
  await trx
    .updateTable('wills')
    .set({
      have_children: have_children ?? false,
      wants_backup: wants_backup ?? false,
      has_charity: has_charity ?? false,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .execute();

  // Save/Delete based on flags using consistent pattern
  // TRUE = Save data | FALSE = Delete all records (user changed mind)

  // 1️⃣ Children (controlled by have_children flag)
  if (have_children) {
    await saveChildren(trx, willId, children || []);
  } else {
    await saveChildren(trx, willId, []); // Deletes all
  }

  // 2️⃣ Guardians (only relevant if have_children = true, delete when no children)
  if (have_children) {
    await saveGuardians(trx, willId, guardians || []);
  } else {
    await saveGuardians(trx, willId, []); // Deletes all guardians when no children
  }

  // 3️⃣ Trustees (backup) (controlled by wants_backup flag)
  if (wants_backup) {
    await saveTrustees(trx, willId, trustees || []);
  } else {
    await saveTrustees(trx, willId, []); // Deletes all
  }

  // 4️⃣ Beneficiaries (always saved - independent of other flags)
  await saveBeneficiaries(trx, willId, beneficiaries || []);

  // 5️⃣ Charities (controlled by has_charity flag)
  if (has_charity) {
    await saveCharities(trx, willId, charities || []);
  } else {
    await saveCharities(trx, willId, []); // Deletes all
  }
};

// Step 5 - Assets
const saveAssets = async () => {};

// Step 6 - Debts
const saveDebts = async () => {};

// Step 7 Gifts (General) and Step 8 Gifts - (Islamic)
const saveGifts = async () => {};

// Step 8 Residual (General)
const saveResidual = async () => {};

// Step 9 Funeral
const saveFuneral = async () => {};

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
        .selectFrom('testators')
        .selectAll()
        .where('will_id', '=', willId)
        .executeTakeFirst();

      data = {
        ...testator,
        marital_status: testator?.marital_status ?? will.marital_status,
        jurisdiction_country: testator?.jurisdiction_country ?? will.jurisdiction_country,
        jurisdiction_region: testator?.jurisdiction_region ?? will.jurisdiction_region,
      };
      break;
    }

    // STEP 3 — GENERAL: EXECUTORS | ISLAMIC: FAITH
    case 2: {
      if (isIslamic) {
        data = await db
          .selectFrom('islamic_faith')
          .selectAll()
          .where('will_id', '=', willId)
          .executeTakeFirst();
      } else {
        data = {
          executors: await db
            .selectFrom('executors')
            .selectAll()
            .where('will_id', '=', willId)
            .orderBy('order_index')
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
            .selectFrom('executors')
            .selectAll()
            .where('will_id', '=', willId)
            .orderBy('order_index')
            .execute(),
        };
      } else {
        const spouse = await db
          .selectFrom('spouses')
          .selectAll()
          .where('will_id', '=', willId)
          .orderBy('order_index')
          .execute();

        data = {
          is_spouse: will.is_spouse ?? false,
          spouse,
        };
      }
      break;
    }

    // STEP 4 — GENERAL: BENEFICIARY BUNDLE | ISLAMIC: SPOUSE
    case 4: {
      if (isIslamic) {
        const spouse = await db
          .selectFrom('spouses')
          .selectAll()
          .where('will_id', '=', willId)
          .orderBy('order_index')
          .execute();

        data = {
          is_spouse: will.is_spouse ?? false,
          spouse,
        };
      } else {
        const children = await db.selectFrom('children').selectAll().where('will_id', '=', willId).execute();
        const guardians = await db.selectFrom('guardians').selectAll().where('will_id', '=', willId).execute();
        const trustees = await db.selectFrom('trustees').selectAll().where('will_id', '=', willId).execute();
        const beneficiaries = await db.selectFrom('beneficiaries').selectAll().where('will_id', '=', willId).execute();
        const charities = await db.selectFrom('charities').selectAll().where('will_id', '=', willId).execute();

        data = {
          have_children: will.have_children ?? false,
          children,
          guardians,
          wants_backup: will.wants_backup ?? false,
          trustees,
          beneficiaries,
          has_charity: will.has_charity ?? false,
          charities,
        };
      }
      break;
    }

    // STEP 5 — GENERAL: ASSETS | ISLAMIC: BENEFICIARY BUNDLE
    case 5: {
      if (isIslamic) {
        const children = await db.selectFrom('children').selectAll().where('will_id', '=', willId).execute();
        const guardians = await db.selectFrom('guardians').selectAll().where('will_id', '=', willId).execute();
        const trustees = await db.selectFrom('trustees').selectAll().where('will_id', '=', willId).execute();
        const beneficiaries = await db.selectFrom('beneficiaries').selectAll().where('will_id', '=', willId).execute();
        const charities = await db.selectFrom('charities').selectAll().where('will_id', '=', willId).execute();

        data = {
          have_children: will.have_children ?? false,
          children,
          guardians,
          wants_backup: will.wants_backup ?? false,
          trustees,
          beneficiaries,
          has_charity: will.has_charity ?? false,
          charities,
        };
      } else {
        data = { assets: [] }; // table not implemented yet
      }
      break;
    }

    // STEP 6 — ASSETS (Islamic) | DEBTS (General)
    case 6:
      data = {};
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
            .selectFrom('witnesses')
            .selectAll()
            .where('will_id', '=', willId)
            .orderBy('order_index')
            .execute(),
        };
      }
      break;

    // STEP 11 — GENERAL: SIGNING | ISLAMIC: WITNESSES
    case 11:
      if (isIslamic) {
        data = {
          witnesses: await db
            .selectFrom('witnesses')
            .selectAll()
            .where('will_id', '=', willId)
            .orderBy('order_index')
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
