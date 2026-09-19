import { getDb } from '@/server/db/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { generateToken, hashToken } from '@/lib/security';
import { slugify } from '@/lib/utils';
import { notify, notifyMany } from '@/server/services/notifications';
import { logActivity } from '@/server/core/audit';
import { appUrl } from '@/lib/env';
import { GROUP_PAGE_SIZE, type GroupFilters, type GroupInput, type GroupPostInput, type InviteInput, type PollInput } from './schemas';

/**
 * Groups: friends, family, class, club, neighbourhood, organisation, team, trip.
 *
 * Roles: owner > admin > moderator > member. Every privileged operation checks
 * the membership row in the database, never a client supplied value.
 */

const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

export async function getMembership(userId: string, groupId: string) {
  const db = await getDb();
  return db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

export async function requireMembership(userId: string, groupId: string) {
  const membership = await getMembership(userId, groupId);
  if (!membership) throw new ForbiddenError('You are not a member of this group.');
  return membership;
}

export async function requireGroupRole(userId: string, groupId: string, minimum: 'moderator' | 'admin' | 'owner') {
  const membership = await requireMembership(userId, groupId);
  if ((ROLE_RANK[membership.role] ?? 0) < ROLE_RANK[minimum]) {
    throw new ForbiddenError(`That action needs ${minimum} rights in this group.`);
  }
  return membership;
}

export async function listGroups(userId: string, filters: GroupFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.q) where.name = contains(filters.q);
  if (filters.kind) where.kind = filters.kind;

  if (filters.tab === 'mine') {
    where.members = { some: { userId } };
  } else if (filters.tab === 'public' || filters.tab === 'discover') {
    where.visibility = 'public';
    if (filters.tab === 'discover') where.members = { none: { userId } };
  }

  const [groups, total] = await Promise.all([
    db.group.findMany({
      where,
      include: {
        _count: { select: { members: true, posts: true } },
        members: filters.tab === 'mine' ? { where: { userId }, select: { role: true } } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: GROUP_PAGE_SIZE,
      skip: (filters.page - 1) * GROUP_PAGE_SIZE,
    }),
    db.group.count({ where }),
  ]);

  return { groups, total };
}

export async function getGroupBySlug(userId: string | null, slug: string) {
  const db = await getDb();
  const group = await db.group.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true } },
      members: { include: { user: { include: { profile: true } } }, orderBy: { joinedAt: 'asc' } },
      owner: { include: { profile: true } },
    },
  });
  if (!group || group.deletedAt) throw new NotFoundError('That group does not exist.');

  const membership = userId ? group.members.find((member) => member.userId === userId) ?? null : null;
  const isMember = Boolean(membership);

  if (group.visibility !== 'public' && !isMember) {
    throw new ForbiddenError('This group is private. Ask a member for an invite link.');
  }

  return { group, membership, isMember };
}

export async function createGroup(userId: string, input: GroupInput) {
  const db = await getDb();
  const baseSlug = slugify(input.name) || 'group';
  const existing = await db.group.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;

  const group = await db.group.create({
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      kind: input.kind ?? 'friends',
      visibility: input.visibility ?? 'private',
      ownerId: userId,
      members: { create: { userId, role: 'owner' } },
    },
  });

  await logActivity({ userId, type: 'group', description: `Created group “${input.name}”`, targetType: 'group', targetId: group.id });
  return group;
}

export async function updateGroup(userId: string, groupId: string, input: GroupInput) {
  await requireGroupRole(userId, groupId, 'admin');
  const db = await getDb();
  return db.group.update({
    where: { id: groupId },
    data: {
      name: input.name,
      description: input.description || null,
      kind: input.kind ?? 'friends',
      visibility: input.visibility ?? 'private',
    },
  });
}

export async function deleteGroup(userId: string, groupId: string) {
  await requireGroupRole(userId, groupId, 'owner');
  const db = await getDb();
  await db.group.update({ where: { id: groupId }, data: { deletedAt: new Date(), archivedAt: new Date() } });
  await logActivity({ userId, type: 'group', description: 'Deleted a group' });
}

/* ------------------------------------------------------------- membership */

export async function joinPublicGroup(userId: string, groupId: string) {
  const db = await getDb();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group || group.deletedAt) throw new NotFoundError('Group not found.');
  if (group.visibility === 'private') throw new ForbiddenError('This group is invite only.');

  const existing = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (existing) throw new ConflictError('You are already a member.');

  await db.groupMember.create({ data: { groupId, userId, role: 'member' } });
  await logActivity({ userId, type: 'group', description: `Joined group “${group.name}”`, targetType: 'group', targetId: groupId });
  return { joined: true };
}

export async function requestToJoin(userId: string, groupId: string, message?: string) {
  const db = await getDb();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group not found.');

  const existing = await db.groupJoinRequest.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (existing && existing.status === 'pending') throw new ConflictError('Your request is already pending.');

  await db.groupJoinRequest.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId, message: message || null },
    update: { status: 'pending', message: message || null },
  });

  const admins = await db.groupMember.findMany({
    where: { groupId, role: { in: ['owner', 'admin'] } },
    select: { userId: true },
  });
  await notifyMany(
    admins.map((admin) => admin.userId),
    {
      type: 'join_request',
      title: `New join request for ${group.name}`,
      body: message?.slice(0, 140),
      targetType: 'group',
      targetId: groupId,
      link: `/groups/${group.slug}?tab=members`,
      actorId: userId,
    },
  );

  return { requested: true };
}

export async function reviewJoinRequest(actorId: string, requestId: string, approve: boolean) {
  const db = await getDb();
  const request = await db.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError('Request not found.');
  await requireGroupRole(actorId, request.groupId, 'moderator');

  await db.groupJoinRequest.update({
    where: { id: requestId },
    data: { status: approve ? 'approved' : 'rejected', reviewedById: actorId },
  });

  if (approve) {
    await db.groupMember.upsert({
      where: { groupId_userId: { groupId: request.groupId, userId: request.userId } },
      create: { groupId: request.groupId, userId: request.userId, role: 'member' },
      update: {},
    });
  }

  await notify({
    userId: request.userId,
    type: 'join_request',
    title: approve ? 'Your join request was approved' : 'Your join request was declined',
    targetType: 'group',
    targetId: request.groupId,
    link: `/groups`,
    actorId,
  });

  return { approved: approve };
}

export async function leaveGroup(userId: string, groupId: string) {
  const db = await getDb();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group not found.');
  if (group.ownerId === userId) {
    throw new ForbiddenError('Owners cannot leave their own group. Transfer ownership or delete the group instead.');
  }
  await db.groupMember.deleteMany({ where: { groupId, userId } });
  return { left: true };
}

export async function setMemberRole(actorId: string, groupId: string, targetUserId: string, role: string) {
  const actor = await requireGroupRole(actorId, groupId, 'admin');
  const db = await getDb();
  const target = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
  if (!target) throw new NotFoundError('That person is not a member.');
  if (target.role === 'owner') throw new ForbiddenError('The owner role cannot be changed here.');
  if (role === 'owner') throw new ForbiddenError('Use ownership transfer instead.');
  if ((ROLE_RANK[role] ?? 0) >= ROLE_RANK[actor.role]) {
    throw new ForbiddenError('You can only assign roles below your own.');
  }

  await db.groupMember.update({ where: { id: target.id }, data: { role } });
  await notify({
    userId: targetUserId,
    type: 'system',
    title: 'Your group role changed',
    body: `You are now a ${role} in this group.`,
    targetType: 'group',
    targetId: groupId,
    actorId,
  });
  return { role };
}

export async function removeMember(actorId: string, groupId: string, targetUserId: string) {
  const actor = await requireGroupRole(actorId, groupId, 'moderator');
  const db = await getDb();
  const target = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
  if (!target) throw new NotFoundError('That person is not a member.');
  if ((ROLE_RANK[target.role] ?? 0) >= ROLE_RANK[actor.role]) {
    throw new ForbiddenError('You cannot remove someone with the same or higher role.');
  }
  await db.groupMember.delete({ where: { id: target.id } });
  return { removed: true };
}

/* -------------------------------------------------------------- invitations */

export async function createInvite(actorId: string, input: InviteInput) {
  await requireGroupRole(actorId, input.groupId, 'moderator');
  const db = await getDb();
  const token = generateToken(16);

  await db.groupInvitation.create({
    data: {
      groupId: input.groupId,
      email: input.email || null,
      token: hashToken(token),
      role: input.role === 'owner' ? 'member' : input.role,
      invitedById: actorId,
      message: input.message || null,
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
    },
    include: { group: { select: { name: true, slug: true } } },
  });

  return { url: `${appUrl()}/groups/join/${token}` };
}

export async function acceptInvite(userId: string, token: string) {
  const db = await getDb();
  const invite = await db.groupInvitation.findUnique({ where: { token: hashToken(token) }, include: { group: true } });
  if (!invite || invite.revokedAt) throw new NotFoundError('That invite link is not valid.');
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new ForbiddenError('That invite link has expired.');

  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: invite.groupId, userId } },
    create: { groupId: invite.groupId, userId, role: invite.role },
    update: {},
  });
  await db.groupInvitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

  await notify({
    userId: invite.invitedById,
    type: 'group_invite',
    title: 'Your invite was accepted',
    body: invite.group.name,
    targetType: 'group',
    targetId: invite.groupId,
    actorId: userId,
  });

  return { slug: invite.group.slug, name: invite.group.name };
}

/* ------------------------------------------------------------------- posts */

export async function listPosts(userId: string, groupId: string) {
  await requireMembership(userId, groupId);
  const db = await getDb();
  return db.groupPost.findMany({
    where: { groupId, deletedAt: null, hiddenAt: null },
    include: { author: { include: { profile: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 40,
  });
}

export async function createPost(userId: string, input: GroupPostInput) {
  await requireMembership(userId, input.groupId);
  const db = await getDb();

  if (input.kind === 'announcement') {
    await requireGroupRole(userId, input.groupId, 'moderator');
  }

  const post = await db.groupPost.create({
    data: {
      groupId: input.groupId,
      authorId: userId,
      title: input.title,
      body: input.body ?? '',
      kind: input.kind ?? 'post',
    },
    include: { group: { select: { name: true, slug: true } } },
  });

  if (post.kind === 'announcement') {
    const members = await db.groupMember.findMany({ where: { groupId: input.groupId }, select: { userId: true } });
    await notifyMany(
      members.map((member) => member.userId),
      {
        type: 'system',
        title: `Announcement in ${post.group.name}`,
        body: post.title,
        targetType: 'group',
        targetId: input.groupId,
        link: `/groups/${post.group.slug}`,
        actorId: userId,
      },
    );
  }

  return post;
}

export async function deletePost(userId: string, postId: string) {
  const db = await getDb();
  const post = await db.groupPost.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundError('Post not found.');
  if (post.authorId !== userId) await requireGroupRole(userId, post.groupId, 'moderator');
  await db.groupPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}

export async function setPostPinned(userId: string, postId: string, pinned: boolean) {
  const db = await getDb();
  const post = await db.groupPost.findUnique({ where: { id: postId } });
  if (!post) throw new NotFoundError('Post not found.');
  await requireGroupRole(userId, post.groupId, 'moderator');
  await db.groupPost.update({ where: { id: postId }, data: { pinned } });
}

/* ------------------------------------------------------------------- polls */

export async function createPoll(userId: string, input: PollInput) {
  await requireMembership(userId, input.groupId);
  const db = await getDb();
  return db.poll.create({
    data: {
      groupId: input.groupId,
      authorId: userId,
      question: input.question,
      multi: Boolean(input.multi),
      closesAt: input.closesAt ? new Date(input.closesAt) : null,
      options: { create: input.options.map((label, index) => ({ label, position: index })) },
    },
    include: { options: true },
  });
}

export async function votePoll(userId: string, pollId: string, optionIds: string[]) {
  const db = await getDb();
  const poll = await db.poll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll) throw new NotFoundError('Poll not found.');
  if (poll.closesAt && poll.closesAt < new Date()) throw new ForbiddenError('This poll has closed.');
  if (poll.groupId) await requireMembership(userId, poll.groupId);

  const validOptions = poll.options.filter((option) => optionIds.includes(option.id));
  if (validOptions.length === 0) throw new ForbiddenError('Choose at least one option.');
  if (!poll.multi && validOptions.length > 1) throw new ForbiddenError('This poll allows a single choice.');

  await db.$transaction(async (transaction) => {
    const existing = await transaction.pollVote.findMany({
      where: { userId, option: { pollId } },
    });
    for (const vote of existing) await transaction.pollVote.delete({ where: { id: vote.id } });
    for (const option of validOptions) {
      await transaction.pollVote.create({ data: { optionId: option.id, userId } });
    }
  });

  return { voted: validOptions.length };
}

export async function listPolls(userId: string, groupId: string) {
  await requireMembership(userId, groupId);
  const db = await getDb();
  return db.poll.findMany({
    where: { groupId },
    include: { options: { include: { votes: true }, orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
}

/* -------------------------------------------------------- shopping + tasks */

export async function listShopping(userId: string, groupId: string) {
  await requireMembership(userId, groupId);
  const db = await getDb();
  return db.shoppingItem.findMany({ where: { groupId }, orderBy: [{ purchasedAt: 'asc' }, { createdAt: 'desc' }], take: 60 });
}

export async function addShoppingItem(userId: string, groupId: string, label: string, quantity?: string) {
  await requireMembership(userId, groupId);
  const db = await getDb();
  return db.shoppingItem.create({ data: { groupId, label, quantity: quantity || null, addedById: userId } });
}

export async function toggleShoppingItem(userId: string, itemId: string, purchased: boolean) {
  const db = await getDb();
  const item = await db.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError('Item not found.');
  await requireMembership(userId, item.groupId);
  return db.shoppingItem.update({ where: { id: itemId }, data: { purchasedAt: purchased ? new Date() : null } });
}

export async function removeShoppingItem(userId: string, itemId: string) {
  const db = await getDb();
  const item = await db.shoppingItem.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError('Item not found.');
  await requireMembership(userId, item.groupId);
  await db.shoppingItem.delete({ where: { id: itemId } });
}
