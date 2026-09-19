'use client';

import Link from 'next/link';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { ServerForm } from '@/components/forms/server-form';
import { markAllNotificationsReadAction, markNotificationReadAction } from './actions';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function MarkAllReadButton({ hasUnread }: { hasUnread: boolean }) {
  return (
    <ServerForm action={() => markAllNotificationsReadAction()} ariaLabel="Mark all notifications as read">
      {({ pending }) => (
        <Button type="submit" variant="outline" size="sm" loading={pending} disabled={!hasUnread || pending}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
        </Button>
      )}
    </ServerForm>
  );
}

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        title="Nothing new"
        description="Replies to your questions, group invites and moderation updates land here."
        icon={<BellOff className="h-8 w-8" aria-hidden="true" />}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {notifications.map((notification) => {
        const unread = !notification.readAt;
        const content = (
          <>
            <span className="flex flex-wrap items-center gap-2">
              <Bell className={`h-4 w-4 ${unread ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
              <span className={`text-sm ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{notification.title}</span>
              <Badge tone="neutral">{notification.type.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</span>
            </span>
            {notification.body ? <span className="mt-1 block text-sm text-muted-foreground">{notification.body}</span> : null}
          </>
        );

        return (
          <li key={notification.id} className="flex items-start justify-between gap-3 py-3">
            {notification.link ? (
              <Link href={notification.link} className="min-w-0 flex-1 hover:text-primary">
                {content}
              </Link>
            ) : (
              <div className="min-w-0 flex-1">{content}</div>
            )}
            {unread ? (
              <ServerForm action={() => markNotificationReadAction(notification.id)} ariaLabel="Mark notification as read">
                {({ pending }) => (
                  <Button type="submit" variant="ghost" size="sm" loading={pending} disabled={pending}>
                    Mark read
                  </Button>
                )}
              </ServerForm>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
