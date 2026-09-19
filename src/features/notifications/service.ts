import { getDb } from '@/server/db/client';

const PAGE_SIZE = 30;

/** Notifications for the signed-in user, newest first. */
export async function listNotifications(userId: string, options: { unreadOnly?: boolean; page?: number } = {}) {
  const db = await getDb();
  const page = Math.max(1, options.page ?? 1);
  const where = { userId, ...(options.unreadOnly ? { readAt: null } : {}) };

  const [notifications, total, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    notifications,
    unread,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Activity history for the "what did I do" page. */
export async function listActivity(userId: string, page = 1) {
  const db = await getDb();
  const safePage = Math.max(1, page);
  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (safePage - 1) * PAGE_SIZE,
    }),
    db.activityLog.count({ where: { userId } }),
  ]);

  return { entries, total, page: safePage, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
