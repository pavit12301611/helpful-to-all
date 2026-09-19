import { getDb } from '@/server/db/client';
import { NotFoundError } from '@/lib/errors';
import { blockedUserIds } from '@/features/social/service';

/**
 * Public member directory and profiles.
 *
 * Privacy first: a profile that is not `public` never appears in the directory,
 * `searchable = false` removes it from search, and location/activity details are
 * only rendered when the member switched them on. Contact details are never
 * exposed — messaging goes through OpenHub.
 */

const PAGE_SIZE = 24;

export type MemberDirectoryFilters = {
  q?: string;
  city?: string;
  userType?: string;
  page?: number;
};

export async function listMemberDirectory(viewerId: string, filters: MemberDirectoryFilters = {}) {
  const db = await getDb();
  const q = filters.q?.trim();
  const city = filters.city?.trim();
  const page = Math.max(1, filters.page ?? 1);
  const blocked = await blockedUserIds(viewerId);

  const where = {
    deletedAt: null,
    isSuspended: false,
    id: { notIn: [viewerId, ...blocked] },
    profile: {
      profileVisibility: 'public',
      searchable: true,
      ...(city ? { city: { contains: city } } : {}),
      ...(filters.userType && filters.userType !== 'all' ? { userTypes: { contains: filters.userType } } : {}),
    },
    ...(q
      ? {
          OR: [
            { username: { contains: q } },
            { profile: { displayName: { contains: q } } },
            { profile: { bio: { contains: q } } },
          ],
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            city: true,
            country: true,
            showLocation: true,
            userTypes: true,
            helpfulnessScore: true,
            verificationStatus: true,
            allowMessages: true,
          },
        },
      },
      orderBy: [{ profile: { helpfulnessScore: 'desc' } }, { username: 'asc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  return { members, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPublicProfile(viewerId: string | null, username: string) {
  const db = await getDb();
  const user = await db.user.findFirst({
    where: { username: { equals: username }, deletedAt: null },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      isSuspended: true,
      profile: true,
    },
  });
  if (!user) throw new NotFoundError('That member does not exist.');

  const profile = user.profile;
  const isSelf = viewerId === user.id;
  const visible = isSelf || profile?.profileVisibility === 'public';
  if (!visible) throw new NotFoundError('This profile is private.');

  const blocked = viewerId ? await blockedUserIds(viewerId) : [];
  const showLocation = profile?.showLocation ?? false;
  const showActivity = profile?.showActivity ?? true;

  const [helpCount, answerCount, resourceCount, skillOffers, groups, recentHelp] = await Promise.all([
    db.helpRequest.count({ where: { authorId: user.id, hiddenAt: null } }),
    db.helpResponse.count({ where: { authorId: user.id, hiddenAt: null } }),
    db.studentResource.count({ where: { uploaderId: user.id, hiddenAt: null, deletedAt: null } }),
    db.skillOffer.findMany({
      where: { userId: user.id, isActive: true },
      include: { skill: { select: { name: true, slug: true } } },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    profile?.showGroupMembership
      ? db.groupMember.findMany({
          where: { userId: user.id, group: { visibility: 'public', deletedAt: null } },
          include: { group: { select: { name: true, slug: true, kind: true } } },
          take: 6,
        })
      : Promise.resolve([]),
    showActivity
      ? db.helpRequest.findMany({
          where: { authorId: user.id, hiddenAt: null },
          select: { id: true, title: true, category: true, urgency: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    joinedAt: user.createdAt,
    isSelf,
    isBlocked: viewerId ? blocked.includes(user.id) : false,
    allowMessages: profile?.allowMessages ?? 'everyone',
    displayName: profile?.displayName ?? user.username,
    avatarUrl: profile?.avatarUrl ?? null,
    bio: profile?.bio ?? null,
    city: showLocation ? (profile?.city ?? null) : null,
    country: showLocation ? (profile?.country ?? null) : null,
    userTypes: profile?.userTypes ?? '',
    helpfulnessScore: profile?.helpfulnessScore ?? 0,
    verificationStatus: profile?.verificationStatus ?? 'none',
    website: profile?.website ?? null,
    availability: profile?.availability ?? null,
    stats: { helpCount, answerCount, resourceCount },
    skillOffers,
    groups,
    recentHelp,
  };
}

export type PublicProfile = Awaited<ReturnType<typeof getPublicProfile>>;
