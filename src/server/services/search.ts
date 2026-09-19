import { getDb } from '@/server/db/client';
import { contains, searchTerms } from '@/lib/db-config';
import type { SessionUser } from '@/server/core/session';
import { isStaffRole } from '@/server/core/permissions';

/**
 * Unified, privacy-aware search.
 *
 * Rules enforced here (never in the UI):
 *  - private content is only returned to its owner (or to group/trip members)
 *  - profiles that opted out of search are never indexed into results
 *  - blocked users never see each other
 *  - staff additionally see pending/unverified items so they can moderate
 */

export const SEARCH_TYPES = [
  'users',
  'groups',
  'help',
  'events',
  'resources',
  'skills',
  'student',
  'volunteer',
  'business',
  'personal',
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export type SearchHit = {
  type: SearchType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  updatedAt: Date;
};

export type SearchOptions = {
  q: string;
  types?: SearchType[];
  city?: string;
  take?: number;
};

export type SearchResults = {
  query: string;
  total: number;
  hits: SearchHit[];
  byType: Record<string, number>;
};

const EMPTY: Record<string, number> = {};

export async function unifiedSearch(
  user: SessionUser | null,
  options: SearchOptions,
): Promise<SearchResults> {
  const query = options.q.trim();
  if (query.length < 2) {
    return { query, total: 0, hits: [], byType: EMPTY };
  }

  const take = Math.min(options.take ?? 6, 12);
  const types = options.types?.length ? options.types : [...SEARCH_TYPES];
  const wants = (type: SearchType) => types.includes(type);
  const db = await getDb();
  const staff = user ? isStaffRole(user.role) : false;

  const blockedIds = user
    ? (
        await db.userBlock.findMany({
          where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
          select: { blockerId: true, blockedId: true },
        })
      )
        .flatMap((row) => [row.blockerId, row.blockedId])
        .filter((id) => id !== user.id)
    : [];

  const excludeUsers = { notIn: blockedIds.length ? blockedIds : undefined };
  const term = searchTerms(query)[0] ?? query;
  const like = contains(term);
  const cityFilter = options.city ? { city: options.city } : {};

  const hits: SearchHit[] = [];
  const byType: Record<string, number> = {};
  const add = (list: SearchHit[]) => {
    hits.push(...list);
  };
  const count = (type: SearchType, n: number) => {
    if (n > 0) byType[type] = n;
  };

  if (wants('users')) {
    const users = await db.user.findMany({
      where: {
        isActive: true,
        isSuspended: false,
        deletedAt: null,
        id: excludeUsers,
        profile: {
          searchable: true,
          profileVisibility: { not: 'private' },
          OR: [{ displayName: like }, { bio: like }, { city: like }],
          ...cityFilter,
        },
        OR: [{ username: like }, { email: user?.role === 'admin' ? like : undefined }].filter(
          Boolean,
        ) as never,
      },
      include: { profile: true },
      take,
    });
    const list = users.map<SearchHit>((u) => ({
      type: 'users',
      id: u.id,
      title: u.profile?.displayName ?? u.username,
      subtitle: [u.profile?.city, u.profile?.country].filter(Boolean).join(', ') || `@${u.username}`,
      href: `/members/${u.username}`,
      badge: u.profile?.verificationStatus === 'verified' ? 'Verified' : undefined,
      updatedAt: u.createdAt,
    }));
    add(list);
    count('users', list.length);
  }

  if (wants('groups')) {
    const groups = await db.group.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        name: like,
        OR: [
          { visibility: 'public' },
          ...(user ? [{ members: { some: { userId: user.id } } }] : []),
        ],
      },
      take,
      include: { _count: { select: { members: true } } },
    });
    const list = groups.map<SearchHit>((g) => ({
      type: 'groups',
      id: g.id,
      title: g.name,
      subtitle: `${g._count.members} member${g._count.members === 1 ? '' : 's'} · ${g.visibility}`,
      href: `/groups/${g.slug}`,
      badge: g.visibility === 'public' ? 'Public' : undefined,
      updatedAt: g.createdAt,
    }));
    add(list);
    count('groups', list.length);
  }

  if (wants('help')) {
    const requests = await db.helpRequest.findMany({
      where: {
        deletedAt: null,
        hiddenAt: staff ? undefined : null,
        title: like,
        OR: [
          { visibility: 'public' },
          ...(user ? [{ authorId: user.id }] : []),
        ],
        ...cityFilter,
      },
      take,
      orderBy: { createdAt: 'desc' },
      include: { author: { include: { profile: true } } },
    });
    const list = requests.map<SearchHit>((r) => ({
      type: 'help',
      id: r.id,
      title: r.title,
      subtitle: `${r.category.replace(/_/g, ' ')} · ${r.status.replace(/_/g, ' ')}`,
      href: `/help/${r.id}`,
      badge: r.urgency === 'urgent' ? 'Urgent' : undefined,
      updatedAt: r.updatedAt,
    }));
    add(list);
    count('help', list.length);
  }

  if (wants('events')) {
    const events = await db.calendarEvent.findMany({
      where: {
        title: like,
        OR: [
          ...(user ? [{ ownerId: user.id }, { trip: { members: { some: { userId: user.id } } } }] : []),
          { trip: { visibility: 'public' } },
        ],
      },
      take,
      orderBy: { startsAt: 'asc' },
    });
    const list = events.map<SearchHit>((e) => ({
      type: 'events',
      id: e.id,
      title: e.title,
      subtitle: e.location ?? undefined,
      href: e.tripId ? `/trips/${e.tripId}` : '/calendar',
      updatedAt: e.startsAt,
    }));
    add(list);
    count('events', list.length);
  }

  if (wants('resources')) {
    const resources = await db.localResource.findMany({
      where: {
        deletedAt: null,
        hiddenAt: null,
        name: like,
        OR: staff ? undefined : [{ status: 'active' }, ...(user ? [{ submittedById: user.id }] : [])],
        ...cityFilter,
      },
      take,
    });
    const list = resources.map<SearchHit>((r) => ({
      type: 'resources',
      id: r.id,
      title: r.name,
      subtitle: [r.category.replace(/_/g, ' '), r.city].filter(Boolean).join(' · '),
      href: `/resources/${r.id}`,
      badge: r.verified ? 'Verified' : r.status === 'pending' ? 'Pending review' : undefined,
      updatedAt: r.updatedAt,
    }));
    add(list);
    count('resources', list.length);
  }

  if (wants('skills')) {
    const offers = await db.skillOffer.findMany({
      where: { isActive: true, skill: { name: like }, ...cityFilter },
      take,
      include: { skill: true, user: { include: { profile: true } } },
    });
    const list = offers.map<SearchHit>((o) => ({
      type: 'skills',
      id: o.id,
      title: `${o.skill.name} with ${o.user.profile?.displayName ?? o.user.username}`,
      subtitle: [o.level, o.format, o.city].filter(Boolean).join(' · '),
      href: `/skills?skill=${encodeURIComponent(o.skill.name)}`,
      updatedAt: o.updatedAt,
    }));
    add(list);
    count('skills', list.length);
  }

  if (wants('student')) {
    const resources = await db.studentResource.findMany({
      where: { deletedAt: null, hiddenAt: staff ? undefined : null, title: like },
      take,
      include: { subject: true },
    });
    const list = resources.map<SearchHit>((r) => ({
      type: 'student',
      id: r.id,
      title: r.title,
      subtitle: [r.subject?.name, r.level, r.language].filter(Boolean).join(' · '),
      href: `/students/resources/${r.id}`,
      updatedAt: r.updatedAt,
    }));
    add(list);
    count('student', list.length);
  }

  if (wants('volunteer')) {
    const [opportunities, campaigns] = await Promise.all([
      db.volunteerOpportunity.findMany({
        where: { deletedAt: null, hiddenAt: null, status: { in: ['open', 'in_progress'] }, title: like, ...cityFilter },
        take,
      }),
      db.donationCampaign.findMany({
        where: { deletedAt: null, hiddenAt: null, status: { in: ['open', 'in_progress'] }, title: like, ...cityFilter },
        take,
      }),
    ]);
    const list: SearchHit[] = [
      ...opportunities.map<SearchHit>((o) => ({
        type: 'volunteer',
        id: o.id,
        title: o.title,
        subtitle: `${o.cause} · ${o.city ?? ''}`.trim(),
        href: `/volunteer/${o.id}`,
        badge: o.verified ? 'Verified' : undefined,
        updatedAt: o.updatedAt,
      })),
      ...campaigns.map<SearchHit>((c) => ({
        type: 'volunteer',
        id: c.id,
        title: c.title,
        subtitle: `${c.kind} drive · ${c.city ?? ''}`.trim(),
        href: `/volunteer/campaigns/${c.id}`,
        badge: c.verified ? 'Verified' : undefined,
        updatedAt: c.updatedAt,
      })),
    ];
    add(list);
    count('volunteer', list.length);
  }

  if (wants('business')) {
    const businesses = await db.businessProfile.findMany({
      where: { published: true, name: like, ...cityFilter },
      take,
    });
    const list = businesses.map<SearchHit>((b) => ({
      type: 'business',
      id: b.id,
      title: b.name,
      subtitle: [b.city, b.country].filter(Boolean).join(', '),
      href: `/business/${b.slug}`,
      updatedAt: b.updatedAt,
    }));
    add(list);
    count('business', list.length);
  }

  if (wants('personal') && user) {
    const [notes, tasks, bookmarks] = await Promise.all([
      db.note.findMany({ where: { ownerId: user.id, deletedAt: null, title: like }, take }),
      db.task.findMany({ where: { ownerId: user.id, deletedAt: null, title: like }, take }),
      db.bookmark.findMany({ where: { ownerId: user.id, title: like }, take }),
    ]);
    const list: SearchHit[] = [
      ...notes.map<SearchHit>((n) => ({
        type: 'personal',
        id: n.id,
        title: n.title,
        subtitle: 'Note',
        href: `/notes/${n.id}`,
        updatedAt: n.updatedAt,
      })),
      ...tasks.map<SearchHit>((t) => ({
        type: 'personal',
        id: t.id,
        title: t.title,
        subtitle: 'Task',
        href: '/tasks',
        updatedAt: t.updatedAt,
      })),
      ...bookmarks.map<SearchHit>((b) => ({
        type: 'personal',
        id: b.id,
        title: b.title,
        subtitle: b.url,
        href: '/bookmarks',
        updatedAt: b.updatedAt,
      })),
    ];
    add(list);
    count('personal', list.length);
  }

  const sorted = hits.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return { query, total: sorted.length, hits: sorted.slice(0, take * 4), byType };
}
