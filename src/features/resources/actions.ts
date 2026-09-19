'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { editSuggestionSchema, resourceReviewSchema, resourceSchema } from './schemas';
import {
  confirmResource,
  createDirectoryResource,
  deleteDirectoryResource,
  deleteResourceReview,
  reviewResource,
  suggestEdit,
  updateDirectoryResource,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

const RESOURCE_KEYS = [
  'name',
  'category',
  'description',
  'address',
  'city',
  'country',
  'phone',
  'website',
  'latitude',
  'longitude',
  'openingHours',
  'accessibility',
  'priceLevel',
];

export async function createResourceEntryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: resourceSchema,
    input: read(formData, RESOURCE_KEYS),
    successMessage: 'Added to the directory. A moderator can verify it later.',
    handler: (data) => createDirectoryResource(user.id, data),
  });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function updateResourceEntryAction(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: resourceSchema,
    input: read(formData, RESOURCE_KEYS),
    successMessage: 'Entry updated.',
    handler: (data) => updateDirectoryResource(user.id, id, data, user.role),
  });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function deleteResourceEntryAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Entry removed.', handler: () => deleteDirectoryResource(user.id, id, user.role) });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function reviewResourceAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: resourceReviewSchema,
    input: read(formData, ['resourceId', 'rating', 'comment']),
    successMessage: 'Review saved.',
    handler: (data) => reviewResource(user.id, data),
  });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function deleteResourceReviewAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Review removed.', handler: () => deleteResourceReview(user.id, id, user.role) });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function suggestEditAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: editSuggestionSchema,
    input: read(formData, ['resourceId', 'field', 'proposedValue', 'note']),
    successMessage: 'Suggestion sent to moderators.',
    handler: (data) => suggestEdit(user.id, data),
  });
  if (result.ok) revalidatePath('/resources');
  return result;
}

export async function confirmResourceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Thanks for confirming.', handler: () => confirmResource(user.id, id) });
  if (result.ok) revalidatePath('/resources');
  return result;
}
