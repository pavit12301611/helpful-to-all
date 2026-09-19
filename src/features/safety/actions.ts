'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { bloodDonorSchema, emergencyContactSchema, emergencyNumberSchema, guideSchema, missingPersonSchema } from './schemas';
import {
  addEmergencyContact,
  createEmergencyNumber,
  createGuide,
  deleteDonorProfile,
  deleteEmergencyContact,
  deleteEmergencyNumber,
  reportMissingPerson,
  saveDonorProfile,
  setMissingStatus,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

export async function createEmergencyNumberAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: emergencyNumberSchema,
    input: read(formData, ['country', 'region', 'service', 'number', 'notes', 'source']),
    successMessage: 'Emergency number added.',
    handler: (data) => createEmergencyNumber(user.id, data, user.role),
  });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function deleteEmergencyNumberAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Emergency number removed.', handler: () => deleteEmergencyNumber(user.id, id, user.role) });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function createGuideAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: guideSchema,
    input: read(formData, ['slug', 'kind', 'title', 'body', 'locale', 'published']),
    successMessage: 'Guide published.',
    handler: (data) => createGuide(user.id, data, user.role),
  });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function saveDonorProfileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: bloodDonorSchema,
    input: read(formData, ['bloodGroup', 'city', 'country', 'lastDonatedAt', 'contactPreference', 'available']),
    successMessage: 'Donor details saved.',
    handler: (data) => saveDonorProfile(user.id, data),
  });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function deleteDonorProfileAction(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Donor listing removed.', handler: () => deleteDonorProfile(user.id) });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function addEmergencyContactAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: emergencyContactSchema,
    input: read(formData, ['name', 'relation', 'phone', 'isPrimary']),
    successMessage: 'Contact added.',
    handler: (data) => addEmergencyContact(user.id, data),
  });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function deleteEmergencyContactAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Contact removed.', handler: () => deleteEmergencyContact(user.id, id) });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function reportMissingPersonAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: missingPersonSchema,
    input: read(formData, ['name', 'age', 'lastSeenAt', 'lastSeenLocation', 'description', 'contactNote']),
    successMessage: 'Report submitted. Contact the police as well - OpenHub cannot do that for you.',
    handler: (data) => reportMissingPerson(user.id, data),
  });
  if (result.ok) revalidatePath('/safety');
  return result;
}

export async function setMissingStatusAction(id: string, status: 'searching' | 'found' | 'closed'): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Status updated.', handler: () => setMissingStatus(user.id, id, status, user.role) });
  if (result.ok) revalidatePath('/safety');
  return result;
}
