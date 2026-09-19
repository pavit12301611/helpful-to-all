'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { groupPostSchema, groupSchema, inviteSchema, pollSchema, shoppingItemSchema } from './schemas';
import {
  acceptInvite,
  addShoppingItem,
  createGroup,
  createInvite,
  createPoll,
  createPost,
  deleteGroup,
  deletePost,
  joinPublicGroup,
  leaveGroup,
  removeMember,
  removeShoppingItem,
  requestToJoin,
  reviewJoinRequest,
  setMemberRole,
  setPostPinned,
  toggleShoppingItem,
  updateGroup,
  votePoll,
} from './service';

export async function createGroupAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: groupSchema,
    input: {
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      kind: formData.get('kind') || 'friends',
      visibility: formData.get('visibility') || 'private',
    },
    successMessage: 'Group created.',
    handler: (data) => createGroup(user.id, data),
  });
  if (result.ok) {
    const group = result.data as unknown as { slug: string };
    revalidatePath('/groups');
    return { ok: true, data: { slug: group.slug }, message: result.message };
  }
  return result;
}

export async function updateGroupAction(groupId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: groupSchema,
    input: {
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      kind: formData.get('kind') || 'friends',
      visibility: formData.get('visibility') || 'private',
    },
    successMessage: 'Group updated.',
    handler: (data) => updateGroup(user.id, groupId, data),
  });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Group deleted.', handler: () => deleteGroup(user.id, groupId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function joinGroupAction(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'You joined the group.', handler: () => joinPublicGroup(user.id, groupId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function requestJoinAction(groupId: string, message?: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Request sent to the group admins.', handler: () => requestToJoin(user.id, groupId, message) });
  return result;
}

export async function reviewJoinRequestAction(requestId: string, approve: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: approve ? 'Member added.' : 'Request declined.', handler: () => reviewJoinRequest(user.id, requestId, approve) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function leaveGroupAction(groupId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'You left the group.', handler: () => leaveGroup(user.id, groupId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function setMemberRoleAction(groupId: string, userId: string, role: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Role updated.', handler: () => setMemberRole(user.id, groupId, userId, role) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function removeMemberAction(groupId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Member removed.', handler: () => removeMember(user.id, groupId, userId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function createInviteAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  return runAction({
    schema: inviteSchema,
    input: {
      groupId: formData.get('groupId'),
      email: formData.get('email') ?? '',
      message: formData.get('message') ?? '',
      role: formData.get('role') || 'member',
    },
    successMessage: 'Invite link created. Share it privately.',
    handler: (data) => createInvite(user.id, data),
  });
}

export async function acceptInviteAction(token: string): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'You joined the group.', handler: () => acceptInvite(user.id, token) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function createPostAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: groupPostSchema,
    input: {
      groupId: formData.get('groupId'),
      title: formData.get('title'),
      body: formData.get('body') ?? '',
      kind: formData.get('kind') || 'post',
    },
    successMessage: 'Posted to the group.',
    handler: (data) => createPost(user.id, data),
  });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Post removed.', handler: () => deletePost(user.id, postId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function pinPostAction(postId: string, pinned: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => setPostPinned(user.id, postId, pinned) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function createPollAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: pollSchema,
    input: {
      groupId: formData.get('groupId'),
      question: formData.get('question'),
      options: formData.getAll('options').filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
      multi: formData.get('multi') === 'on',
      closesAt: formData.get('closesAt') ?? '',
    },
    successMessage: 'Poll created.',
    handler: (data) => createPoll(user.id, data),
  });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function votePollAction(pollId: string, optionIds: string[]): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Vote counted.', handler: () => votePoll(user.id, pollId, optionIds) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function addShoppingItemAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: shoppingItemSchema,
    input: { groupId: formData.get('groupId'), label: formData.get('label'), quantity: formData.get('quantity') ?? '' },
    successMessage: 'Added to the list.',
    handler: (data) => addShoppingItem(user.id, data.groupId, data.label, data.quantity),
  });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function toggleShoppingAction(itemId: string, purchased: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => toggleShoppingItem(user.id, itemId, purchased) });
  if (result.ok) revalidatePath('/groups');
  return result;
}

export async function removeShoppingAction(itemId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Item removed.', handler: () => removeShoppingItem(user.id, itemId) });
  if (result.ok) revalidatePath('/groups');
  return result;
}
