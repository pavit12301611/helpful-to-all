import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { notifyMany } from '@/server/services/notifications';
import type { CalendarEventInput, CalendarView } from './schemas';

/**
 * Personal, group and trip calendar.
 *
 * A member sees their own events, events of groups they belong to, and events of
 * trips they are part of - and nothing else.
 */

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function viewRange(view: CalendarView['view'], anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  const end = new Date(anchor);

  if (view === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === 'week') {
    const offset = (start.getDay() + 6) % 7; // Monday first
    start.setDate(start.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  end.setTime(start.getTime());
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function listEvents(userId: string, view: CalendarView) {
  const db = await getDb();
  const anchor = view.date ? new Date(view.date) : new Date();
  const { start, end } = viewRange(view.view, anchor);

  const events = await db.calendarEvent.findMany({
    where: {
      startsAt: { gte: start, lte: end },
      OR: [
        { ownerId: userId },
        { group: { members: { some: { userId } } } },
        { trip: { members: { some: { userId } } } },
      ],
    },
    include: {
      group: { select: { name: true, slug: true } },
      trip: { select: { id: true, title: true } },
    },
    orderBy: { startsAt: 'asc' },
  });

  return { events, start, end, anchor };
}

export async function upcomingEvents(userId: string, take = 5) {
  const db = await getDb();
  return db.calendarEvent.findMany({
    where: {
      startsAt: { gte: new Date() },
      OR: [{ ownerId: userId }, { group: { members: { some: { userId } } } }, { trip: { members: { some: { userId } } } }],
    },
    include: { group: { select: { name: true, slug: true } }, trip: { select: { id: true, title: true } } },
    orderBy: { startsAt: 'asc' },
    take,
  });
}

export async function createEvent(userId: string, input: CalendarEventInput) {
  const db = await getDb();
  const startsAt = parseDate(input.startsAt);
  if (!startsAt) throw new NotFoundError('Please provide a valid start time.');

  if (input.groupId) {
    const member = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: input.groupId, userId } } });
    if (!member) throw new ForbiddenError('You can only add events to groups you belong to.');
  }

  const event = await db.calendarEvent.create({
    data: {
      ownerId: userId,
      groupId: input.groupId || null,
      tripId: input.tripId || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      startsAt,
      endsAt: parseDate(input.endsAt),
      allDay: Boolean(input.allDay),
      reminderMinutes: input.reminderMinutes ?? null,
      recurrence: input.recurrence ?? 'none',
    },
  });

  if (event.groupId) {
    const members = await db.groupMember.findMany({ where: { groupId: event.groupId }, select: { userId: true } });
    await notifyMany(
      members.map((member) => member.userId),
      {
        type: 'event_reminder',
        title: `New event: ${event.title}`,
        body: `${startsAt.toDateString()}${event.location ? ` · ${event.location}` : ''}`,
        targetType: 'group',
        targetId: event.groupId,
        link: '/calendar',
        actorId: userId,
      },
    );
  }

  return event;
}

async function assertCanEdit(userId: string, eventId: string) {
  const db = await getDb();
  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError('Event not found.');
  if (event.ownerId !== userId) throw new ForbiddenError('Only the organiser can change this event.');
  return event;
}

export async function updateEvent(userId: string, eventId: string, input: CalendarEventInput) {
  await assertCanEdit(userId, eventId);
  const db = await getDb();
  return db.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      startsAt: parseDate(input.startsAt) ?? undefined,
      endsAt: parseDate(input.endsAt),
      allDay: Boolean(input.allDay),
      reminderMinutes: input.reminderMinutes ?? null,
      recurrence: input.recurrence ?? 'none',
    },
  });
}

export async function deleteEvent(userId: string, eventId: string) {
  await assertCanEdit(userId, eventId);
  const db = await getDb();
  await db.calendarEvent.delete({ where: { id: eventId } });
}
