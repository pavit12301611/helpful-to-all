'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { connectionSchema, meetingSchema, skillOfferSchema, skillRequestSchema, skillReviewSchema } from './schemas';
import {
  completeConnection,
  connect,
  createOffer,
  createRequest,
  deleteListing,
  respondToConnection,
  reviewSkill,
  scheduleMeeting,
  setListingActive,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

export async function createSkillOfferAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: skillOfferSchema,
    input: read(formData, ['skillId', 'format', 'level', 'description', 'availability', 'language', 'city', 'priceMode', 'priceCents', 'radiusKm']),
    successMessage: 'Your offer is live.',
    handler: (data) => createOffer(user.id, data),
  });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function createSkillRequestAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: skillRequestSchema,
    input: read(formData, ['skillId', 'format', 'level', 'description', 'availability', 'language', 'city', 'radiusKm']),
    successMessage: 'Your request is live.',
    handler: (data) => createRequest(user.id, data),
  });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function setListingActiveAction(kind: 'offer' | 'request', id: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: isActive ? 'Listing is live again.' : 'Listing paused.', handler: () => setListingActive(user.id, kind, id, isActive) });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function deleteListingAction(kind: 'offer' | 'request', id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Listing deleted.', handler: () => deleteListing(user.id, kind, id) });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function connectAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('message', user.id);
  const result = await runAction({
    schema: connectionSchema,
    input: read(formData, ['offerId', 'requestId', 'message']),
    successMessage: 'Request sent. They will answer through OpenHub.',
    handler: (data) => connect(user.id, data),
  });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function respondConnectionAction(connectionId: string, status: 'accepted' | 'declined'): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: status === 'accepted' ? 'Request accepted.' : 'Request declined.', handler: () => respondToConnection(user.id, connectionId, status) });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function scheduleMeetingAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: meetingSchema,
    input: read(formData, ['connectionId', 'meetingAt', 'meetingNote', 'status']),
    successMessage: 'Session scheduled.',
    handler: (data) => scheduleMeeting(user.id, data),
  });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function completeConnectionAction(connectionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Marked as finished.', handler: () => completeConnection(user.id, connectionId) });
  if (result.ok) revalidatePath('/skills');
  return result;
}

export async function reviewSkillAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: skillReviewSchema,
    input: read(formData, ['connectionId', 'revieweeId', 'rating', 'comment']),
    successMessage: 'Review published.',
    handler: (data) => reviewSkill(user.id, data),
  });
  if (result.ok) revalidatePath('/skills');
  return result;
}
