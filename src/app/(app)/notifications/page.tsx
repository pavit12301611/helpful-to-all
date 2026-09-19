import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listNotifications } from '@/features/notifications/service';
import { MarkAllReadButton, NotificationList } from '@/features/notifications/components';
import { Card, CardContent, CardHeader, SectionHeading, Stat } from '@/components/ui/card';
import { Tabs, Pagination } from '@/components/ui/list';

export const metadata: Metadata = { title: 'Notifications' };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = params.tab === 'unread' ? 'unread' : 'all';
  const page = Number(params.page ?? 1) || 1;

  const { notifications, unread, total } = await listNotifications(user.id, {
    unreadOnly: tab === 'unread',
    page,
  });

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Notifications"
        description="Replies, invites, reminders and moderation updates about things you took part in."
        icon={<Bell className="h-5 w-5" aria-hidden="true" />}
        action={<MarkAllReadButton hasUnread={unread > 0} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <Stat label="Unread" value={unread} hint="Click an item to open it" />
        <Stat label="Total notifications" value={total} hint="Kept for 12 months" />
      </div>

      <Tabs tabs={TABS} current={tab} basePath="/notifications" searchParams={params} />

      <Card>
        <CardHeader title={tab === 'unread' ? 'Unread' : 'All notifications'} description="Only you can see these." />
        <CardContent>
          <NotificationList notifications={notifications} />
          <Pagination page={page} pageSize={30} total={total} basePath="/notifications" searchParams={{ tab }} />
        </CardContent>
      </Card>
    </div>
  );
}
