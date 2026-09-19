'use client';

import { Bookmark, ExternalLink, Star, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/card';
import { createBookmarkAction, deleteBookmarkAction, toggleBookmarkFavoriteAction } from './actions';

export function BookmarkForm() {
  return (
    <ServerForm action={createBookmarkAction} successMessage="Link saved." resetOnSuccess ariaLabel="Save a link" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link" name="url" error={errors.url} required>
              {(props) => <Input {...props} name="url" type="url" placeholder="https://example.com" required />}
            </Field>
            <Field label="Title" name="title" error={errors.title} required>
              {(props) => <Input {...props} name="title" placeholder="Free SQL course" required />}
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" name="category" error={errors.category}>
              {(props) => <Input {...props} name="category" placeholder="learning" />}
            </Field>
            <Field label="Tags" name="tags" error={errors.tags} hint="Comma separated">
              {(props) => <Input {...props} name="tags" placeholder="sql, free" />}
            </Field>
          </div>
          <Field label="Why save it?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} />}
          </Field>
          <SubmitButton pending={pending}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Save link
          </SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function BookmarkRow({
  bookmark,
}: {
  bookmark: {
    id: string;
    url: string;
    title: string;
    description: string | null;
    category: string | null;
    tags: string;
    favorite: boolean;
  };
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <button
        type="button"
        onClick={() => toggleBookmarkFavoriteAction(bookmark.id, !bookmark.favorite)}
        aria-pressed={bookmark.favorite}
        aria-label={bookmark.favorite ? 'Remove from favourites' : 'Add to favourites'}
        className={`mt-0.5 rounded p-1 ${bookmark.favorite ? 'text-warning' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Star className="h-4 w-4" fill={bookmark.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          {bookmark.title}
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </a>
        <p className="truncate text-xs text-muted-foreground">{bookmark.url}</p>
        {bookmark.description ? <p className="mt-1 text-sm text-muted-foreground">{bookmark.description}</p> : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {bookmark.category ? <Badge tone="neutral">{bookmark.category}</Badge> : null}
          {bookmark.tags
            ? bookmark.tags
                .split(',')
                .filter(Boolean)
                .map((tag) => (
                  <Badge key={tag} tone="primary">
                    {tag}
                  </Badge>
                ))
            : null}
        </div>
      </div>

      <ConfirmIconAction
        action={() => deleteBookmarkAction(bookmark.id)}
        title="Remove this link?"
        description={`“${bookmark.title}” will be removed from your saved links.`}
        confirmLabel="Remove"
        label="Remove bookmark"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      />
    </li>
  );
}
