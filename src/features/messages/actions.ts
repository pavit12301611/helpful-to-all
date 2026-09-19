'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { runAction, type ActionResult } from '@/server/core/action';
import { ForbiddenError } from '@/lib/errors';
import { enforceRateLimit } from '@/lib/rate-limit';
import { deleteMessage, hideConversation, sendMessage, startConversation } from './service';

const startSchema = z.object({ username: z.string().trim().min(2, 'Add a username.').max(40) });
const sendSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, 'Write a message.').max(2000),
});

export async function startConversationAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction({
    schema: startSchema,
    input: { username: String(formData.get('username') ?? '') },
    successMessage: 'Conversation opened.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await enforceRateLimit('message', user.id);
      const conversation = await startConversation(user.id, data.username);
      revalidatePath('/messages');
      return { id: conversation.id };
    },
  });
}

export async function sendMessageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const conversationId = String(formData.get('conversationId') ?? '');
  return runAction({
    schema: sendSchema,
    input: { conversationId, body: String(formData.get('body') ?? '') },
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await enforceRateLimit('message', user.id);
      const message = await sendMessage(user.id, data.conversationId, data.body);
      revalidatePath('/messages');
      return { id: message.id };
    },
  });
}

export async function hideConversationAction(formData: FormData): Promise<ActionResult> {
  const conversationId = String(formData.get('conversationId') ?? '');
  return runAction({
    input: { conversationId },
    successMessage: 'Conversation hidden.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await hideConversation(user.id, conversationId);
      revalidatePath('/messages');
    },
  });
}

export async function deleteMessageAction(formData: FormData): Promise<ActionResult> {
  const conversationId = String(formData.get('conversationId') ?? '');
  const messageId = String(formData.get('messageId') ?? '');
  return runAction({
    input: { conversationId, messageId },
    successMessage: 'Message deleted.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await deleteMessage(user.id, messageId);
      revalidatePath('/messages');
    },
  });
}
