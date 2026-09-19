import type { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listBookmarks } from '@/features/bookmarks/service';
import { bookmarkFilters } from '@/features/bookmarks/schemas';
import { BookmarkForm, BookmarkRow } from '@/features/bookmarks/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';

export const metadata: Metadata = { title: 'Bookmarks' };

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const filters = bookmarkFilters.parse({ q: params.q, category: params.category, favorites: params.favorites ?? 'all' });
  const { bookmarks, categories } = await listBookmarks(user.id, filters);

  return (
    <div className="space-y-5">
      <SectionHeading title="Bookmarks" description="Links you want to keep. Private to you." />

      <Card>
        <CardHeader title="Save a link" icon={<Bookmark className="h-5 w-5" aria-hidden="true" />} />
        <CardContent>
          <BookmarkForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <form className="flex flex-wrap gap-2" role="search" action="/bookmarks">
          <label htmlFor="bookmark-search" className="sr-only">
            Search bookmarks
          </label>
          <input id="bookmark-search" name="q" defaultValue={filters.q ?? ''} placeholder="Search saved links" className="input-base max-w-xs" />
          <label htmlFor="bookmark-category" className="sr-only">
            Category
          </label>
          <select id="bookmark-category" name="category" defaultValue={filters.category ?? ''} className="input-base max-w-[10rem]">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Filter
          </button>
        </form>

        <Tabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'favorites', label: 'Favourites' },
          ]}
          current={filters.favorites}
          basePath="/bookmarks"
        />

        {bookmarks.length === 0 ? (
          <EmptyState title="No links saved yet" description="Save an article, a recipe or a form you use often." />
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((bookmark) => (
              <BookmarkRow key={bookmark.id} bookmark={bookmark} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
