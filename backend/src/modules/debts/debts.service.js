const { db } = require('../../db');
const { generateUUID } = require('../../utils/helpers');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { ROLES } = require('../../utils/constants');

// Get Will and Verify User Role
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

// Get all spouses for a will
const getDebts = async (willId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const debts = await db
    .selectFrom('debts')
    .selectAll()
    .where('will_id', '=', willId)
    .orderBy('order_index', 'asc')
    .execute();

  return debts;
};

// Get debt by ID
const getDebtById = async (willId, debtId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const debt = await db
    .selectFrom('debts')
    .selectAll()
    .where('id', '=', debtId)
    .where('will_id', '=', willId)
    .executeTakeFirst();

  if (!debt) {
    throw new NotFoundError('Debt not found or does not belong to this will');
  }

  return debt;
};

// Create new debt
const createDebt = async (willId, debtData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const maxOrder = await db
    .selectFrom('debts')
    .select(db.fn.max('order_index').as('max_order'))
    .where('will_id', '=', willId)
    .executeTakeFirst();

  const nextOrderIndex = (maxOrder?.max_order || 0) + 1;

  const newDebt = await db
    .insertInto('debts')
    .values({
      id: generateUUID(),
      will_id: willId,
      creditor_name: debtData.creditor_name,
      amount: debtData.outstanding_balance,
      type_of_debt: debtData.type_of_debt,
      additional_information: debtData.additional_information,  
      order_index: nextOrderIndex,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  return newDebt;
};

// Update debt
const updateDebt = async (willId, debtId, debtData, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  await getDebtById(willId, debtId, userId, userRole);

  const updatedDebt = await db
    .updateTable('debts')
    .set({
      creditor_name: debtData.creditor_name,
      amount: debtData.outstanding_balance,
      type_of_debt: debtData.type_of_debt,
      additional_information: debtData.additional_information,
      updated_at: new Date(),
    })
    .where('id', '=', debtId)
    .returningAll()
    .executeTakeFirst();

  return updatedDebt;
};
      
// Delete debt
const deleteDebt = async (willId, debtId, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  await getDebtById(willId, debtId, userId, userRole);

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('debts')
      .where('id', '=', debtId)
      .execute();

    const remainingDebts = await trx
      .selectFrom('debts')
      .select(['id'])
      .where('will_id', '=', willId)
      .orderBy('order_index', 'asc')
      .execute();

    for (let i = 0; i < remainingDebts.length; i++) {
      await trx
        .updateTable('debts')
        .set({ order_index: i + 1 })
        .where('id', '=', remainingDebts[i].id)
        .execute();
    }
  });
};

// Reorder debts
const reorderDebts = async (willId, debtIds, userId, userRole) => {
  await getWillWithAccess(willId, userId, userRole);

  const debts = await db
    .selectFrom('debts')
    .select(['id'])
    .where('will_id', '=', willId)
    .execute();

  const debtIdSet = new Set(debts.map((d) => d.id));
  const requestedIdSet = new Set(debtIds);

  if (debtIdSet.size !== requestedIdSet.size || 
      ![...debtIdSet].every((id) => requestedIdSet.has(id))) {
    throw new BadRequestError('Invalid debt IDs provided for reordering');
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < debtIds.length; i++) {
      await trx
        .updateTable('debts')
        .set({ order_index: i + 1 })
        .where('id', '=', debtIds[i])
        .execute();
    }
  });

  return getDebts(willId, userId, userRole);
};

module.exports = {
  getDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  reorderDebts
};