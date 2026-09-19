'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { campaignSchema, campaignUpdateSchema, opportunitySchema, signupSchema } from './schemas';
import {
  addCampaignUpdate,
  cancelSignup,
  createCampaign,
  createOpportunity,
  deleteCampaign,
  deleteOpportunity,
  recordProgress,
  setSignupStatus,
  signUp,
  updateOpportunity,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

const OPPORTUNITY_KEYS = [
  'title',
  'description',
  'cause',
  'organizationName',
  'skillsNeeded',
  'itemsNeeded',
  'city',
  'country',
  'startsAt',
  'deadline',
  'volunteersNeeded',
];

export async function createOpportunityAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: opportunitySchema,
    input: read(formData, OPPORTUNITY_KEYS),
    successMessage: 'Opportunity published. A moderator can verify it later.',
    handler: (data) => createOpportunity(user.id, data),
  });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function updateOpportunityAction(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: opportunitySchema,
    input: read(formData, OPPORTUNITY_KEYS),
    successMessage: 'Opportunity updated.',
    handler: (data) => updateOpportunity(user.id, id, data, user.role),
  });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Opportunity removed.', handler: () => deleteOpportunity(user.id, id, user.role) });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function signUpAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: signupSchema,
    input: read(formData, ['opportunityId', 'message']),
    successMessage: 'You signed up. The organiser will confirm.',
    handler: (data) => signUp(user.id, data),
  });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function cancelSignupAction(signupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Signup cancelled.', handler: () => cancelSignup(user.id, signupId) });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function setSignupStatusAction(signupId: string, status: 'confirmed' | 'declined'): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: status === 'confirmed' ? 'Volunteer confirmed.' : 'Volunteer declined.', handler: () => setSignupStatus(user.id, signupId, status) });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function createCampaignAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: campaignSchema,
    input: read(formData, ['title', 'description', 'cause', 'kind', 'goalCents', 'itemsNeeded', 'city', 'country', 'contactEmail', 'deadline']),
    successMessage: 'Campaign published. Remember: OpenHub does not process payments.',
    handler: (data) => createCampaign(user.id, data),
  });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Campaign removed.', handler: () => deleteCampaign(user.id, id, user.role) });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function addCampaignUpdateAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: campaignUpdateSchema,
    input: read(formData, ['campaignId', 'title', 'body']),
    successMessage: 'Update posted.',
    handler: (data) => addCampaignUpdate(user.id, data),
  });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}

export async function recordProgressAction(campaignId: string, raisedCents: number): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Total updated.', handler: () => recordProgress(user.id, campaignId, raisedCents) });
  if (result.ok) revalidatePath('/volunteer');
  return result;
}
