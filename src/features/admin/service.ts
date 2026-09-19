import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { audit } from '@/server/core/audit';
import { notify } from '@/server/services/notifications';
import { isStaffRole } from '@/server/core/permissions';
import { linkFor } from '@/features/social/service';
import type { SessionUser } from '@/server/core/session';

/**
 * Admin and moderation.
 *
 * Reads for the moderation console. Every write goes through
 * `src/server/services/moderation.ts`, which records a ModerationAction *and* an
 * AuditLog entry — so nothing in the moderation console is silent.
 */

const PAGE_SIZE = 20;

export async function moderationStats() {
  const db = await getDb();
  const [
    openReports,
    actionedReports,
    members,
    suspended,
    staff,
    unverifiedResources,
    unverifiedOpportunities,
    unverifiedCampaigns,
    hiddenHelp,
    hiddenComments,
    moderationActions,
  ] = await Promise.all([
    db.report.count({ where: { status: 'open' } }),
    db.report.count({ where: { status: { in: ['reviewed', 'actioned'] } } }),
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { isSuspended: true } }),
    db.user.count({ where: { role: { in: ['moderator', 'admin'] } } }),
    db.localResource.count({ where: { verified: false, deletedAt: null } }),
    db.volunteerOpportunity.count({ where: { verified: false, deletedAt: null } }),
    db.donationCampaign.count({ where: { verified: false, deletedAt: null } }),
    db.helpRequest.count({ where: { hiddenAt: { not: null } } }),
    db.comment.count({ where: { hiddenAt: { not: null } } }),
    db.moderationAction.count(),
  ]);

  return {
    openReports,
    actionedReports,
    members,
    suspended,
    staff,
    unverifiedResources,
    unverifiedOpportunities,
    unverifiedCampaigns,
    hiddenHelp,
    hiddenComments,
    moderationActions,
  };
}

/** Human summary of whatever a report points at. */
export async function targetSummary(targetType: string, targetId: string): Promise<{ title: string; href: string }> {
  const db = await getDb();
  const fallback = { title: `${targetType.replace(/_/g, ' ')} (removed)`, href: linkFor(targetType, targetId) };
  try {
    switch (targetType) {
      case 'help_request': {
        const row = await db.helpRequest.findUnique({ where: { id: targetId }, select: { title: true } });
        return row ? { title: row.title, href: fallback.href } : fallback;
      }
      case 'help_response': {
        const row = await db.helpResponse.findUnique({ where: { id: targetId }, select: { body: true } });
        return row ? { title: row.body.slice(0, 120), href: fallback.href } : fallback;
      }
      case 'comment': {
        const row = await db.comment.findUnique({ where: { id: targetId }, select: { body: true } });
        return row ? { title: row.body.slice(0, 120), href: fallback.href } : fallback;
      }
      case 'group_post': {
        const row = await db.groupPost.findUnique({ where: { id: targetId }, select: { body: true } });
        return row ? { title: row.body.slice(0, 120), href: fallback.href } : fallback;
      }
      case 'resource': {
        const row = await db.localResource.findUnique({ where: { id: targetId }, select: { name: true } });
        return row ? { title: row.name, href: fallback.href } : fallback;
      }
      case 'opportunity': {
        const row = await db.volunteerOpportunity.findUnique({ where: { id: targetId }, select: { title: true } });
        return row ? { title: row.title, href: fallback.href } : fallback;
      }
      case 'campaign': {
        const row = await db.donationCampaign.findUnique({ where: { id: targetId }, select: { title: true } });
        return row ? { title: row.title, href: fallback.href } : fallback;
      }
      case 'student_resource': {
        const row = await db.studentResource.findUnique({ where: { id: targetId }, select: { title: true } });
        return row ? { title: row.title, href: fallback.href } : fallback;
      }
      case 'user': {
        const row = await db.user.findUnique({
          where: { id: targetId },
          select: { username: true, profile: { select: { displayName: true } } },
        });
        return row ? { title: `@${row.username}`, href: `/members/${row.username}` } : fallback;
      }
      case 'message': {
        const row = await db.message.findUnique({ where: { id: targetId }, select: { body: true } });
        return row ? { title: row.body.slice(0, 120), href: '/messages' } : fallback;
      }
      default:
        return fallback;
    }
  } catch {
    return fallback;
  }
}

export async function listReports(options: { status?: string; page?: number } = {}) {
  const db = await getDb();
  const status = options.status && options.status !== 'all' ? options.status : undefined;
  const page = Math.max(1, options.page ?? 1);
  const where = status ? { status } : {};

  const [reports, total] = await Promise.all([
    db.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
        reviewedBy: { select: { username: true, profile: { select: { displayName: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.report.count({ where }),
  ]);

  const withSummaries = await Promise.all(
    reports.map(async (report) => ({ ...report, target: await targetSummary(report.targetType, report.targetId) })),
  );

  return { reports: withSummaries, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function reviewReport(
  moderator: SessionUser,
  reportId: string,
  status: 'reviewed' | 'actioned' | 'dismissed',
  resolution?: string,
) {
  const db = await getDb();
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError('That report does not exist.');

  await db.report.update({
    where: { id: reportId },
    data: { status, resolution: resolution ?? null, reviewedById: moderator.id, reviewedAt: new Date() },
  });

  await audit({
    actor: moderator,
    action: `report.${status}`,
    targetType: report.targetType,
    targetId: report.targetId,
    metadata: resolution ? { resolution } : null,
  });

  await notify({
    userId: report.reporterId,
    type: 'moderation',
    title: 'Thanks — your report was reviewed',
    body: resolution ?? `A moderator marked your report as ${status}.`,
    targetType: report.targetType,
    targetId: report.targetId,
    actorId: moderator.id,
  });

  return { status };
}

export async function listMembers(options: { q?: string; role?: string; suspended?: boolean; page?: number } = {}) {
  const db = await getDb();
  const q = options.q?.trim();
  const page = Math.max(1, options.page ?? 1);
  const where = {
    deletedAt: null,
    ...(options.role && options.role !== 'all' ? { role: options.role } : {}),
    ...(options.suspended === undefined ? {} : { isSuspended: options.suspended }),
    ...(q
      ? {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
            { profile: { displayName: { contains: q } } },
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
        email: true,
        role: true,
        isSuspended: true,
        suspendedReason: true,
        lastLoginAt: true,
        createdAt: true,
        profile: { select: { displayName: true, city: true, verificationStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  return { members, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function setMemberRole(moderator: SessionUser, userId: string, role: string) {
  if (userId === moderator.id) throw new ForbiddenError('You cannot change your own role.');
  if ((role === 'admin' || role === 'moderator') && moderator.role !== 'admin') {
    throw new ForbiddenError('Only an administrator can grant staff roles.');
  }

  const db = await getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Member not found.');
  if (user.role === 'admin' && moderator.role !== 'admin') {
    throw new ForbiddenError('Only an administrator can change another administrator.');
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  await audit({
    actor: moderator,
    action: 'user.role',
    targetType: 'user',
    targetId: userId,
    metadata: { from: user.role, to: role },
  });
  await notify({
    userId,
    type: 'moderation',
    title: 'Your OpenHub role changed',
    body: `You are now “${role}”.`,
    targetType: 'user',
    targetId: userId,
    actorId: moderator.id,
  });

  return { role };
}

export async function listVerificationQueue(kind: 'resources' | 'opportunities' | 'campaigns') {
  const db = await getDb();
  if (kind === 'resources') {
    const rows = await db.localResource.findMany({
      where: { verified: false, deletedAt: null },
      select: { id: true, name: true, city: true, category: true, createdAt: true, submittedById: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    return rows.map((row) => ({ id: row.id, title: row.name, subtitle: [row.category, row.city].filter(Boolean).join(' · '), createdAt: row.createdAt }));
  }
  if (kind === 'opportunities') {
    const rows = await db.volunteerOpportunity.findMany({
      where: { verified: false, deletedAt: null },
      select: { id: true, title: true, organizationName: true, city: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: [row.organizationName, row.city].filter(Boolean).join(' · '),
      createdAt: row.createdAt,
    }));
  }
  const rows = await db.donationCampaign.findMany({
    where: { verified: false, deletedAt: null },
    select: { id: true, title: true, cause: true, city: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });
  return rows.map((row) => ({ id: row.id, title: row.title, subtitle: [row.cause, row.city].filter(Boolean).join(' · '), createdAt: row.createdAt }));
}

export async function listAuditLogs(options: { page?: number; action?: string } = {}) {
  const db = await getDb();
  const page = Math.max(1, options.page ?? 1);
  const where = options.action && options.action !== 'all' ? { action: { startsWith: options.action } } : {};

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { username: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  return { entries, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listModerationHistory(page = 1) {
  const db = await getDb();
  const safePage = Math.max(1, page);
  const [actions, total] = await Promise.all([
    db.moderationAction.findMany({
      include: { moderator: { select: { username: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (safePage - 1) * PAGE_SIZE,
    }),
    db.moderationAction.count(),
  ]);

  return { actions, total, page: safePage, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listHiddenContent() {
  const db = await getDb();
  const [helpRequests, comments, posts, resources] = await Promise.all([
    db.helpRequest.findMany({
      where: { hiddenAt: { not: null } },
      select: { id: true, title: true, hiddenAt: true },
      orderBy: { hiddenAt: 'desc' },
      take: 20,
    }),
    db.comment.findMany({
      where: { hiddenAt: { not: null } },
      select: { id: true, body: true, hiddenAt: true },
      orderBy: { hiddenAt: 'desc' },
      take: 20,
    }),
    db.groupPost.findMany({
      where: { hiddenAt: { not: null } },
      select: { id: true, body: true, hiddenAt: true },
      orderBy: { hiddenAt: 'desc' },
      take: 20,
    }),
    db.localResource.findMany({
      where: { hiddenAt: { not: null } },
      select: { id: true, name: true, hiddenAt: true },
      orderBy: { hiddenAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    helpRequests: helpRequests.map((row) => ({ ...row, title: row.title, type: 'help_request' as const })),
    comments: comments.map((row) => ({ ...row, title: row.body.slice(0, 120), type: 'comment' as const })),
    posts: posts.map((row) => ({ ...row, title: row.body.slice(0, 120), type: 'group_post' as const })),
    resources: resources.map((row) => ({ ...row, title: row.name, type: 'resource' as const })),
  };
}

/** Staff-only guard used by admin server actions. */
export async function assertModerator(moderator: SessionUser) {
  if (!isStaffRole(moderator.role)) throw new ForbiddenError('Only moderators and administrators can do that.');
  return moderator;
}
