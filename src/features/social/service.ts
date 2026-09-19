import { getDb } from '@/server/db/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { notify } from '@/server/services/notifications';
import { logActivity } from '@/server/core/audit';
import { enforceRateLimit } from '@/lib/rate-limit';
import type { CommentInput, ReportInput } from './schemas';

/**
 * Comments, votes, saving and reporting.
 *
 * These are polymorphic (targetType + targetId) so every module - help requests,
 * resources, campaigns, student material - gets the same behaviour, the same
 * moderation hooks and the same privacy rules.
 */

/** Where to send a member after acting on a target, and who owns it. */
const TARGET_CONFIG: Record<string, { ownerField?: string; model: string; authorNotifyType: 'comment' | 'answer' }> = {
  help_request: { model: 'helpRequest', ownerField: 'authorId', authorNotifyType: 'comment' },
  help_response: { model: 'helpResponse', ownerField: 'authorId', authorNotifyType: 'comment' },
  group_post: { model: 'groupPost', ownerField: 'authorId', authorNotifyType: 'comment' },
  resource: { model: 'localResource', ownerField: 'submittedById', authorNotifyType: 'comment' },
  opportunity: { model: 'volunteerOpportunity', ownerField: 'organizerId', authorNotifyType: 'comment' },
  campaign: { model: 'donationCampaign', ownerField: 'organizerId', authorNotifyType: 'comment' },
  student_resource: { model: 'studentResource', ownerField: 'uploaderId', authorNotifyType: 'comment' },
  trip: { model: 'trip', ownerField: 'ownerId', authorNotifyType: 'comment' },
};

async function targetOwner(targetType: string, targetId: string): Promise<string | null> {
  const config = TARGET_CONFIG[targetType];
  if (!config?.ownerField) return null;
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await (db as any)[config.model].findUnique({ where: { id: targetId } });
  return row ? (row[config.ownerField] as string) : null;
}

/** Blocking a member also hides their comments from the blocker. */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return Array.from(new Set(rows.flatMap((row) => [row.blockerId, row.blockedId]))).filter((id) => id !== userId);
}

export async function listComments(userId: string | null, targetType: string, targetId: string) {
  const db = await getDb();
  const blocked = userId ? await blockedUserIds(userId) : [];
  return db.comment.findMany({
    where: {
      targetType,
      targetId,
      deletedAt: null,
      hiddenAt: null,
      ...(blocked.length ? { authorId: { notIn: blocked } } : {}),
    },
    include: { author: { include: { profile: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createComment(userId: string, input: CommentInput) {
  await enforceRateLimit('comment', userId);
  const db = await getDb();

  const blocked = await blockedUserIds(userId);
  const owner = await targetOwner(input.targetType, input.targetId);
  if (owner && blocked.includes(owner)) {
    throw new ForbiddenError('You cannot comment on this thread because of a block.');
  }

  const comment = await db.comment.create({
    data: {
      authorId: userId,
      targetType: input.targetType,
      targetId: input.targetId,
      parentId: input.parentId || null,
      body: input.body,
    },
  });

  if (owner && owner !== userId) {
    await notify({
      userId: owner,
      type: 'comment',
      title: 'New comment on your post',
      body: input.body.slice(0, 140),
      targetType: input.targetType,
      targetId: input.targetId,
      link: linkFor(input.targetType, input.targetId),
      actorId: userId,
    });
  }

  await logActivity({
    userId,
    type: 'comment',
    description: 'Commented on a discussion',
    targetType: input.targetType,
    targetId: input.targetId,
  });

  return comment;
}

export async function deleteComment(userId: string, commentId: string, isStaff: boolean) {
  const db = await getDb();
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment not found.');
  if (comment.authorId !== userId && !isStaff) {
    throw new ForbiddenError('You can only delete your own comments.');
  }
  await db.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
}

export function linkFor(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'help_request':
    case 'help_response':
      return `/help/${targetId}`;
    case 'resource':
      return `/resources/${targetId}`;
    case 'opportunity':
      return `/volunteer/${targetId}`;
    case 'campaign':
      return `/volunteer/campaigns/${targetId}`;
    case 'student_resource':
      return `/students/resources/${targetId}`;
    case 'trip':
      return `/trips/${targetId}`;
    case 'group_post':
      return `/groups`;
    default:
      return '/';
  }
}

/* ------------------------------------------------------------------- votes */

export async function toggleVote(userId: string, targetType: string, targetId: string, value: 1 | -1) {
  const db = await getDb();
  const existing = await db.vote.findUnique({
    where: { userId_targetType_targetId: { userId, targetType, targetId } },
  });

  if (existing) {
    if (existing.value === value) {
      await db.vote.delete({ where: { id: existing.id } });
      return { score: await scoreFor(targetType, targetId), userValue: 0 };
    }
    await db.vote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.vote.create({ data: { userId, targetType, targetId, value } });
  }

  const owner = await targetOwner(targetType, targetId);
  if (owner && owner !== userId && value === 1) {
    await db.profile.updateMany({ where: { userId: owner }, data: { helpfulnessScore: { increment: 1 } } });
  }

  return { score: await scoreFor(targetType, targetId), userValue: value };
}

export async function scoreFor(targetType: string, targetId: string): Promise<number> {
  const db = await getDb();
  const result = await db.vote.aggregate({
    where: { targetType, targetId },
    _sum: { value: true },
  });
  return result._sum.value ?? 0;
}

/* ------------------------------------------------------------ saved items */

export async function toggleSaved(userId: string, targetType: string, targetId: string, note?: string) {
  const db = await getDb();
  const existing = await db.savedItem.findUnique({
    where: { userId_targetType_targetId: { userId, targetType, targetId } },
  });
  if (existing) {
    await db.savedItem.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await db.savedItem.create({ data: { userId, targetType, targetId, note: note || null } });
  return { saved: true };
}

export async function savedTargetTypes(userId: string, targetType: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.savedItem.findMany({ where: { userId, targetType }, select: { targetId: true } });
  return new Set(rows.map((row) => row.targetId));
}

export async function listSavedItems(userId: string) {
  const db = await getDb();
  const items = await db.savedItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });

  const enriched = await Promise.all(
    items.map(async (item) => ({
      ...item,
      href: linkFor(item.targetType, item.targetId),
      title: await titleFor(item.targetType, item.targetId),
    })),
  );
  return enriched;
}

async function titleFor(targetType: string, targetId: string): Promise<string> {
  const db = await getDb();
  switch (targetType) {
    case 'help_request': {
      const row = await db.helpRequest.findUnique({ where: { id: targetId }, select: { title: true } });
      return row?.title ?? 'Help request';
    }
    case 'resource': {
      const row = await db.localResource.findUnique({ where: { id: targetId }, select: { name: true } });
      return row?.name ?? 'Local resource';
    }
    case 'opportunity': {
      const row = await db.volunteerOpportunity.findUnique({ where: { id: targetId }, select: { title: true } });
      return row?.title ?? 'Volunteer opportunity';
    }
    case 'campaign': {
      const row = await db.donationCampaign.findUnique({ where: { id: targetId }, select: { title: true } });
      return row?.title ?? 'Donation campaign';
    }
    case 'group': {
      const row = await db.group.findUnique({ where: { id: targetId }, select: { name: true } });
      return row?.name ?? 'Group';
    }
    case 'skill_offer':
      return 'Skill offer';
    case 'student_resource': {
      const row = await db.studentResource.findUnique({ where: { id: targetId }, select: { title: true } });
      return row?.title ?? 'Study resource';
    }
    default:
      return 'Saved item';
  }
}

/* ---------------------------------------------------------------- reports */

export async function createReport(userId: string, input: ReportInput) {
  await enforceRateLimit('report', userId);
  const db = await getDb();

  const duplicate = await db.report.findFirst({
    where: { reporterId: userId, targetType: input.targetType, targetId: input.targetId, status: 'open' },
  });
  if (duplicate) throw new ConflictError('You already reported this. A moderator will review it.');

  const report = await db.report.create({
    data: {
      reporterId: userId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details || null,
    },
  });

  const moderators = await db.user.findMany({
    where: { role: { in: ['moderator', 'admin'] }, isActive: true },
    select: { id: true },
  });
  await Promise.all(
    moderators.map((moderator) =>
      notify({
        userId: moderator.id,
        type: 'moderation',
        title: `New report: ${input.reason}`,
        body: input.details?.slice(0, 140) ?? undefined,
        targetType: input.targetType,
        targetId: input.targetId,
        link: `/admin/reports/${report.id}`,
        actorId: userId,
      }),
    ),
  );

  await logActivity({ userId, type: 'report', description: `Reported ${input.targetType.replace(/_/g, ' ')}` });
  return report;
}

/* ----------------------------------------------------------------- blocks */

export async function blockUser(userId: string, blockedId: string, reason?: string) {
  if (userId === blockedId) throw new ConflictError('You cannot block yourself.');
  const db = await getDb();
  const target = await db.user.findUnique({ where: { id: blockedId } });
  if (!target) throw new NotFoundError('Member not found.');

  await db.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId } },
    create: { blockerId: userId, blockedId, reason: reason || null },
    update: { reason: reason || null },
  });
  await logActivity({ userId, type: 'block', description: 'Blocked a member' });
}

export async function unblockUser(userId: string, blockedId: string) {
  const db = await getDb();
  await db.userBlock.deleteMany({ where: { blockerId: userId, blockedId } });
}

export async function listBlocked(userId: string) {
  const db = await getDb();
  return db.userBlock.findMany({
    where: { blockerId: userId },
    include: { blocked: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
