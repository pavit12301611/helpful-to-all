import type { Metadata } from 'next';
import { History } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listActivity } from '@/features/notifications/service';
import { Card, CardContent, CardHeader, Badge, SectionHeading, Stat } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/list';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Activity history' };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const { entries, total } = await listActivity(user.id, page);

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Activity history"
        description="A private log of what you did on OpenHub, so you can find your way back."
        icon={<History className="h-5 w-5" aria-hidden="true" />}
      />

      <Stat label="Recorded actions" value={total} hint="Only you can see this list" />

      <Card>
        <CardHeader title="Recent activity" description="Newest first. Moderators see their own moderation log under Admin." />
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState title="No activity yet" description="Create a task, answer a question or join a group and it shows up here." icon={<History className="h-8 w-8" aria-hidden="true" />} />
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
                  </div>
                  <Badge tone="neutral">{labelize(entry.type.replace(/_/g, ' '))}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={30} total={total} basePath="/activity" />
        </CardContent>
      </Card>
    </div>
  );
}
