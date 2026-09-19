import { getDb } from '@/server/db/client';

/**
 * Community events.
 *
 * Events live inside groups. Anything attached to a *public* group is
 * discoverable here; personal events (no group, or a private group) stay on
 * your own calendar and are never listed publicly.
 */

export type CommunityEventFilters = { q?: string; city?: string; take?: number };

export async function listCommunityEvents(filters: CommunityEventFilters = {}) {
  const db = await getDb();
  const q = filters.q?.trim();

  const events = await db.calendarEvent.findMany({
    where: {
      group: { visibility: 'public', deletedAt: null, archivedAt: null },
      startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { location: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      group: { select: { id: true, name: true, slug: true, kind: true } },
      owner: { select: { username: true, profile: { select: { displayName: true } } } },
    },
    orderBy: { startsAt: 'asc' },
    take: Math.min(filters.take ?? 40, 60),
  });

  return events;
}

/** Public groups the signed-in user can host an event in. */
export async function listHostableGroups(userId: string) {
  const db = await getDb();
  return db.group.findMany({
    where: { visibility: 'public', deletedAt: null, archivedAt: null, members: { some: { userId } } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
    take: 30,
  });
}
