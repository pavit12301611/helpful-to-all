'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { habitSchema } from './schemas';
import { archiveHabit, createHabit, deleteHabit, logHabitToday, updateHabit } from './service';

function readHabit(formData: FormData) {
  return {
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    frequency: formData.get('frequency') || 'daily',
    targetCount: formData.get('targetCount') || 1,
  };
}

export async function createHabitAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({ schema: habitSchema, input: readHabit(formData), successMessage: 'Habit created.', handler: (data) => createHabit(user.id, data) });
  if (result.ok) revalidatePath('/habits');
  return result;
}

export async function updateHabitAction(habitId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ schema: habitSchema, input: readHabit(formData), successMessage: 'Habit updated.', handler: (data) => updateHabit(user.id, habitId, data) });
  if (result.ok) revalidatePath('/habits');
  return result;
}

export async function logHabitAction(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => logHabitToday(user.id, habitId) });
  if (result.ok) revalidatePath('/habits');
  return result;
}

export async function archiveHabitAction(habitId: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => archiveHabit(user.id, habitId, archived) });
  if (result.ok) revalidatePath('/habits');
  return result;
}

export async function deleteHabitAction(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Habit deleted.', handler: () => deleteHabit(user.id, habitId) });
  if (result.ok) revalidatePath('/habits');
  return result;
}
