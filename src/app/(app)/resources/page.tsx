import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getDb } from '@/server/db/client';
import { averageRating, listDirectoryResources } from '@/features/resources/service';
import { DIRECTORY_PAGE_SIZE, resourceDirectoryFilters } from '@/features/resources/schemas';
import { DirectoryCard, ResourceEntryForm } from '@/features/resources/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { LOCAL_RESOURCE_CATEGORIES } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Local resources' };

export default async function ResourceDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await currentUser();
  const params = await searchParams;
  const tab = params.tab === 'add' && user ? 'add' : 'browse';
  const db = await getDb();

  const filters = resourceDirectoryFilters.parse({
    q: params.q,
    category: params.category,
    city: params.city,
    accessibility: params.accessibility,
    priceLevel: params.priceLevel,
    verified: params.verified,
    sort: params.sort ?? 'recent',
    page: params.page,
  });

  const profile = user ? await db.profile.findUnique({ where: { userId: user.id } }) : null;
  const { resources, total } = await listDirectoryResources(filters);

  const categories = LOCAL_RESOURCE_CATEGORIES.map((key) => ({ key, label: labelize(key) }));

  const filterParams: Record<string, string | undefined> = {
    q: filters.q,
    category: filters.category,
    city: filters.city,
    accessibility: filters.accessibility,
    priceLevel: filters.priceLevel === undefined ? undefined : String(filters.priceLevel),
    verified: filters.verified,
    sort: filters.sort,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Local resource directory"
        description="Hospitals, blood banks, libraries, shelters, food banks, repair shops and government offices shared by your community."
      />

      <Alert tone="info" title="Community data">
        Entries are submitted by members. Verified entries were checked by a moderator, unverified ones were not - always call
        ahead for urgent needs such as blood or beds.
      </Alert>

      <Tabs
        tabs={[
          { key: 'browse', label: 'Browse' },
          ...(user ? [{ key: 'add', label: 'Add a place' }] : []),
        ]}
        current={tab}
        basePath="/resources"
        searchParams={filterParams}
      />

      {tab === 'add' && user ? (
        <Card>
          <CardHeader title="Add a place" description="Add public places only. Never add a private home address or someone else's phone number." />
          <CardContent>
            <ResourceEntryForm
              categories={categories}
              defaultValues={{
                name: '',
                category: categories[0]?.key ?? 'hospital',
                description: '',
                address: '',
                city: profile?.city ?? '',
                country: profile?.country ?? '',
                phone: '',
                website: '',
                latitude: null,
                longitude: null,
                openingHours: '',
                accessibility: 'unknown',
                priceLevel: 0,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <form action="/resources" className="flex flex-wrap items-end gap-2" role="search">
            <div>
              <label htmlFor="dir-q" className="label">
                Search
              </label>
              <input id="dir-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="Search name or address" />
            </div>
            <div>
              <label htmlFor="dir-category" className="label">
                Category
              </label>
              <select id="dir-category" name="category" defaultValue={filters.category ?? ''} className="input-base">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dir-city" className="label">
                City
              </label>
              <input id="dir-city" name="city" defaultValue={filters.city ?? ''} className="input-base max-w-[10rem]" />
            </div>
            <div>
              <label htmlFor="dir-accessibility" className="label">
                Accessibility
              </label>
              <select id="dir-accessibility" name="accessibility" defaultValue={filters.accessibility ?? ''} className="input-base">
                <option value="">Any</option>
                <option value="step_free">Step free access</option>
                <option value="steps">Has steps</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label htmlFor="dir-priceLevel" className="label">
                Price
              </label>
              <select id="dir-priceLevel" name="priceLevel" defaultValue={filters.priceLevel === undefined ? '' : String(filters.priceLevel)} className="input-base">
                <option value="">Any price</option>
                <option value="0">Free</option>
                <option value="1">Cheap</option>
                <option value="2">Moderate</option>
                <option value="3">Expensive</option>
                <option value="4">Very expensive</option>
              </select>
            </div>
            <div>
              <label htmlFor="dir-verified" className="label">
                Verification
              </label>
              <select id="dir-verified" name="verified" defaultValue={filters.verified ?? ''} className="input-base">
                <option value="">Any</option>
                <option value="yes">Verified only</option>
                <option value="no">Unverified only</option>
              </select>
            </div>
            <div>
              <label htmlFor="dir-sort" className="label">
                Sort
              </label>
              <select id="dir-sort" name="sort" defaultValue={filters.sort} className="input-base">
                <option value="recent">Newest</option>
                <option value="name">Name A-Z</option>
                <option value="rating">Most reviewed</option>
              </select>
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply filters
            </button>
          </form>

          {resources.length === 0 ? (
            <EmptyState
              title="Nothing matches these filters"
              description="Try another category or city, or add the first entry for your area."
              icon={<MapPin className="h-8 w-8" aria-hidden="true" />}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {resources.map((resource) => (
                <DirectoryCard key={resource.id} resource={resource} rating={averageRating(resource.reviews)} />
              ))}
            </ul>
          )}

          <Pagination page={filters.page} pageSize={DIRECTORY_PAGE_SIZE} total={total} basePath="/resources" searchParams={filterParams} />
        </div>
      )}
    </div>
  );
}
