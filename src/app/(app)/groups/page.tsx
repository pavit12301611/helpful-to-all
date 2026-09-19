import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listGroups } from '@/features/groups/service';
import { groupFilters, GROUP_PAGE_SIZE } from '@/features/groups/schemas';
import { GroupCard } from '@/features/groups/components';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { Card, CardContent, SectionHeading } from '@/components/ui/card';
import { GROUP_KINDS } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Groups' };

const TABS = [
  { key: 'mine', label: 'My groups' },
  { key: 'public', label: 'Public groups' },
  { key: 'discover', label: 'Find a group' },
];

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const filters = groupFilters.parse({
    q: params.q,
    kind: params.kind,
    tab: params.tab ?? 'mine',
    page: params.page,
  });

  const { groups, total } = await listGroups(user.id, filters);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Groups"
        description="Shared spaces for friends, family, classes, clubs, teams and neighbourhoods."
        action={
          <Link href="/groups/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Create group
          </Link>
        }
      />

      <div className="space-y-3">
        <Tabs tabs={TABS} current={filters.tab} basePath="/groups" searchParams={{ q: filters.q, kind: filters.kind }} />

        <form action="/groups" className="flex flex-wrap items-end gap-2" role="search">
          <input type="hidden" name="tab" value={filters.tab} />
          <div>
            <label htmlFor="group-q" className="label">
              Search
            </label>
            <input id="group-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="Search group names" />
          </div>
          <div>
            <label htmlFor="group-kind" className="label">
              Type
            </label>
            <select id="group-kind" name="kind" defaultValue={filters.kind ?? ''} className="input-base">
              <option value="">All types</option>
              {GROUP_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {labelize(kind)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Apply
          </button>
        </form>

        {groups.length === 0 ? (
          <EmptyState
            title={filters.tab === 'mine' ? 'You are not in any group yet' : 'No groups found'}
            description="Create one for your household, class or team - you can invite people with a private link."
            icon={<Users className="h-8 w-8" aria-hidden="true" />}
            action={
              <Link href="/groups/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                Create group
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} myRole={group.members?.[0]?.role} />
            ))}
          </ul>
        )}

        <Pagination page={filters.page} pageSize={GROUP_PAGE_SIZE} total={total} basePath="/groups" searchParams={{ tab: filters.tab, q: filters.q, kind: filters.kind }} />
      </div>

      <Card>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How group privacy works</p>
          <p>Private groups are invisible in search and only members can open them. Public groups can be joined by anyone signed in.</p>
          <p>Members never see each other&apos;s email addresses or phone numbers - only display names.</p>
        </CardContent>
      </Card>
    </div>
  );
}
