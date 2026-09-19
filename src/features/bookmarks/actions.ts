'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { bookmarkSchema } from './schemas';
import { createBookmark, deleteBookmark, toggleBookmarkFavorite, updateBookmark } from './service';

function readBookmark(formData: FormData) {
  return {
    url: formData.get('url'),
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    category: formData.get('category') ?? '',
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export async function createBookmarkAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({ schema: bookmarkSchema, input: readBookmark(formData), successMessage: 'Link saved.', handler: (data) => createBookmark(user.id, data) });
  if (result.ok) revalidatePath('/bookmarks');
  return result;
}

export async function updateBookmarkAction(bookmarkId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ schema: bookmarkSchema, input: readBookmark(formData), successMessage: 'Link updated.', handler: (data) => updateBookmark(user.id, bookmarkId, data) });
  if (result.ok) revalidatePath('/bookmarks');
  return result;
}

export async function toggleBookmarkFavoriteAction(bookmarkId: string, favorite: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => toggleBookmarkFavorite(user.id, bookmarkId, favorite) });
  if (result.ok) revalidatePath('/bookmarks');
  return result;
}

export async function deleteBookmarkAction(bookmarkId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Link removed.', handler: () => deleteBookmark(user.id, bookmarkId) });
  if (result.ok) revalidatePath('/bookmarks');
  return result;
}
