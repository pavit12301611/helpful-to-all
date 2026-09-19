import type { Metadata } from 'next';
import { NotebookPen } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listNotes } from '@/features/notes/service';
import { noteFilters } from '@/features/notes/schemas';
import { NoteCard, NoteForm } from '@/features/notes/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Notes' };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const filters = noteFilters.parse({ q: params.q, view: params.view ?? params.tab ?? 'all', tag: params.tag });
  const notes = await listNotes(user.id, filters);

  return (
    <div className="space-y-5">
      <SectionHeading title="Notes" description="Private notes with tags. Only you can read them." />

      <Alert tone="info">
        Notes are private by default and are never shown in community search results.
      </Alert>

      <Card>
        <CardHeader title="New note" icon={<NotebookPen className="h-5 w-5" aria-hidden="true" />} />
        <CardContent>
          <NoteForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <form className="flex gap-2" role="search" action="/notes">
          <label htmlFor="note-search" className="sr-only">
            Search notes
          </label>
          <input id="note-search" name="q" defaultValue={filters.q ?? ''} placeholder="Search your notes" className="input-base max-w-sm" />
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Search
          </button>
        </form>

        <Tabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'pinned', label: 'Pinned' },
            { key: 'archived', label: 'Archived' },
          ]}
          current={filters.view}
          basePath="/notes"
        />

        {notes.length === 0 ? (
          <EmptyState title="No notes yet" description="Write your first note above - ideas, study notes, shopping plans." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
