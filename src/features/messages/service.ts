import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { notify } from '@/server/services/notifications';
import { blockedUserIds } from '@/features/social/service';

/**
 * Private messaging.
 *
 * Direct conversations only in v1. Every rule that keeps messaging safe lives
 * here: block lists, the recipient's `allowMessages` preference, and soft
 * deletes so a hidden thread stays hidden for that person only.
 */

export async function listConversations(userId: string) {
  const db = await getDb();
  const participations = await db.conversationParticipant.findMany({
    where: { userId, hiddenAt: null },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
          },
          messages: { where: { deletedAt: null, hiddenAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
    take: 50,
  });

  return participations.map(({ conversation, lastReadAt }) => {
    const others = conversation.participants.filter((participant) => participant.userId !== userId);
    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.title,
      others,
      lastMessage: conversation.messages[0] ?? null,
      lastMessageAt: conversation.lastMessageAt,
      unread: lastReadAt ? conversation.messages.filter((message) => message.createdAt > lastReadAt).length : conversation.messages.length,
    };
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const db = await getDb();
  const participation = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participation) throw new ForbiddenError('You are not part of this conversation.');

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      },
      messages: {
        where: { deletedAt: null, hiddenAt: null },
        include: { sender: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });
  if (!conversation) throw new NotFoundError('That conversation does not exist.');

  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  return conversation;
}

export async function startConversation(userId: string, username: string) {
  const db = await getDb();
  const recipient = await db.user.findFirst({
    where: { username: { equals: username } },
    include: { profile: { select: { allowMessages: true } } },
  });
  if (!recipient) throw new NotFoundError('No account with that username.');
  if (recipient.id === userId) throw new ForbiddenError('You cannot message yourself.');

  const blocked = await blockedUserIds(userId);
  if (blocked.includes(recipient.id)) throw new ForbiddenError('You cannot message someone you have blocked.');

  const preference = recipient.profile?.allowMessages ?? 'everyone';
  if (preference === 'none') throw new ForbiddenError(`${recipient.username} does not accept direct messages.`);

  const existing = await db.conversation.findFirst({
    where: {
      kind: 'direct',
      participants: { some: { userId } },
      AND: [{ participants: { some: { userId: recipient.id } } }],
    },
    orderBy: { lastMessageAt: 'desc' },
  });
  if (existing) return { id: existing.id };

  const conversation = await db.conversation.create({
    data: {
      kind: 'direct',
      participants: { create: [{ userId }, { userId: recipient.id }] },
    },
  });
  return { id: conversation.id };
}

export async function sendMessage(userId: string, conversationId: string, body: string) {
  const db = await getDb();
  const participation = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participation) throw new ForbiddenError('You are not part of this conversation.');

  const text = body.trim();
  if (text.length < 1) throw new ForbiddenError('Write a message first.');
  if (text.length > 2000) throw new ForbiddenError('Messages are limited to 2000 characters.');

  const message = await db.message.create({
    data: { conversationId, senderId: userId, body: text },
  });

  await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

  const others = await db.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    include: { user: { select: { username: true, profile: { select: { allowMessages: true } } } } },
  });

  const sender = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, profile: { select: { displayName: true } } },
  });

  for (const other of others) {
    if (other.user.profile?.allowMessages === 'none') continue;
    await notify({
      userId: other.userId,
      type: 'message',
      title: `New message from ${sender?.profile?.displayName ?? sender?.username ?? 'someone'}`,
      body: text.slice(0, 140),
      targetType: 'conversation',
      targetId: conversationId,
      link: `/messages?c=${conversationId}`,
      actorId: userId,
    });
  }

  return message;
}

export async function hideConversation(userId: string, conversationId: string) {
  const db = await getDb();
  const participation = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participation) throw new ForbiddenError('You are not part of this conversation.');
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { hiddenAt: new Date() },
  });
  return { hidden: true };
}

export async function deleteMessage(userId: string, messageId: string) {
  const db = await getDb();
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) throw new NotFoundError('That message does not exist.');
  if (message.senderId !== userId) throw new ForbiddenError('You can only delete your own messages.');
  await db.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
  return { deleted: true };
}
