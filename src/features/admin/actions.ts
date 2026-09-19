'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { runAction, type ActionResult } from '@/server/core/action';
import { ForbiddenError } from '@/lib/errors';
import { requireStaff } from '@/server/core/guards';
import {
  hideContent,
  restoreContent,
  setDiscussionLock,
  setUserSuspended,
  verifyCampaign,
  verifyOpportunity,
  verifyResource,
  warnUser,
} from '@/server/services/moderation';
import { assertModerator, reviewReport, setMemberRole } from './service';

function refresh() {
  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

const reviewSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(['reviewed', 'actioned', 'dismissed']),
  resolution: z.string().trim().max(600).optional().or(z.literal('')),
});

const hideSchema = z.object({
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  note: z.string().trim().max(600).optional().or(z.literal('')),
});

const warnSchema = z.object({
  userId: z.string().min(1),
  note: z.string().trim().min(3, 'Explain the warning.').max(600),
});

const suspendSchema = z.object({
  userId: z.string().min(1),
  suspended: z.boolean(),
  reason: z.string().trim().max(600).optional().or(z.literal('')),
});

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['user', 'student', 'volunteer', 'organizer', 'business', 'moderator', 'admin']),
});

const lockSchema = z.object({
  targetType: z.enum(['help_request', 'group_post']),
  targetId: z.string().min(1),
  locked: z.boolean(),
});

const verifySchema = z.object({
  kind: z.enum(['resource', 'opportunity', 'campaign']),
  id: z.string().min(1),
});

function bool(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on';
}

export async function reviewReportAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: reviewSchema,
    input: {
      reportId: String(formData.get('reportId') ?? ''),
      status: String(formData.get('status') ?? 'reviewed'),
      resolution: String(formData.get('resolution') ?? ''),
    },
    successMessage: 'Report updated.',
    handler: async (data) => {
      await assertModerator(moderator);
      await reviewReport(moderator, data.reportId, data.status, data.resolution || undefined);
      refresh();
    },
  });
}

export async function hideContentAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: hideSchema,
    input: {
      targetType: String(formData.get('targetType') ?? ''),
      targetId: String(formData.get('targetId') ?? ''),
      note: String(formData.get('note') ?? ''),
    },
    successMessage: 'Content hidden.',
    handler: async (data) => {
      await assertModerator(moderator);
      await hideContent(moderator, data.targetType, data.targetId, data.note || undefined);
      refresh();
    },
  });
}

export async function restoreContentAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: hideSchema,
    input: {
      targetType: String(formData.get('targetType') ?? ''),
      targetId: String(formData.get('targetId') ?? ''),
    },
    successMessage: 'Content restored.',
    handler: async (data) => {
      await assertModerator(moderator);
      await restoreContent(moderator, data.targetType, data.targetId);
      refresh();
    },
  });
}

export async function warnUserAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: warnSchema,
    input: { userId: String(formData.get('userId') ?? ''), note: String(formData.get('note') ?? '') },
    successMessage: 'Warning sent.',
    handler: async (data) => {
      await assertModerator(moderator);
      await warnUser(moderator, data.userId, data.note);
      refresh();
    },
  });
}

export async function suspendUserAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: suspendSchema,
    input: {
      userId: String(formData.get('userId') ?? ''),
      suspended: bool(formData.get('suspended')),
      reason: String(formData.get('reason') ?? ''),
    },
    successMessage: 'Member updated.',
    handler: async (data) => {
      await assertModerator(moderator);
      await setUserSuspended(moderator, data.userId, data.suspended, data.reason || undefined);
      refresh();
    },
  });
}

export async function setMemberRoleAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: roleSchema,
    input: { userId: String(formData.get('userId') ?? ''), role: String(formData.get('role') ?? 'user') },
    successMessage: 'Role updated.',
    handler: async (data) => {
      await assertModerator(moderator);
      await setMemberRole(moderator, data.userId, data.role);
      refresh();
    },
  });
}

export async function lockDiscussionAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: lockSchema,
    input: {
      targetType: String(formData.get('targetType') ?? 'help_request'),
      targetId: String(formData.get('targetId') ?? ''),
      locked: bool(formData.get('locked')),
    },
    successMessage: 'Discussion updated.',
    handler: async (data) => {
      await assertModerator(moderator);
      await setDiscussionLock(moderator, data.targetType, data.targetId, data.locked);
      refresh();
    },
  });
}

export async function verifyAction(formData: FormData): Promise<ActionResult> {
  const moderator = await requireStaff();
  return runAction({
    schema: verifySchema,
    input: { kind: String(formData.get('kind') ?? 'resource'), id: String(formData.get('id') ?? '') },
    successMessage: 'Marked as verified.',
    handler: async (data) => {
      await assertModerator(moderator);
      if (data.kind === 'resource') await verifyResource(moderator, data.id);
      else if (data.kind === 'opportunity') await verifyOpportunity(moderator, data.id);
      else await verifyCampaign(moderator, data.id);
      refresh();
    },
  });
}

export async function exportAuditAction(): Promise<ActionResult> {
  const moderator = await requireStaff();
  if (moderator.role !== 'admin') throw new ForbiddenError('Only administrators can export the audit log.');
  return runAction({
    successMessage: 'Audit export started.',
    handler: async () => ({ allowed: true }),
  });
}
