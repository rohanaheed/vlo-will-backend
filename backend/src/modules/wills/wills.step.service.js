/**
 * Unified Step Service
 * Handles saving step data and auto-advancing in a single operation
 * 
 * STEP LOCKING LOGIC (Updated):
 * - BEFORE PAYMENT: User can freely edit ANY step (completed or current)
 *   - Can go back to previous steps, edit, save and continue
 *   - No locking before payment
 * - AFTER PAYMENT (is_paid=true): All steps are LOCKED
 *   - User must pay again to unlock for editing
 * - AFTER UNLOCK (is_paid=true, edit_unlocked=true): All steps are editable
 *   - After saving an edit, edit_unlocked becomes false (locked again)
 */

const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { WILL_STATUSES, WILL_TYPES, TOTAL_STEPS, ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Get will with ownership check
 */
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
  const { action = 'save_and_continue' } = options;

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
  switch (stepNumber) {
    case 1: // Your Details (Testator)
      await upsertTestator(trx, willId, stepData);
      break;

    case 2: // Executors (swapped - was step 3)
      await saveExecutors(trx, willId, stepData);
      break;

    case 3: // Spouse (swapped - was step 2)
      if (will.marital_status !== 'single') {
        await upsertSpouse(trx, willId, stepData);
      }
      break;

    case 4: // Children
      await saveChildren(trx, willId, stepData);
      break;

    case 5: // Guardians
      await saveGuardians(trx, willId, stepData);
      break;

    case 6: // Inheritance Age (stored in will's additional data or beneficiaries)
      await saveInheritanceAge(trx, willId, stepData);
      break;

    case 7: // Gifts (Beneficiaries with specific gifts)
      await saveBeneficiaries(trx, willId, stepData, false);
      break;

    case 8: // Remainder of Estate
      await saveBeneficiaries(trx, willId, stepData, true);
      break;

    case 9: // Total Failure Clause
      await saveTotalFailure(trx, willId, stepData);
      break;

    case 10: // Pets
      await savePets(trx, willId, stepData);
      break;

    case 11: // Additional Instructions
      await saveAdditionalClauses(trx, willId, stepData);
      break;

    case 12: // Signing Details
      await saveSigningDetails(trx, willId, stepData);
      break;

    // Islamic Will specific steps (13-16)
    case 13: // School of Thought
    case 14: // Religious Obligations
    case 15: // Charitable Bequests
    case 16: // Heirs
      await saveIslamicDetails(trx, willId, stepNumber, stepData);
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

  // Extract fields that go to wills table
  const { jurisdiction, marital_status, ...testatorData } = data;

  // Build wills update object
  const willsUpdate = {};
  if (jurisdiction) willsUpdate.jurisdiction = jurisdiction;
  if (marital_status) willsUpdate.marital_status = marital_status;

  // Update wills table if there are fields to update
  if (Object.keys(willsUpdate).length > 0) {
    await trx
      .updateTable('wills')
      .set({ ...willsUpdate, updated_at: new Date() })
      .where('id', '=', willId)
      .execute();
  }

  // Also save jurisdiction and marital_status to testators table for reference
  if (jurisdiction) {
    testatorData.jurisdiction = jurisdiction;
  }
  if (marital_status) {
    testatorData.marital_status = marital_status;
  }

  // Skip if no testator data to save
  if (Object.keys(testatorData).length === 0) return;

  const existing = await trx
    .selectFrom('testators')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (existing) {
    await trx
      .updateTable('testators')
      .set({ ...testatorData, updated_at: new Date() })
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

/**
 * Save executors (Step 3)
 * Handles array of executors with full replace strategy
 * Supports both Individual and Professional Advisor executors
 */

  const saveExecutors = async (trx, willId, data) => {
    if (!data || !data.executors) return;
  
    const { executors } = data;
  
    // Delete existing executors
    await trx
      .deleteFrom('executors')
      .where('will_id', '=', willId)
      .execute();
  
    // Insert new executors
    if (executors.length > 0) {
      const executorRecords = executors.map((executor, index) => ({
        id: executor.id || generateUUID(),
        will_id: willId,
        
        // Executor type
        executor_type: executor.executor_type || 'individual',
        
        // Individual fields
        title: executor.title,
        full_name: executor.full_name,
        relationship_to_testator: executor.relationship_to_testator,
        
        // Professional advisor fields
        business_name: executor.business_name,
        role_title: executor.role_title,
        
        // Contact details
        phone_country_code: executor.phone_country_code,
        phone: executor.phone,
        email: executor.email,
        
        // Executor role flags
        is_alternate: executor.is_alternate || false,
        is_backup: executor.is_backup || false,
        is_spouse: executor.is_spouse || false,
        
        // Legacy address fields
        address_line_1: executor.address_line_1,
        address_line_2: executor.address_line_2,
        city: executor.city,
        county: executor.county,
        postcode: executor.postcode,
        country: executor.country,
        
        order_index: index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      }));
  
      await trx
        .insertInto('executors')
        .values(executorRecords)
        .execute();
    }
  };

/**
 * Upsert spouse (Step 3)
 */
const upsertSpouse = async (trx, willId, data) => {
  if (!data || Object.keys(data).length === 0) return;

  const existing = await trx
    .selectFrom('spouses')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (existing) {
    await trx
      .updateTable('spouses')
      .set({ ...data, updated_at: new Date() })
      .where('id', '=', existing.id)
      .execute();
  } else {
    await trx
      .insertInto('spouses')
      .values({
        id: generateUUID(),
        will_id: willId,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
  }
};

/**
 * Save children (Step 4)
 */
const saveChildren = async (trx, willId, data) => {
  if (!data || !data.children) return;

  const { children } = data;

  // Delete existing
  await trx.deleteFrom('children').where('will_id', '=', willId).execute();

  // Insert new
  if (children.length > 0) {
    const records = children.map((child) => ({
      id: child.id || generateUUID(),
      will_id: willId,
      full_name: child.full_name,
      date_of_birth: child.date_of_birth,
      is_minor: child.is_minor || false,
      is_dependent: child.is_dependent || false,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('children').values(records).execute();
  }
};

/**
 * Save guardians (Step 5)
 */
const saveGuardians = async (trx, willId, data) => {
  if (!data || !data.guardians) return;

  const { guardians } = data;

  await trx.deleteFrom('guardians').where('will_id', '=', willId).execute();

  if (guardians.length > 0) {
    const records = guardians.map((guardian, index) => ({
      id: guardian.id || generateUUID(),
      will_id: willId,
      full_name: guardian.full_name,
      address_line_1: guardian.address_line_1,
      address_line_2: guardian.address_line_2,
      city: guardian.city,
      county: guardian.county,
      postcode: guardian.postcode,
      country: guardian.country,
      relationship_to_testator: guardian.relationship_to_testator,
      is_substitute: guardian.is_substitute || false,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('guardians').values(records).execute();
  }
};

/**
 * Save inheritance age settings (Step 6)
 */
const saveInheritanceAge = async (trx, willId, data) => {
  if (!data) return;

  const { inheritance_age, delay_inheritance } = data;

  // Update will with inheritance settings
  await trx
    .updateTable('wills')
    .set({
      additional_clauses: JSON.stringify({
        delay_inheritance,
        inheritance_age,
      }),
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .execute();
};

/**
 * Save beneficiaries (Step 7 & 8)
 */
const saveBeneficiaries = async (trx, willId, data, isRemainderStep) => {
  if (!data || !data.beneficiaries) return;

  const { beneficiaries } = data;

  // Only delete beneficiaries of the same type (gift vs remainder)
  await trx
    .deleteFrom('beneficiaries')
    .where('will_id', '=', willId)
    .where('is_remainder_beneficiary', '=', isRemainderStep)
    .execute();

  if (beneficiaries.length > 0) {
    const records = beneficiaries.map((ben, index) => ({
      id: ben.id || generateUUID(),
      will_id: willId,
      beneficiary_type: ben.beneficiary_type || 'individual',
      full_name: ben.full_name,
      address_line_1: ben.address_line_1,
      address_line_2: ben.address_line_2,
      city: ben.city,
      county: ben.county,
      postcode: ben.postcode,
      country: ben.country,
      relationship_to_testator: ben.relationship_to_testator,
      share_percentage: ben.share_percentage,
      specific_gift_description: ben.specific_gift_description,
      is_remainder_beneficiary: isRemainderStep,
      inheritance_age: ben.inheritance_age,
      pass_to_children_if_deceased: ben.pass_to_children_if_deceased ?? true,
      is_alternate: ben.is_alternate || false,
      alternate_for_id: ben.alternate_for_id,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('beneficiaries').values(records).execute();
  }

  // Also save charities if included
  if (data.charities && data.charities.length > 0) {
    await trx.deleteFrom('charities').where('will_id', '=', willId).execute();

    const charityRecords = data.charities.map((charity, index) => ({
      id: charity.id || generateUUID(),
      will_id: willId,
      name: charity.name,
      address_line_1: charity.address_line_1,
      address_line_2: charity.address_line_2,
      city: charity.city,
      county: charity.county,
      postcode: charity.postcode,
      country: charity.country,
      registration_number: charity.registration_number,
      gift_amount: charity.gift_amount,
      gift_percentage: charity.gift_percentage,
      gift_description: charity.gift_description,
      is_alternate: charity.is_alternate || false,
      alternate_for_id: charity.alternate_for_id,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('charities').values(charityRecords).execute();
  }
};

/**
 * Save total failure clause (Step 9)
 */
const saveTotalFailure = async (trx, willId, data) => {
  if (!data) return;

  const { distribution_type, wipeout_beneficiaries } = data;

  // Delete existing
  const existing = await trx
    .selectFrom('total_failure_clauses')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (existing) {
    await trx.deleteFrom('wipeout_beneficiaries').where('total_failure_clause_id', '=', existing.id).execute();
    await trx.deleteFrom('total_failure_clauses').where('id', '=', existing.id).execute();
  }

  // Create new
  const clauseId = generateUUID();
  await trx
    .insertInto('total_failure_clauses')
    .values({
      id: clauseId,
      will_id: willId,
      distribution_type: distribution_type || 'equal_family',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  // Add wipeout beneficiaries if custom distribution
  if (distribution_type === 'custom' && wipeout_beneficiaries?.length > 0) {
    const records = wipeout_beneficiaries.map((ben, index) => ({
      id: generateUUID(),
      total_failure_clause_id: clauseId,
      beneficiary_type: ben.beneficiary_type || 'individual',
      full_name: ben.full_name,
      address: ben.address,
      share_percentage: ben.share_percentage,
      is_alternate: ben.is_alternate || false,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('wipeout_beneficiaries').values(records).execute();
  }
};

/**
 * Save pets (Step 10)
 */
const savePets = async (trx, willId, data) => {
  if (!data || !data.pets) return;

  const { pets } = data;

  await trx.deleteFrom('pets').where('will_id', '=', willId).execute();

  if (pets.length > 0) {
    const records = pets.map((pet, index) => ({
      id: pet.id || generateUUID(),
      will_id: willId,
      name: pet.name,
      description: pet.description,
      fund_amount: pet.fund_amount,
      let_executor_appoint_caretaker: pet.let_executor_appoint_caretaker ?? true,
      caretaker_name: pet.caretaker_name,
      caretaker_address: pet.caretaker_address,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('pets').values(records).execute();
  }
};

/**
 * Save additional clauses (Step 11)
 */
const saveAdditionalClauses = async (trx, willId, data) => {
  if (!data) return;

  const { additional_clauses, funeral_wishes } = data;

  // Update will with additional clauses
  if (additional_clauses) {
    // Get existing additional_clauses and merge
    const will = await trx
      .selectFrom('wills')
      .select('additional_clauses')
      .where('id', '=', willId)
      .executeTakeFirst();

    const existingClauses = will?.additional_clauses ? JSON.parse(will.additional_clauses) : {};

    await trx
      .updateTable('wills')
      .set({
        additional_clauses: JSON.stringify({
          ...existingClauses,
          clauses: additional_clauses,
        }),
        updated_at: new Date(),
      })
      .where('id', '=', willId)
      .execute();
  }

  // Save funeral wishes
  if (funeral_wishes) {
    const existing = await trx
      .selectFrom('funeral_wishes')
      .select('id')
      .where('will_id', '=', willId)
      .executeTakeFirst();

    if (existing) {
      await trx
        .updateTable('funeral_wishes')
        .set({ ...funeral_wishes, updated_at: new Date() })
        .where('id', '=', existing.id)
        .execute();
    } else {
      await trx
        .insertInto('funeral_wishes')
        .values({
          id: generateUUID(),
          will_id: willId,
          ...funeral_wishes,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();
    }
  }
};

/**
 * Save signing details (Step 12)
 */
const saveSigningDetails = async (trx, willId, data) => {
  if (!data) return;

  const { signing_date, signing_place, witnesses } = data;

  // Update will signing info
  await trx
    .updateTable('wills')
    .set({
      signing_date,
      signing_place,
      updated_at: new Date(),
    })
    .where('id', '=', willId)
    .execute();

  // Save witnesses
  if (witnesses && witnesses.length > 0) {
    await trx.deleteFrom('witnesses').where('will_id', '=', willId).execute();

    const records = witnesses.map((witness, index) => ({
      id: witness.id || generateUUID(),
      will_id: willId,
      full_name: witness.full_name,
      address_line_1: witness.address_line_1,
      address_line_2: witness.address_line_2,
      city: witness.city,
      county: witness.county,
      postcode: witness.postcode,
      country: witness.country,
      order_index: index + 1,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx.insertInto('witnesses').values(records).execute();
  }
};

/**
 * Save Islamic will details (Steps 13-16)
 */
const saveIslamicDetails = async (trx, willId, stepNumber, data) => {
  if (!data) return;

  // Get or create islamic_will_details
  let islamicDetails = await trx
    .selectFrom('islamic_will_details')
    .select('id')
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!islamicDetails) {
    const detailsId = generateUUID();
    await trx
      .insertInto('islamic_will_details')
      .values({
        id: detailsId,
        will_id: willId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();
    islamicDetails = { id: detailsId };
  }

  switch (stepNumber) {
    case 13: // School of Thought
      await trx
        .updateTable('islamic_will_details')
        .set({
          school_of_thought: data.school_of_thought,
          declaration_of_faith: data.declaration_of_faith,
          updated_at: new Date(),
        })
        .where('id', '=', islamicDetails.id)
        .execute();
      break;

    case 14: // Religious Obligations
      await trx
        .updateTable('islamic_will_details')
        .set({
          unfulfilled_obligations: JSON.stringify(data.unfulfilled_obligations),
          kaffarah_description: data.kaffarah_description,
          kaffarah_amount: data.kaffarah_amount,
          unpaid_mahr: data.unpaid_mahr,
          updated_at: new Date(),
        })
        .where('id', '=', islamicDetails.id)
        .execute();
      break;

    case 15: // Charitable Bequests
      await trx
        .updateTable('islamic_will_details')
        .set({
          charitable_bequest_percentage: data.charitable_bequest_percentage,
          sadaqa_jariyah_details: data.sadaqa_jariyah_details,
          loan_forgiveness_details: data.loan_forgiveness_details,
          updated_at: new Date(),
        })
        .where('id', '=', islamicDetails.id)
        .execute();
      break;

    case 16: // Heirs
      // Delete existing heirs
      await trx
        .deleteFrom('islamic_heirs')
        .where('islamic_will_details_id', '=', islamicDetails.id)
        .execute();

      // Add new heirs
      if (data.heirs && data.heirs.length > 0) {
        const heirRecords = data.heirs.map((heir) => ({
          id: generateUUID(),
          islamic_will_details_id: islamicDetails.id,
          relationship: heir.relationship,
          full_name: heir.full_name,
          is_alive: heir.is_alive ?? true,
          calculated_share: heir.calculated_share,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        await trx.insertInto('islamic_heirs').values(heirRecords).execute();
      }

      // Update scholar info
      await trx
        .updateTable('islamic_will_details')
        .set({
          appointed_scholar_name: data.appointed_scholar_name,
          appointed_scholar_contact: data.appointed_scholar_contact,
          updated_at: new Date(),
        })
        .where('id', '=', islamicDetails.id)
        .execute();
      break;
  }
};

/**
 * Get step data for loading a specific step
 * Includes step status (locked, current, upcoming, editable)
 */
const getStepData = async (willId, stepNumber, userId, userRole) => {
  const will = await getWillWithAccess(willId, userId, userRole);
  const maxSteps = will.will_type === WILL_TYPES.ISLAMIC ? TOTAL_STEPS.ISLAMIC : TOTAL_STEPS.GENERAL;

  // Get step status
  const status = getStepStatus(will, stepNumber);
  const editCheck = checkStepEditable(will, stepNumber);

  // Get step-specific data
  let data = null;
  switch (stepNumber) {
    case 1:
      const testator = await db.selectFrom('testators').selectAll().where('will_id', '=', willId).executeTakeFirst();
      // Include jurisdiction and marital_status from will
      data = { 
        ...testator, 
        jurisdiction: testator?.jurisdiction || will.jurisdiction,
        marital_status: testator?.marital_status || will.marital_status,
      };
      break;
    case 2: // Executors (swapped - was step 3)
      data = { executors: await db.selectFrom('executors').selectAll().where('will_id', '=', willId).orderBy('order_index').execute() };
      break;
    case 3: // Spouse (swapped - was step 2)
      data = await db.selectFrom('spouses').selectAll().where('will_id', '=', willId).executeTakeFirst();
      break;
    case 4:
      data = { children: await db.selectFrom('children').selectAll().where('will_id', '=', willId).execute() };
      break;
    case 5:
      data = { guardians: await db.selectFrom('guardians').selectAll().where('will_id', '=', willId).orderBy('order_index').execute() };
      break;
    case 6:
      data = will.additional_clauses ? JSON.parse(will.additional_clauses) : {};
      break;
    case 7:
      data = {
        beneficiaries: await db.selectFrom('beneficiaries').selectAll().where('will_id', '=', willId).where('is_remainder_beneficiary', '=', false).orderBy('order_index').execute(),
        charities: await db.selectFrom('charities').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
      };
      break;
    case 8:
      data = {
        beneficiaries: await db.selectFrom('beneficiaries').selectAll().where('will_id', '=', willId).where('is_remainder_beneficiary', '=', true).orderBy('order_index').execute(),
      };
      break;
    case 9:
      const clause = await db.selectFrom('total_failure_clauses').selectAll().where('will_id', '=', willId).executeTakeFirst();
      if (clause) {
        const wipeout = await db.selectFrom('wipeout_beneficiaries').selectAll().where('total_failure_clause_id', '=', clause.id).orderBy('order_index').execute();
        data = { ...clause, wipeout_beneficiaries: wipeout };
      }
      break;
    case 10:
      data = { pets: await db.selectFrom('pets').selectAll().where('will_id', '=', willId).orderBy('order_index').execute() };
      break;
    case 11:
      const funeralWishes = await db.selectFrom('funeral_wishes').selectAll().where('will_id', '=', willId).executeTakeFirst();
      const additionalClauses = will.additional_clauses ? JSON.parse(will.additional_clauses) : {};
      data = { funeral_wishes: funeralWishes, additional_clauses: additionalClauses.clauses || [] };
      break;
    case 12:
      data = {
        signing_date: will.signing_date,
        signing_place: will.signing_place,
        witnesses: await db.selectFrom('witnesses').selectAll().where('will_id', '=', willId).orderBy('order_index').execute(),
      };
      break;
    default:
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
  const maxSteps = will.will_type === WILL_TYPES.ISLAMIC ? TOTAL_STEPS.ISLAMIC : TOTAL_STEPS.GENERAL;

  const steps = [];
  for (let i = 1; i <= maxSteps; i++) {
    const status = getStepStatus(will, i);
    const editCheck = checkStepEditable(will, i);
    steps.push({
      step: i,
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
};
