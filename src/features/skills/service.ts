import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { notify } from '@/server/services/notifications';
import { distanceKm } from '@/server/services/maps';
import { SKILL_PAGE_SIZE, type ConnectionInput, type MeetingInput, type SkillFilters, type SkillOfferInput, type SkillRequestInput, type SkillReviewInput } from './schemas';

/**
 * Skill exchange.
 *
 * People list what they can teach and what they want to learn, then connect
 * through OpenHub messages. Listings only ever carry a city and an optional
 * radius - never a home address, and contact details stay behind messaging.
 */

export async function listSkills() {
  const db = await getDb();
  return db.skill.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { offers: true, requests: true } } } });
}

export async function ensureSkill(name: string) {
  const db = await getDb();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const existing = await db.skill.findUnique({ where: { slug } });
  if (existing) return existing;
  return db.skill.create({ data: { name, slug } });
}

export async function listOffers(userId: string | null, filters: SkillFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { isActive: true };
  if (filters.skill) where.skillId = filters.skill;
  if (filters.format) where.format = { in: [filters.format, 'both'] };
  if (filters.city) where.city = contains(filters.city);
  if (filters.priceMode) where.priceMode = filters.priceMode;
  if (filters.q) where.skill = { name: contains(filters.q) };
  if (userId && filters.kind === 'learn') where.userId = { not: userId };

  const [offers, total] = await Promise.all([
    db.skillOffer.findMany({
      where,
      include: {
        skill: true,
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, city: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: SKILL_PAGE_SIZE,
      skip: (filters.page - 1) * SKILL_PAGE_SIZE,
    }),
    db.skillOffer.count({ where }),
  ]);

  return { offers, total };
}

export async function listRequests(userId: string | null, filters: SkillFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { isActive: true };
  if (filters.skill) where.skillId = filters.skill;
  if (filters.format) where.format = { in: [filters.format, 'both'] };
  if (filters.city) where.city = contains(filters.city);
  if (filters.q) where.skill = { name: contains(filters.q) };
  if (userId) where.userId = { not: userId };

  const [requests, total] = await Promise.all([
    db.skillRequest.findMany({
      where,
      include: { skill: true, user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, city: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: SKILL_PAGE_SIZE,
      skip: (filters.page - 1) * SKILL_PAGE_SIZE,
    }),
    db.skillRequest.count({ where }),
  ]);

  return { requests, total };
}

export async function getOffer(userId: string | null, id: string) {
  const db = await getDb();
  const offer = await db.skillOffer.findUnique({
    where: { id },
    include: {
      skill: true,
      user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, city: true, bio: true } } } },
    },
  });
  if (!offer || !offer.isActive) throw new NotFoundError('That listing is not available.');

  const reviews = await db.skillReview.findMany({
    where: { revieweeId: offer.userId },
    include: { reviewer: { select: { username: true, profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  void userId;
  return { ...offer, reviews };
}

export async function createOffer(userId: string, input: SkillOfferInput) {
  const db = await getDb();
  const offer = await db.skillOffer.create({
    data: {
      userId,
      skillId: input.skillId,
      format: input.format ?? 'both',
      level: input.level ?? 'intermediate',
      description: input.description,
      availability: input.availability || null,
      language: input.language || 'en',
      city: input.city || null,
      priceMode: input.priceMode ?? 'free',
      priceCents: input.priceCents ?? 0,
      radiusKm: input.radiusKm ?? null,
    },
  });
  await logActivity({ userId, type: 'skill', description: 'Listed a skill to teach', targetType: 'skill_offer', targetId: offer.id });
  return offer;
}

export async function createRequest(userId: string, input: SkillRequestInput) {
  const db = await getDb();
  return db.skillRequest.create({
    data: {
      userId,
      skillId: input.skillId,
      format: input.format ?? 'both',
      level: input.level ?? 'beginner',
      description: input.description,
      availability: input.availability || null,
      language: input.language || 'en',
      city: input.city || null,
      radiusKm: input.radiusKm ?? null,
    },
  });
}

export async function setListingActive(userId: string, kind: 'offer' | 'request', id: string, isActive: boolean) {
  const db = await getDb();
  if (kind === 'offer') {
    const offer = await db.skillOffer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundError('That listing does not exist.');
    if (offer.userId !== userId) throw new ForbiddenError('You can only change your own listings.');
    return db.skillOffer.update({ where: { id }, data: { isActive } });
  }
  const request = await db.skillRequest.findUnique({ where: { id } });
  if (!request) throw new NotFoundError('That listing does not exist.');
  if (request.userId !== userId) throw new ForbiddenError('You can only change your own listings.');
  return db.skillRequest.update({ where: { id }, data: { isActive } });
}

export async function deleteListing(userId: string, kind: 'offer' | 'request', id: string) {
  const db = await getDb();
  if (kind === 'offer') {
    const offer = await db.skillOffer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundError('That listing does not exist.');
    if (offer.userId !== userId) throw new ForbiddenError('You can only delete your own listings.');
    await db.skillOffer.delete({ where: { id } });
    return { deleted: true };
  }
  const request = await db.skillRequest.findUnique({ where: { id } });
  if (!request) throw new NotFoundError('That listing does not exist.');
  if (request.userId !== userId) throw new ForbiddenError('You can only delete your own listings.');
  await db.skillRequest.delete({ where: { id } });
  return { deleted: true };
}

/* ------------------------------------------------------------ connections */

export async function listConnections(userId: string) {
  const db = await getDb();
  return db.skillConnection.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    include: {
      fromUser: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      toUser: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      offer: { include: { skill: true } },
      request: { include: { skill: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function connect(userId: string, input: ConnectionInput) {
  const db = await getDb();
  if (!input.offerId && !input.requestId) throw new ForbiddenError('Choose a listing to respond to.');

  let toUserId: string;
  if (input.offerId) {
    const offer = await db.skillOffer.findUnique({ where: { id: input.offerId } });
    if (!offer || !offer.isActive) throw new NotFoundError('That listing is not available.');
    if (offer.userId === userId) throw new ForbiddenError('That is your own listing.');
    toUserId = offer.userId;
  } else {
    const request = await db.skillRequest.findUnique({ where: { id: input.requestId! } });
    if (!request || !request.isActive) throw new NotFoundError('That listing is not available.');
    if (request.userId === userId) throw new ForbiddenError('That is your own listing.');
    toUserId = request.userId;
  }

  const duplicate = await db.skillConnection.findFirst({
    where: {
      fromUserId: userId,
      toUserId,
      status: 'pending',
      ...(input.offerId ? { offerId: input.offerId } : { requestId: input.requestId! }),
    },
  });
  if (duplicate) throw new ForbiddenError('You already sent a request for this listing.');

  const connection = await db.skillConnection.create({
    data: {
      fromUserId: userId,
      toUserId,
      offerId: input.offerId || null,
      requestId: input.requestId || null,
      message: input.message,
      status: 'pending',
    },
  });

  await notify({
    userId: toUserId,
    type: 'skill_request',
    title: 'New skill connect request',
    body: input.message.slice(0, 140),
    targetType: 'skill_connection',
    targetId: connection.id,
    link: '/skills?tab=connections',
    actorId: userId,
  });

  return connection;
}

export async function respondToConnection(userId: string, connectionId: string, status: 'accepted' | 'declined') {
  const db = await getDb();
  const connection = await db.skillConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new NotFoundError('That request does not exist.');
  if (connection.toUserId !== userId) throw new ForbiddenError('Only the person asked can respond.');
  if (connection.status !== 'pending') throw new ForbiddenError('This request was already answered.');

  await db.skillConnection.update({ where: { id: connectionId }, data: { status } });
  await notify({
    userId: connection.fromUserId,
    type: 'skill_request',
    title: status === 'accepted' ? 'Your connect request was accepted' : 'Your connect request was declined',
    targetType: 'skill_connection',
    targetId: connectionId,
    link: '/skills?tab=connections',
    actorId: userId,
  });
  return { status };
}

export async function scheduleMeeting(userId: string, input: MeetingInput) {
  const db = await getDb();
  const connection = await db.skillConnection.findUnique({ where: { id: input.connectionId } });
  if (!connection) throw new NotFoundError('That request does not exist.');
  if (connection.fromUserId !== userId && connection.toUserId !== userId) {
    throw new ForbiddenError('You are not part of this connection.');
  }

  await db.skillConnection.update({
    where: { id: input.connectionId },
    data: {
      status: input.status ?? 'accepted',
      meetingAt: new Date(input.meetingAt),
      meetingNote: input.meetingNote || null,
    },
  });

  const otherUserId = connection.fromUserId === userId ? connection.toUserId : connection.fromUserId;
  await notify({
    userId: otherUserId,
    type: 'skill_request',
    title: 'A session was scheduled',
    body: input.meetingNote?.slice(0, 140) ?? 'Check the details in your skill connections.',
    targetType: 'skill_connection',
    targetId: input.connectionId,
    link: '/skills?tab=connections',
    actorId: userId,
  });

  return { scheduled: true };
}

export async function completeConnection(userId: string, connectionId: string) {
  const db = await getDb();
  const connection = await db.skillConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new NotFoundError('That request does not exist.');
  if (connection.fromUserId !== userId && connection.toUserId !== userId) throw new ForbiddenError('You are not part of this connection.');
  await db.skillConnection.update({ where: { id: connectionId }, data: { status: 'completed' } });
  return { completed: true };
}

/* ----------------------------------------------------------------- reviews */

export async function reviewSkill(userId: string, input: SkillReviewInput) {
  const db = await getDb();
  if (input.revieweeId === userId) throw new ForbiddenError('You cannot review yourself.');

  if (input.connectionId) {
    const connection = await db.skillConnection.findUnique({ where: { id: input.connectionId } });
    if (!connection) throw new NotFoundError('That connection does not exist.');
    if (connection.fromUserId !== userId && connection.toUserId !== userId) {
      throw new ForbiddenError('You can only review someone you connected with.');
    }
    if (input.revieweeId !== connection.fromUserId && input.revieweeId !== connection.toUserId) {
      throw new ForbiddenError('You can only review someone in this connection.');
    }
  }

  const review = await db.skillReview.create({
    data: {
      connectionId: input.connectionId || null,
      reviewerId: userId,
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment || null,
    },
  });

  await notify({
    userId: input.revieweeId,
    type: 'comment',
    title: 'You received a skill review',
    body: `${input.rating}/5${input.comment ? ` - ${input.comment.slice(0, 100)}` : ''}`,
    targetType: 'skill_review',
    targetId: review.id,
    link: `/members/${userId}`,
    actorId: userId,
  });

  return review;
}

export async function averageSkillRating(userId: string) {
  const db = await getDb();
  const reviews = await db.skillReview.findMany({ where: { revieweeId: userId }, select: { rating: true } });
  if (reviews.length === 0) return { average: null, count: 0 };
  return {
    average: Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)),
    count: reviews.length,
  };
}

export async function myListingCounts(userId: string) {
  const db = await getDb();
  const [offers, requests] = await Promise.all([
    db.skillOffer.findMany({ where: { userId }, include: { skill: true } }),
    db.skillRequest.findMany({ where: { userId }, include: { skill: true } }),
  ]);
  return { offers, requests };
}

/* --------------------------------------------------------------- matching */

/**
 * Suggests people whose offer matches what you want to learn (and the other way
 * round), ordered by distance when both sides shared a city and coordinates.
 */
export async function suggestMatches(userId: string, viewerPoint?: { lat: number; lng: number } | null) {
  const db = await getDb();
  const myRequests = await db.skillRequest.findMany({ where: { userId, isActive: true } });
  const myOffers = await db.skillOffer.findMany({ where: { userId, isActive: true } });

  const [offers, requests] = await Promise.all([
    myRequests.length
      ? db.skillOffer.findMany({
          where: { isActive: true, skillId: { in: myRequests.map((request) => request.skillId) }, userId: { not: userId } },
          include: { skill: true, user: { select: { username: true, profile: { select: { displayName: true, city: true, latitude: true, longitude: true } } } } },
          take: 6,
        })
      : Promise.resolve([]),
    myOffers.length
      ? db.skillRequest.findMany({
          where: { isActive: true, skillId: { in: myOffers.map((offer) => offer.skillId) }, userId: { not: userId } },
          include: { skill: true, user: { select: { username: true, profile: { select: { displayName: true, city: true, latitude: true, longitude: true } } } } },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const withDistance = <T extends { user: { profile: { latitude: number | null; longitude: number | null } | null } }>(rows: T[]) =>
    rows
      .map((row) => {
        const point = row.user.profile;
        const distance =
          viewerPoint && point?.latitude !== null && point?.latitude !== undefined && point.longitude !== null && point.longitude !== undefined
            ? Math.round(distanceKm(viewerPoint, { lat: point.latitude, lng: point.longitude }))
            : null;
        return { row, distance };
      })
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));

  return { teachers: withDistance(offers), learners: withDistance(requests) };
}
