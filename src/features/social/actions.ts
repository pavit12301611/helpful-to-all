'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { isStaffRole } from '@/server/core/permissions';
import { commentSchema, blockSchema, reportSchema } from './schemas';
import { blockUser, createComment, createReport, deleteComment, toggleSaved, toggleVote, unblockUser } from './service';

export async function createCommentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: commentSchema,
    input,
    successMessage: 'Comment posted.',
    handler: (data) => createComment(user.id, data),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'Comment removed.',
    handler: () => deleteComment(user.id, commentId, isStaffRole(user.role)),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function voteAction(targetType: string, targetId: string, value: 1 | -1): Promise<ActionResult<{ score: number }>> {
  const user = await requireUser();
  const result = await runAction({
    handler: () => toggleVote(user.id, targetType, targetId, value),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function toggleSavedAction(targetType: string, targetId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await requireUser();
  const result = await runAction({ handler: () => toggleSaved(user.id, targetType, targetId) });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function reportAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  return runAction({
    schema: reportSchema,
    input,
    successMessage: 'Report sent to the moderators. Thank you for keeping OpenHub safe.',
    handler: (data) => createReport(user.id, data),
  });
}

export async function blockUserAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: blockSchema,
    input,
    successMessage: 'Member blocked. They can no longer message you.',
    handler: (data) => blockUser(user.id, data.blockedId, data.reason),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function unblockUserAction(blockedId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Member unblocked.', handler: () => unblockUser(user.id, blockedId) });
  if (result.ok) revalidatePath('/settings');
  return result;
}
