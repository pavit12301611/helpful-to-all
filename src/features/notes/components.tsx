'use client';

import * as React from 'react';
import { NotebookPen, Pin, Trash2, Archive } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/card';
import { formatRelative } from '@/lib/utils';
import { createNoteAction, deleteNoteAction, toggleNoteArchiveAction, toggleNotePinAction, updateNoteAction } from './actions';

export function NoteForm({ compact = false }: { compact?: boolean }) {
  return (
    <ServerForm action={createNoteAction} successMessage="Note saved." resetOnSuccess ariaLabel="Create a note" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" placeholder="Meeting notes" required maxLength={160} />}
          </Field>
          <Field label="Note" name="body" error={errors.body} hint="Markdown is fine - it stays private to you.">
            {(props) => <Textarea {...props} name="body" rows={compact ? 3 : 6} placeholder="Write freely…" />}
          </Field>
          <Field label="Tags" name="tags" error={errors.tags} hint="Comma separated">
            {(props) => <Input {...props} name="tags" placeholder="study, ideas" />}
          </Field>
          <SubmitButton pending={pending}>Save note</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function NoteCard({
  note,
}: {
  note: { id: string; title: string; body: string; tags: string; pinned: boolean; archivedAt: Date | null; updatedAt: Date };
}) {
  const [editing, setEditing] = React.useState(false);

  return (
    <article className="card-surface flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{note.title}</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => toggleNotePinAction(note.id, !note.pinned)}
            aria-pressed={note.pinned}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            className={`rounded p-1.5 hover:bg-muted ${note.pinned ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Pin className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            aria-expanded={editing}
            aria-label="Edit note"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
          >
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
          </button>
          <ConfirmIconAction
            action={() => toggleNoteArchiveAction(note.id, !note.archivedAt)}
            title={note.archivedAt ? 'Restore this note?' : 'Archive this note?'}
            description={note.archivedAt ? 'It will appear in your normal list again.' : 'It moves to the archived tab.'}
            confirmLabel={note.archivedAt ? 'Restore' : 'Archive'}
            label={note.archivedAt ? 'Restore note' : 'Archive note'}
            icon={<Archive className="h-4 w-4" aria-hidden="true" />}
          />
          <ConfirmIconAction
            action={() => deleteNoteAction(note.id)}
            title="Delete this note?"
            description={`“${note.title}” will be permanently removed.`}
            confirmLabel="Delete note"
            label="Delete note"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>

      {editing ? (
        <ServerForm
          action={(formData) => updateNoteAction(note.id, formData)}
          successMessage="Note updated."
          onSuccess={() => setEditing(false)}
          ariaLabel="Edit note"
          className="mt-3 space-y-3"
        >
          {({ errors, pending }) => (
            <>
              <Field label="Title" name="title" error={errors.title} required>
                {(props) => <Input {...props} name="title" defaultValue={note.title} />}
              </Field>
              <Field label="Note" name="body" error={errors.body}>
                {(props) => <Textarea {...props} name="body" defaultValue={note.body} rows={5} />}
              </Field>
              <div className="flex gap-2">
                <SubmitButton pending={pending}>Save</SubmitButton>
                <button type="button" className="h-10 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </ServerForm>
      ) : (
        <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {note.body.slice(0, 400) || <span className="italic">Empty note</span>}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {note.tags
          ? note.tags
              .split(',')
              .filter(Boolean)
              .map((tag) => (
                <Badge key={tag} tone="primary">
                  {tag}
                </Badge>
              ))
          : null}
        <span className="ml-auto text-xs text-muted-foreground">{formatRelative(note.updatedAt)}</span>
      </div>
    </article>
  );
}
