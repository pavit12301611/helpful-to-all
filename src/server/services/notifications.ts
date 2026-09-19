import { getDb } from '@/server/db/client';
import { sendEmail, renderEmail } from '@/server/services/email';
import { parseCsv, toCsv } from '@/lib/utils';
import { appUrl } from '@/lib/env';
import type { NotificationType } from '@/lib/enums';

/**
 * Notification service.
 *
 * In-app notifications are always written (unless the user muted the type).
 * Email is opt-in and honours the digest preference: `instant` sends right away,
 * `daily`/`weekly` only mark the row so a scheduled digest job can pick it up.
 */

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  targetType?: string | null;
  targetId?: string | null;
  link?: string;
  /** Never notify the person who caused the event. */
  actorId?: string | null;
};

export async function notify(input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;

  const db = await getDb();
  const prefs = await db.notificationPreference.findUnique({ where: { userId: input.userId } });
  const muted = parseCsv(prefs?.disabledTypes ?? '').includes(input.type);
  if (prefs && !prefs.inAppEnabled) return;
  if (muted) return;

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      link: input.link ?? null,
    },
  });

  if (prefs?.emailEnabled && prefs.digestMode === 'instant') {
    const user = await db.user.findUnique({ where: { id: input.userId } });
    if (user?.email) {
      const { text, html } = renderEmail(input.title, [
        input.body ?? '',
        input.link ? `${appUrl()}${input.link}` : '',
      ]);
      const sent = await sendEmail({ to: user.email, subject: input.title, text, html });
      if (sent) {
        await db.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
      }
    }
  }
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
  const unique = Array.from(new Set(userIds.filter((id) => id !== input.actorId)));
  await Promise.all(unique.map((userId) => notify({ ...input, userId })));
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const db = await getDb();
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const db = await getDb();
  await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const db = await getDb();
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function getPreferences(userId: string) {
  const db = await getDb();
  const existing = await db.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.notificationPreference.create({ data: { userId } });
}

export async function updatePreferences(
  userId: string,
  input: { inAppEnabled?: boolean; emailEnabled?: boolean; digestMode?: string; disabledTypes?: string[] },
) {
  const db = await getDb();
  return db.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      inAppEnabled: input.inAppEnabled ?? true,
      emailEnabled: input.emailEnabled ?? false,
      digestMode: input.digestMode ?? 'instant',
      disabledTypes: toCsv(input.disabledTypes ?? []),
    },
    update: {
      ...(input.inAppEnabled === undefined ? {} : { inAppEnabled: input.inAppEnabled }),
      ...(input.emailEnabled === undefined ? {} : { emailEnabled: input.emailEnabled }),
      ...(input.digestMode === undefined ? {} : { digestMode: input.digestMode }),
      ...(input.disabledTypes === undefined ? {} : { disabledTypes: toCsv(input.disabledTypes) }),
    },
  });
}
