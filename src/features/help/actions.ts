'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { isStaffRole } from '@/server/core/permissions';
import { helpRequestSchema, helpResponseSchema } from './schemas';
import {
  acceptResponse,
  createHelpRequest,
  createResponse,
  deleteHelpRequest,
  deleteResponse,
  notifyNearbyHelpers,
  setHelpRequestStatus,
  updateHelpRequest,
} from './service';

function readRequest(formData: FormData) {
  return {
    title: formData.get('title'),
    body: formData.get('body'),
    category: formData.get('category'),
    kind: formData.get('kind') || 'question',
    urgency: formData.get('urgency') || 'normal',
    visibility: formData.get('visibility') || 'public',
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    city: formData.get('city') ?? '',
    country: formData.get('country') ?? '',
  };
}

export async function createHelpRequestAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  return runAction({
    schema: helpRequestSchema,
    input: readRequest(formData),
    successMessage: 'Posted. People nearby can now see it.',
    handler: (data) => createHelpRequest(user.id, data),
  });
}

export async function updateHelpRequestAction(requestId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: helpRequestSchema,
    input: readRequest(formData),
    successMessage: 'Request updated.',
    handler: (data) => updateHelpRequest(user.id, requestId, data),
  });
  if (result.ok) revalidatePath(`/help/${requestId}`);
  return result;
}

export async function deleteHelpRequestAction(requestId: string): Promise<ActionResult> {
  const user = await requireUser();
  return runAction({ successMessage: 'Request deleted.', handler: () => deleteHelpRequest(user.id, requestId) });
}

export async function setHelpStatusAction(requestId: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'Status updated.',
    handler: () => setHelpRequestStatus(user.id, requestId, status),
  });
  if (result.ok) revalidatePath(`/help/${requestId}`);
  return result;
}

export async function createResponseAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: helpResponseSchema,
    input: { requestId: formData.get('requestId'), body: formData.get('body') },
    successMessage: 'Answer posted.',
    handler: (data) => createResponse(user.id, data),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function deleteResponseAction(responseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'Answer removed.',
    handler: () => deleteResponse(user.id, responseId, isStaffRole(user.role)),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function acceptResponseAction(requestId: string, responseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'Marked as solved. Thank you for closing the loop.',
    handler: () => acceptResponse(user.id, requestId, responseId),
  });
  if (result.ok) revalidatePath(`/help/${requestId}`);
  return result;
}

export async function notifyHelpersAction(requestId: string): Promise<ActionResult<{ notified: number }>> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'People who offered help nearby were notified.',
    handler: () => notifyNearbyHelpers(user.id, requestId),
  });
  return result;
}
