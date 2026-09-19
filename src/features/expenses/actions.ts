'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { expenseSchema, splitShareTarget } from './schemas';
import { createExpense, deleteExpense, setSplitSettled, updateExpense } from './service';

function readExpense(formData: FormData) {
  const share = splitShareTarget(formData.get('groupId'));
  return {
    description: formData.get('description') ?? '',
    category: formData.get('category') || 'other',
    amount: formData.get('amount'),
    currency: formData.get('currency') || 'USD',
    occurredOn: formData.get('occurredOn') ?? '',
    groupId: share.groupId || (formData.get('tripId') ? '' : ''),
    tripId: share.tripId || String(formData.get('tripId') ?? ''),
    businessId: formData.get('businessId') ?? '',
    isShared: formData.get('isShared') === 'on',
  };
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({ schema: expenseSchema, input: readExpense(formData), successMessage: 'Expense added.', handler: (data) => createExpense(user.id, data) });
  if (result.ok) revalidatePath('/expenses');
  return result;
}

export async function updateExpenseAction(expenseId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ schema: expenseSchema, input: readExpense(formData), successMessage: 'Expense updated.', handler: (data) => updateExpense(user.id, expenseId, data) });
  if (result.ok) revalidatePath('/expenses');
  return result;
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Expense deleted.', handler: () => deleteExpense(user.id, expenseId) });
  if (result.ok) revalidatePath('/expenses');
  return result;
}

export async function settleSplitAction(splitId: string, settled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: settled ? 'Marked as settled.' : 'Marked as unpaid.', handler: () => setSplitSettled(user.id, splitId, settled) });
  if (result.ok) revalidatePath('/expenses');
  return result;
}
