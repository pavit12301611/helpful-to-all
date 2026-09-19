import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { listHelpRequests } from '@/features/help/service';
import { helpFilters, HELP_PAGE_SIZE } from '@/features/help/schemas';
import { HelpRequestCard } from '@/features/help/components';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { FilterBar, Pagination, Tabs } from '@/components/ui/list';
import { SectionHeading } from '@/components/ui/card';
import { HELP_CATEGORIES, HELP_URGENCY } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Community help' };

const TABS = [
  { key: 'all', label: 'Everything' },
  { key: 'open', label: 'Needs help' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'offers', label: 'Offers' },
  { key: 'solved', label: 'Solved' },
  { key: 'mine', label: 'My posts' },
];

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await currentUser();
  const params = await searchParams;
  const filters = helpFilters.parse({
    q: params.q,
    category: params.category,
    kind: params.kind,
    status: params.status,
    urgency: params.urgency,
    city: params.city,
    tab: params.tab ?? 'all',
    sort: params.sort ?? 'recent',
    page: params.page,
  });

  const { requests, total } = await listHelpRequests(user?.id ?? null, filters, user?.role ?? 'user');

  const activeParams: Record<string, string | undefined> = {
    q: filters.q,
    category: filters.category,
    urgency: filters.urgency,
    city: filters.city,
    sort: filters.sort,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Community help"
        description="Ask a question, request help, or offer what you can. Kind answers keep this place useful."
        action={
          <Link
            href="/help/new"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ask or offer help
          </Link>
        }
      />

      <Alert tone="warning" title="Please read before answering">
        Members share information in good faith. OpenHub does not provide professional medical, legal or financial
        advice - always confirm important details with an official source.
      </Alert>

      <div className="space-y-3">
        <Tabs tabs={TABS} current={filters.tab} basePath="/help" searchParams={activeParams} />

        <FilterBar>
          <form className="flex flex-wrap items-end gap-2" action="/help" role="search">
            <input type="hidden" name="tab" value={filters.tab} />
            <div>
              <label htmlFor="help-q" className="label">
                Search
              </label>
              <input id="help-q" name="q" defaultValue={filters.q ?? ''} placeholder="Search requests" className="input-base max-w-xs" />
            </div>
            <div>
              <label htmlFor="help-category" className="label">
                Category
              </label>
              <select id="help-category" name="category" defaultValue={filters.category ?? ''} className="input-base">
                <option value="">All categories</option>
                {HELP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {labelize(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="help-urgency" className="label">
                Urgency
              </label>
              <select id="help-urgency" name="urgency" defaultValue={filters.urgency ?? ''} className="input-base">
                <option value="">Any urgency</option>
                {HELP_URGENCY.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {labelize(urgency)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="help-city" className="label">
                City
              </label>
              <input id="help-city" name="city" defaultValue={filters.city ?? ''} placeholder="Any city" className="input-base max-w-[10rem]" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply filters
            </button>
          </form>
        </FilterBar>

        {requests.length === 0 ? (
          <EmptyState
            title="No requests match these filters"
            description="Try a different category, or be the first to post in your area."
            icon={<LifeBuoy className="h-8 w-8" aria-hidden="true" />}
            action={
              <Link href="/help/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                Post a request
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <HelpRequestCard key={request.id} request={request} />
            ))}
          </ul>
        )}

        <Pagination page={filters.page} pageSize={HELP_PAGE_SIZE} total={total} basePath="/help" searchParams={{ ...activeParams, tab: filters.tab }} />
      </div>
    </div>
  );
}
