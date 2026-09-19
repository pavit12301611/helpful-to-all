'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { noteSchema } from './schemas';
import { createNote, deleteNote, setNoteArchived, setNotePinned, updateNote } from './service';

function readNote(formData: FormData) {
  return {
    title: formData.get('title'),
    body: formData.get('body') ?? '',
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export async function createNoteAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({ schema: noteSchema, input: readNote(formData), successMessage: 'Note saved.', handler: (data) => createNote(user.id, data) });
  if (result.ok) revalidatePath('/notes');
  return result;
}

export async function updateNoteAction(noteId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: noteSchema,
    input: readNote(formData),
    successMessage: 'Note updated.',
    handler: (data) => updateNote(user.id, noteId, data),
  });
  if (result.ok) revalidatePath('/notes');
  return result;
}

export async function toggleNotePinAction(noteId: string, pinned: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => setNotePinned(user.id, noteId, pinned) });
  if (result.ok) revalidatePath('/notes');
  return result;
}

export async function toggleNoteArchiveAction(noteId: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => setNoteArchived(user.id, noteId, archived) });
  if (result.ok) revalidatePath('/notes');
  return result;
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Note deleted.', handler: () => deleteNote(user.id, noteId) });
  if (result.ok) revalidatePath('/notes');
  return result;
}
