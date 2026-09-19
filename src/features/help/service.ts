import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { notify, notifyMany } from '@/server/services/notifications';
import { logActivity } from '@/server/core/audit';
import { enforceRateLimit } from '@/lib/rate-limit';
import { toCsv } from '@/lib/utils';
import { isStaffRole } from '@/server/core/permissions';
import { HELP_PAGE_SIZE, type HelpFilters, type HelpRequestInput, type HelpResponseInput } from './schemas';

/**
 * Community help: questions, requests and offers.
 *
 * Privacy rules:
 *  - private requests are visible only to their author and to staff
 *  - hidden (moderated) content is visible only to staff
 *  - answers and votes are attributed publicly, contact details never are
 */

export async function listHelpRequests(viewerId: string | null, filters: HelpFilters, viewerRole = 'user') {
  const db = await getDb();
  const staff = isStaffRole(viewerRole);

  const and: Record<string, unknown>[] = [];

  if (filters.q) {
    and.push({
      OR: [{ title: contains(filters.q) }, { body: contains(filters.q) }, { tags: contains(filters.q) }],
    });
  }

  // Only the author (and staff) may see private requests.
  if (filters.tab !== 'mine') {
    and.push(
      viewerId
        ? { OR: [{ visibility: 'public' }, { authorId: viewerId }] }
        : { visibility: 'public' },
    );
  }

  const where: Record<string, unknown> = {
    deletedAt: null,
    hiddenAt: staff ? undefined : null,
    AND: and,
  };

  switch (filters.tab) {
    case 'open':
      where.status = { in: ['open', 'in_progress'] };
      break;
    case 'mine':
      where.authorId = viewerId;
      break;
    case 'offers':
      where.kind = 'offer';
      break;
    case 'urgent':
      where.urgency = { in: ['high', 'urgent'] };
      where.status = { in: ['open', 'in_progress'] };
      break;
    case 'solved':
      where.status = 'solved';
      break;
    default:
      break;
  }

  if (filters.category) where.category = filters.category;
  if (filters.kind) where.kind = filters.kind;
  if (filters.status) where.status = filters.status;
  if (filters.urgency) where.urgency = filters.urgency;
  if (filters.city) where.city = contains(filters.city);

  const orderBy =
    filters.sort === 'helpful'
      ? [{ views: 'desc' as const }, { createdAt: 'desc' as const }]
      : filters.sort === 'urgent'
        ? [{ urgency: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

  const [requests, total] = await Promise.all([
    db.helpRequest.findMany({
      where,
      include: {
        author: { include: { profile: true } },
        _count: { select: { responses: true } },
      },
      orderBy,
      take: HELP_PAGE_SIZE,
      skip: (filters.page - 1) * HELP_PAGE_SIZE,
    }),
    db.helpRequest.count({ where }),
  ]);

  return { requests, total };
}

export async function getHelpRequest(viewerId: string | null, requestId: string, viewerRole = 'user') {
  const db = await getDb();
  const request = await db.helpRequest.findUnique({
    where: { id: requestId },
    include: {
      author: { include: { profile: true } },
      responses: {
        where: { deletedAt: null, hiddenAt: isStaffRole(viewerRole) ? undefined : null },
        include: { author: { include: { profile: true } } },
        orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
      },
      _count: { select: { responses: true } },
    },
  });

  if (!request || request.deletedAt) throw new NotFoundError('That request no longer exists.');
  if (request.hiddenAt && !isStaffRole(viewerRole)) throw new NotFoundError('That request is not available.');
  if (request.visibility === 'private' && request.authorId !== viewerId && !isStaffRole(viewerRole)) {
    throw new ForbiddenError('This request is private to its author.');
  }

  return request;
}

export async function createHelpRequest(userId: string, input: HelpRequestInput) {
  await enforceRateLimit('create', userId);
  const db = await getDb();
  const profile = await db.profile.findUnique({ where: { userId } });

  const request = await db.helpRequest.create({
    data: {
      authorId: userId,
      title: input.title,
      body: input.body,
      category: input.category,
      kind: input.kind ?? 'question',
      urgency: input.urgency ?? 'normal',
      visibility: input.visibility ?? 'public',
      tags: toCsv(input.tags ?? []),
      city: input.city || profile?.city || null,
      country: input.country || profile?.country || null,
    },
  });

  await logActivity({
    userId,
    type: 'help',
    description: `Posted a ${input.kind ?? 'question'}: ${input.title}`,
    targetType: 'help_request',
    targetId: request.id,
  });

  return request;
}

async function assertAuthor(userId: string, requestId: string) {
  const db = await getDb();
  const request = await db.helpRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError('Request not found.');
  if (request.authorId !== userId) throw new ForbiddenError('Only the person who posted it can change it.');
  return request;
}

export async function updateHelpRequest(userId: string, requestId: string, input: HelpRequestInput) {
  await assertAuthor(userId, requestId);
  const db = await getDb();
  return db.helpRequest.update({
    where: { id: requestId },
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      kind: input.kind ?? 'question',
      urgency: input.urgency ?? 'normal',
      visibility: input.visibility ?? 'public',
      tags: toCsv(input.tags ?? []),
      city: input.city || null,
      country: input.country || null,
    },
  });
}

export async function deleteHelpRequest(userId: string, requestId: string) {
  await assertAuthor(userId, requestId);
  const db = await getDb();
  await db.helpRequest.update({ where: { id: requestId }, data: { deletedAt: new Date() } });
}

export async function setHelpRequestStatus(userId: string, requestId: string, status: string) {
  await assertAuthor(userId, requestId);
  const db = await getDb();
  return db.helpRequest.update({ where: { id: requestId }, data: { status } });
}

export async function createResponse(userId: string, input: HelpResponseInput) {
  await enforceRateLimit('comment', userId);
  const db = await getDb();
  const request = await db.helpRequest.findUnique({ where: { id: input.requestId } });
  if (!request || request.deletedAt) throw new NotFoundError('That request no longer exists.');
  if (request.lockedAt) throw new ForbiddenError('This discussion is locked.');

  const response = await db.helpResponse.create({
    data: { requestId: input.requestId, authorId: userId, body: input.body },
  });

  await db.helpRequest.update({
    where: { id: input.requestId },
    data: { status: request.status === 'open' ? 'in_progress' : request.status },
  });

  await notify({
    userId: request.authorId,
    type: 'answer',
    title: 'Someone answered your request',
    body: `${input.body.slice(0, 140)}`,
    targetType: 'help_request',
    targetId: request.id,
    link: `/help/${request.id}`,
    actorId: userId,
  });

  await logActivity({
    userId,
    type: 'help',
    description: 'Answered a community request',
    targetType: 'help_request',
    targetId: request.id,
  });

  return response;
}

export async function deleteResponse(userId: string, responseId: string, staff: boolean) {
  const db = await getDb();
  const response = await db.helpResponse.findUnique({ where: { id: responseId } });
  if (!response) throw new NotFoundError('Answer not found.');
  if (response.authorId !== userId && !staff) throw new ForbiddenError('You can only remove your own answers.');
  await db.helpResponse.update({ where: { id: responseId }, data: { deletedAt: new Date() } });
}

export async function acceptResponse(userId: string, requestId: string, responseId: string) {
  await assertAuthor(userId, requestId);
  const db = await getDb();
  const response = await db.helpResponse.findFirst({ where: { id: responseId, requestId } });
  if (!response) throw new NotFoundError('That answer is not part of this request.');

  await db.$transaction([
    db.helpResponse.updateMany({ where: { requestId }, data: { isAccepted: false } }),
    db.helpResponse.update({ where: { id: responseId }, data: { isAccepted: true } }),
    db.helpRequest.update({ where: { id: requestId }, data: { status: 'solved', acceptedResponseId: responseId } }),
    db.profile.updateMany({ where: { userId: response.authorId }, data: { helpfulnessScore: { increment: 5 } } }),
  ]);

  await notify({
    userId: response.authorId,
    type: 'answer',
    title: 'Your answer was accepted',
    body: 'Thank you for helping your community.',
    targetType: 'help_request',
    targetId: requestId,
    link: `/help/${requestId}`,
    actorId: userId,
  });

  return response;
}

/** Nudge people in the same city who offered help in this category before. */
export async function notifyNearbyHelpers(userId: string, requestId: string) {
  const db = await getDb();
  const request = await db.helpRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError();
  if (request.authorId !== userId) throw new ForbiddenError('Only the author can send reminders.');

  const helpers = await db.helpRequest.findMany({
    where: {
      authorId: { not: userId },
      kind: 'offer',
      category: request.category,
      city: request.city ?? undefined,
      deletedAt: null,
    },
    select: { authorId: true },
    take: 10,
    distinct: ['authorId'],
  });

  await notifyMany(
    helpers.map((helper) => helper.authorId),
    {
      type: 'system',
      title: 'Someone nearby needs help',
      body: request.title,
      targetType: 'help_request',
      targetId: request.id,
      link: `/help/${request.id}`,
      actorId: userId,
    },
  );

  return { notified: helpers.length };
}
