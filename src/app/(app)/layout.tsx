import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { currentUser } from '@/server/core/guards';
import { unreadNotificationCount } from '@/server/services/notifications';
import { navItemsForRole } from '@/lib/navigation';
import { getDb } from '@/server/db/client';

/**
 * Application shell for every authenticated page (and for public discovery
 * pages such as events, resources and skills, which are readable signed out).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  const [unread, profile] = await Promise.all([
    user ? unreadNotificationCount(user.id) : 0,
    user ? (await getDb()).profile.findUnique({ where: { userId: user.id } }) : null,
  ]);

  return (
    <AppShell
      items={navItemsForRole(user?.role ?? 'user')}
      unreadNotifications={unread}
      user={
        user
          ? {
              username: user.username,
              displayName: profile?.displayName ?? user.displayName,
              avatarUrl: profile?.avatarUrl ?? null,
              role: user.role,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}
