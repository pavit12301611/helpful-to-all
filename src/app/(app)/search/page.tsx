import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ShieldCheck } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { SEARCH_TYPES, unifiedSearch, type SearchType } from '@/server/services/search';
import { enforceRateLimit } from '@/lib/rate-limit';
import { Card, CardContent, CardHeader, Badge, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Search' };

const TYPE_LABELS: Record<SearchType, string> = {
  users: 'People',
  groups: 'Groups',
  help: 'Help posts',
  events: 'Events',
  resources: 'Local resources',
  skills: 'Skills',
  student: 'Student resources',
  volunteer: 'Volunteer & donate',
  business: 'Businesses',
  personal: 'My content',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const city = (params.city ?? '').trim();
  const selected = (params.type ? params.type.split(',') : []).filter((type): type is SearchType =>
    (SEARCH_TYPES as readonly string[]).includes(type),
  );

  if (q.length >= 2) {
    await enforceRateLimit('search', user.id);
  }

  const results = q.length >= 2 ? await unifiedSearch(user, { q, city, types: selected.length ? selected : undefined, take: 12 }) : null;

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Search"
        description="One box for everything you are allowed to see: people, groups, help posts, resources, skills and your own content."
        icon={<Search className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        Private notes, private help posts, unpublished listings and anything you have blocked never appear here. Search is not
        logged beyond the rate limit.
      </Alert>

      <Card>
        <CardContent className="pt-5">
          <form method="get" action="/search" className="grid gap-3" aria-label="Search OpenHub">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search for a person, group, skill, hospital, note…"
                aria-label="Search query"
                minLength={2}
                required
              />
              <Input name="city" defaultValue={city} placeholder="City (optional)" aria-label="Filter by city" />
              <Button type="submit">
                <Search className="h-4 w-4" aria-hidden="true" /> Search
              </Button>
            </div>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="label">Limit to</legend>
              {SEARCH_TYPES.map((type) => {
                const active = selected.includes(type);
                const next = active ? selected.filter((entry) => entry !== type) : [...selected, type];
                const href = `/search?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}${
                  next.length ? `&type=${next.join(',')}` : ''
                }`;
                return (
                  <Link
                    key={type}
                    href={href}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </Link>
                );
              })}
            </fieldset>
          </form>
        </CardContent>
      </Card>

      {!results ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState title="Type at least two characters" description="Results respect every privacy setting in OpenHub." icon={<Search className="h-8 w-8" aria-hidden="true" />} />
          </CardContent>
        </Card>
      ) : results.hits.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState
              title={`No matches for “${results.query}”`}
              description="Try fewer filters, a different spelling, or search in another section directly."
              icon={<ShieldCheck className="h-8 w-8" aria-hidden="true" />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <Card>
            <CardHeader
              title={`${results.total} result${results.total === 1 ? '' : 's'} for “${results.query}”`}
              description="Grouped by where the item lives in OpenHub."
            />
            <CardContent>
              <ul className="divide-y divide-border">
                {results.hits.map((hit) => (
                  <li key={`${hit.type}-${hit.id}`} className="flex items-start justify-between gap-3 py-3">
                    <Link href={hit.href} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground hover:text-primary">{hit.title}</span>
                      {hit.subtitle ? <span className="block truncate text-sm text-muted-foreground">{hit.subtitle}</span> : null}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      {hit.badge ? <Badge tone="neutral">{hit.badge}</Badge> : null}
                      <Badge tone="primary">{labelize(TYPE_LABELS[hit.type] ?? hit.type)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="h-max">
            <CardHeader title="Breakdown" />
            <CardContent>
              <ul className="grid gap-2">
                {Object.entries(results.byType)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => (
                    <li key={type} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{TYPE_LABELS[type as SearchType] ?? labelize(type)}</span>
                      <span className="tabular-nums text-foreground">{count}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
