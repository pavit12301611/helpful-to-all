import { getDb } from '@/server/db/client';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors';
import { audit } from '@/server/core/audit';
import { notify } from '@/server/services/notifications';
import type { SessionUser } from '@/server/core/session';
import type { ModerationActionKey, ReportableTarget } from './types';

/**
 * Moderation service.
 *
 * Every action here is:
 *   1. allowed only for staff (enforced by the caller through requireStaff)
 *   2. written to ModerationAction and AuditLog
 *   3. notified to the affected member
 *
 * Content is hidden (`hiddenAt`) rather than destroyed, so mistakes can be
 * reversed and abuse patterns can be reviewed.
 */

const HIDEABLE_MODELS = {
  help_request: { model: 'helpRequest', owner: 'authorId' },
  help_response: { model: 'helpResponse', owner: 'authorId' },
  comment: { model: 'comment', owner: 'authorId' },
  group_post: { model: 'groupPost', owner: 'authorId' },
  resource: { model: 'localResource', owner: 'submittedById' },
  opportunity: { model: 'volunteerOpportunity', owner: 'organizerId' },
  campaign: { model: 'donationCampaign', owner: 'organizerId' },
  student_resource: { model: 'studentResource', owner: 'uploaderId' },
  message: { model: 'message', owner: 'senderId' },
} as const;

type HideableKey = keyof typeof HIDEABLE_MODELS;

function isHideable(targetType: string): targetType is HideableKey {
  return targetType in HIDEABLE_MODELS;
}

export async function hideContent(
  moderator: SessionUser,
  targetType: string,
  targetId: string,
  note?: string,
): Promise<void> {
  if (!isHideable(targetType)) throw new ForbiddenError('That content type cannot be hidden.');
  const db = await getDb();
  const config = HIDEABLE_MODELS[targetType];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (db as any)[config.model];
  const existing = await delegate.findUnique({ where: { id: targetId } });
  if (!existing) throw new NotFoundError();

  await delegate.update({ where: { id: targetId }, data: { hiddenAt: new Date() } });
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'hide', targetType, targetId, note: note ?? null },
  });
  await audit({
    actor: moderator,
    action: 'moderation.hide',
    targetType,
    targetId,
    metadata: note ? { note } : null,
  });
  await notify({
    userId: existing[config.owner],
    type: 'moderation',
    title: 'Your post was hidden by a moderator',
    body: note ?? 'A moderator reviewed a report about this content.',
    targetType,
    targetId,
    actorId: moderator.id,
  });
}

export async function restoreContent(
  moderator: SessionUser,
  targetType: string,
  targetId: string,
): Promise<void> {
  if (!isHideable(targetType)) throw new ForbiddenError('That content type cannot be restored.');
  const db = await getDb();
  const config = HIDEABLE_MODELS[targetType];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (db as any)[config.model];
  await delegate.update({ where: { id: targetId }, data: { hiddenAt: null } });
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'restore', targetType, targetId },
  });
  await audit({ actor: moderator, action: 'moderation.restore', targetType, targetId });
}

export async function setDiscussionLock(
  moderator: SessionUser,
  targetType: string,
  targetId: string,
  locked: boolean,
): Promise<void> {
  const db = await getDb();
  if (targetType === 'help_request') {
    await db.helpRequest.update({ where: { id: targetId }, data: { lockedAt: locked ? new Date() : null } });
  } else if (targetType === 'group_post') {
    await db.groupPost.update({ where: { id: targetId }, data: { locked } });
  } else {
    throw new ForbiddenError('Only help requests and group posts can be locked.');
  }
  await db.moderationAction.create({
    data: {
      moderatorId: moderator.id,
      action: locked ? 'lock' : 'unlock',
      targetType,
      targetId,
    },
  });
  await audit({ actor: moderator, action: `moderation.${locked ? 'lock' : 'unlock'}`, targetType, targetId });
}

export async function warnUser(
  moderator: SessionUser,
  userId: string,
  note: string,
): Promise<void> {
  const db = await getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Member not found.');
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'warn', targetType: 'user', targetId: userId, note },
  });
  await audit({ actor: moderator, action: 'moderation.warn', targetType: 'user', targetId: userId, metadata: { note } });
  await notify({
    userId,
    type: 'moderation',
    title: 'Warning from the OpenHub moderators',
    body: note,
    targetType: 'user',
    targetId: userId,
    actorId: moderator.id,
  });
}

export async function setUserSuspended(
  moderator: SessionUser,
  userId: string,
  suspended: boolean,
  reason?: string,
): Promise<void> {
  if (userId === moderator.id) throw new ConflictError('You cannot suspend your own account.');
  const db = await getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Member not found.');
  if (user.role === 'admin' && moderator.role !== 'admin') {
    throw new ForbiddenError('Only an administrator can suspend another administrator.');
  }

  await db.user.update({
    where: { id: userId },
    data: { isSuspended: suspended, suspendedReason: suspended ? (reason ?? null) : null },
  });
  await db.moderationAction.create({
    data: {
      moderatorId: moderator.id,
      action: suspended ? 'suspend' : 'reinstate',
      targetType: 'user',
      targetId: userId,
      note: reason ?? null,
    },
  });
  await audit({
    actor: moderator,
    action: `moderation.${suspended ? 'suspend' : 'reinstate'}`,
    targetType: 'user',
    targetId: userId,
    metadata: reason ? { reason } : null,
  });
  await notify({
    userId,
    type: 'moderation',
    title: suspended ? 'Your account has been suspended' : 'Your account has been reinstated',
    body: reason ?? '',
    targetType: 'user',
    targetId: userId,
    actorId: moderator.id,
  });
}

export async function verifyResource(moderator: SessionUser, resourceId: string): Promise<void> {
  const db = await getDb();
  const resource = await db.localResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError();
  await db.localResource.update({
    where: { id: resourceId },
    data: { verified: true, verifiedById: moderator.id, verifiedAt: new Date(), lastConfirmedAt: new Date(), status: 'active' },
  });
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'verify', targetType: 'resource', targetId: resourceId },
  });
  await audit({ actor: moderator, action: 'resource.verify', targetType: 'resource', targetId: resourceId });
  await notify({
    userId: resource.submittedById,
    type: 'resource_update',
    title: 'Your resource was verified',
    body: `${resource.name} is now marked as verified. Thank you for contributing.`,
    targetType: 'resource',
    targetId: resourceId,
    actorId: moderator.id,
  });
}

export async function verifyCampaign(moderator: SessionUser, campaignId: string): Promise<void> {
  const db = await getDb();
  const campaign = await db.donationCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError();
  await db.donationCampaign.update({
    where: { id: campaignId },
    data: { verified: true, verifiedById: moderator.id },
  });
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'verify', targetType: 'campaign', targetId: campaignId },
  });
  await audit({ actor: moderator, action: 'campaign.verify', targetType: 'campaign', targetId: campaignId });
  await notify({
    userId: campaign.organizerId,
    type: 'resource_update',
    title: 'Your campaign was verified',
    body: `${campaign.title} now shows a verified badge.`,
    targetType: 'campaign',
    targetId: campaignId,
    actorId: moderator.id,
  });
}

export async function verifyOpportunity(moderator: SessionUser, opportunityId: string): Promise<void> {
  const db = await getDb();
  await db.volunteerOpportunity.update({
    where: { id: opportunityId },
    data: { verified: true, verifiedById: moderator.id },
  });
  await db.moderationAction.create({
    data: { moderatorId: moderator.id, action: 'verify', targetType: 'opportunity', targetId: opportunityId },
  });
  await audit({ actor: moderator, action: 'opportunity.verify', targetType: 'opportunity', targetId: opportunityId });
}

export type { ModerationActionKey, ReportableTarget };
