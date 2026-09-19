import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { logActivity } from '@/server/core/audit';
import { notify } from '@/server/services/notifications';
import { splitEvenly } from '@/features/expenses/service';
import type { ItineraryItemInput, PackingItemInput, TripExpenseInput, TripInput } from './schemas';

/**
 * Trip planner.
 *
 * Itinerary, packing list, shared budget with expense splitting, polls, notes,
 * map links and emergency contacts for the group travelling together.
 */

export async function listTrips(userId: string) {
  const db = await getDb();
  return db.trip.findMany({
    where: { deletedAt: null, members: { some: { userId } } },
    include: {
      _count: { select: { members: true, itinerary: true, expenses: true } },
      members: { include: { user: { select: { username: true, profile: { select: { displayName: true } } } } } },
    },
    orderBy: { startsAt: 'asc' },
  });
}

export async function getTrip(userId: string, id: string) {
  const db = await getDb();
  const trip = await db.trip.findFirst({
    where: { id, deletedAt: null },
    include: {
      members: { include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } }, orderBy: { joinedAt: 'asc' } },
      itinerary: { orderBy: [{ startsAt: 'asc' }, { position: 'asc' }] },
      packing: { orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] },
      expenses: { include: { splits: { include: { user: { select: { username: true, profile: { select: { displayName: true } } } } } }, owner: { select: { username: true, profile: { select: { displayName: true } } } } }, orderBy: { occurredOn: 'desc' } },
      polls: { include: { options: { include: { votes: true }, orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'desc' } },
      owner: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
    },
  });
  if (!trip) throw new NotFoundError('That trip does not exist.');

  const isMember = trip.members.some((member) => member.userId === userId);
  if (!isMember) throw new ForbiddenError('Only people on this trip can open it.');

  return trip;
}

export async function createTrip(userId: string, input: TripInput) {
  const db = await getDb();
  const trip = await db.trip.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description || null,
      destination: input.destination || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      budgetCents: input.budgetCents ?? null,
      currency: input.currency || 'INR',
      visibility: input.visibility ?? 'private',
      accommodationNotes: input.accommodationNotes || null,
      transportNotes: input.transportNotes || null,
      importantContacts: input.importantContacts || null,
      members: { create: { userId, role: 'owner' } },
    },
  });
  await logActivity({ userId, type: 'trip', description: `Planned trip “${input.title}”`, targetType: 'trip', targetId: trip.id });
  return trip;
}

export async function updateTrip(userId: string, id: string, input: TripInput) {
  const db = await getDb();
  const trip = await db.trip.findUnique({ where: { id } });
  if (!trip) throw new NotFoundError('That trip does not exist.');
  if (trip.ownerId !== userId) throw new ForbiddenError('Only the trip owner can change these details.');

  return db.trip.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      destination: input.destination || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      budgetCents: input.budgetCents ?? null,
      currency: input.currency || trip.currency,
      visibility: input.visibility ?? trip.visibility,
      accommodationNotes: input.accommodationNotes || null,
      transportNotes: input.transportNotes || null,
      importantContacts: input.importantContacts || null,
    },
  });
}

export async function deleteTrip(userId: string, id: string) {
  const db = await getDb();
  const trip = await db.trip.findUnique({ where: { id } });
  if (!trip) throw new NotFoundError('That trip does not exist.');
  if (trip.ownerId !== userId) throw new ForbiddenError('Only the trip owner can delete it.');
  await db.trip.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function addTripMember(userId: string, tripId: string, username: string) {
  const db = await getDb();
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new NotFoundError('That trip does not exist.');
  if (trip.ownerId !== userId) throw new ForbiddenError('Only the trip owner can add people.');

  const invitee = await db.user.findFirst({ where: { username: { equals: username } } });
  if (!invitee) throw new NotFoundError('No account with that username.');

  const existing = await db.tripMember.findUnique({ where: { tripId_userId: { tripId, userId: invitee.id } } });
  if (existing) throw new ForbiddenError('They are already on this trip.');

  await db.tripMember.create({ data: { tripId, userId: invitee.id, role: 'member' } });
  await notify({
    userId: invitee.id,
    type: 'system',
    title: `You were added to “${trip.title}”`,
    body: trip.destination ?? 'Open the trip to see the plan.',
    targetType: 'trip',
    targetId: trip.id,
    link: `/trips/${trip.id}`,
    actorId: userId,
  });
  return { added: true };
}

export async function leaveTrip(userId: string, tripId: string) {
  const db = await getDb();
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new NotFoundError('That trip does not exist.');
  if (trip.ownerId === userId) throw new ForbiddenError('The owner cannot leave. Delete the trip instead.');
  await db.tripMember.deleteMany({ where: { tripId, userId } });
  return { left: true };
}

/* --------------------------------------------------------------- itinerary */

export async function addItineraryItem(userId: string, input: ItineraryItemInput) {
  const db = await getDb();
  await requireTripMember(userId, input.tripId);
  return db.itineraryItem.create({
    data: {
      tripId: input.tripId,
      addedById: userId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      costCents: input.costCents ?? null,
      position: 0,
    },
  });
}

export async function deleteItineraryItem(userId: string, id: string) {
  const db = await getDb();
  const item = await db.itineraryItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('That item does not exist.');
  await requireTripMember(userId, item.tripId);
  await db.itineraryItem.delete({ where: { id } });
  return { deleted: true };
}

/* ----------------------------------------------------------------- packing */

export async function addPackingItem(userId: string, input: PackingItemInput) {
  const db = await getDb();
  await requireTripMember(userId, input.tripId);
  return db.packingItem.create({
    data: { tripId: input.tripId, addedById: userId, label: input.label, category: input.category || 'other' },
  });
}

export async function togglePacked(userId: string, id: string, packed: boolean) {
  const db = await getDb();
  const item = await db.packingItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('That item does not exist.');
  await requireTripMember(userId, item.tripId);
  return db.packingItem.update({ where: { id }, data: { packedAt: packed ? new Date() : null } });
}

export async function deletePackingItem(userId: string, id: string) {
  const db = await getDb();
  const item = await db.packingItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('That item does not exist.');
  await requireTripMember(userId, item.tripId);
  await db.packingItem.delete({ where: { id } });
  return { deleted: true };
}

/* ----------------------------------------------------------- shared budget */

export async function addTripExpense(userId: string, input: TripExpenseInput) {
  const db = await getDb();
  const trip = await db.trip.findFirst({ where: { id: input.tripId, deletedAt: null } });
  if (!trip) throw new NotFoundError('That trip does not exist.');
  await requireTripMember(userId, input.tripId);

  const memberIds = (await db.tripMember.findMany({ where: { tripId: input.tripId }, select: { userId: true } })).map((member) => member.userId);

  const expense = await db.expense.create({
    data: {
      ownerId: userId,
      tripId: input.tripId,
      category: input.category ?? 'travel',
      amountCents: input.amountCents,
      currency: trip.currency,
      description: input.description,
      occurredOn: input.occurredOn ? new Date(input.occurredOn) : new Date(),
      isShared: true,
    },
  });

  if (memberIds.length > 0) {
    const shares = splitEvenly(input.amountCents, memberIds.length);
    await db.expenseSplit.createMany({
      data: memberIds.map((memberId, index) => ({ expenseId: expense.id, userId: memberId, shareCents: shares[index] })),
    });
  }

  return expense;
}

export async function settleTripSplit(userId: string, splitId: string, settled: boolean) {
  const db = await getDb();
  const split = await db.expenseSplit.findUnique({ where: { id: splitId } });
  if (!split) throw new NotFoundError('That split does not exist.');
  if (split.userId !== userId) throw new ForbiddenError('You can only settle your own share.');
  return db.expenseSplit.update({ where: { id: splitId }, data: { settledAt: settled ? new Date() : null } });
}

/** Who owes whom, in the simplest "everyone pays the average" form. */
export function tripBalances(
  expenses: { id: string; ownerId: string; amountCents: number; splits: { userId: string; shareCents: number | null; settledAt: Date | null }[] }[],
  memberIds: string[],
) {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const expense of expenses) {
    paid.set(expense.ownerId, (paid.get(expense.ownerId) ?? 0) + expense.amountCents);
    for (const split of expense.splits) {
      if (split.settledAt) continue;
      owed.set(split.userId, (owed.get(split.userId) ?? 0) + (split.shareCents ?? 0));
    }
  }

  return memberIds
    .map((memberId) => {
      const paidCents = paid.get(memberId) ?? 0;
      const owedCents = owed.get(memberId) ?? 0;
      return { userId: memberId, paidCents, owedCents, balanceCents: paidCents - owedCents };
    })
    .sort((a, b) => b.balanceCents - a.balanceCents);
}

export async function requireTripMember(userId: string, tripId: string) {
  const db = await getDb();
  const member = await db.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
  if (!member) throw new ForbiddenError('Only people on this trip can do that.');
  return member;
}

/* ------------------------------------------------------------------- polls */

export async function createTripPoll(userId: string, tripId: string, question: string, options: string[], closesAt?: string) {
  const db = await getDb();
  await requireTripMember(userId, tripId);
  const labels = options.map((option) => option.trim()).filter(Boolean).slice(0, 8);
  if (labels.length < 2) throw new ForbiddenError('A poll needs at least two options.');

  return db.poll.create({
    data: {
      tripId,
      authorId: userId,
      question,
      multi: false,
      closesAt: closesAt ? new Date(closesAt) : null,
      options: { create: labels.map((label, index) => ({ label, position: index })) },
    },
    include: { options: true },
  });
}

export async function voteTripPoll(userId: string, tripId: string, pollId: string, optionIds: string[]) {
  const db = await getDb();
  await requireTripMember(userId, tripId);
  const poll = await db.poll.findFirst({ where: { id: pollId, tripId }, include: { options: true } });
  if (!poll) throw new NotFoundError('That poll does not exist.');
  if (poll.closesAt && poll.closesAt < new Date()) throw new ForbiddenError('This poll has closed.');

  const valid = poll.options.filter((option) => optionIds.includes(option.id));
  if (valid.length !== 1) throw new ForbiddenError('Pick exactly one option.');

  const existing = await db.pollVote.findMany({ where: { userId, option: { pollId } } });
  for (const vote of existing) await db.pollVote.delete({ where: { id: vote.id } });
  await db.pollVote.create({ data: { optionId: valid[0].id, userId } });

  return { voted: true };
}
