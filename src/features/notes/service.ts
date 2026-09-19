import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { toCsv } from '@/lib/utils';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import type { NoteFilters, NoteInput } from './schemas';

/**
 * Notes are private by default: every query filters on ownerId, and the search
 * index never includes them for other members.
 */

export async function listNotes(userId: string, filters: NoteFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = {
    ownerId: userId,
    deletedAt: null,
    archivedAt: filters.view === 'archived' ? { not: null } : filters.view === 'all' ? undefined : null,
    pinned: filters.view === 'pinned' ? true : undefined,
  };
  if (filters.q) {
    where.OR = [{ title: contains(filters.q) }, { body: contains(filters.q) }];
  }
  if (filters.tag) where.tags = { contains: filters.tag };

  const notes = await db.note.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    take: 60,
  });
  return notes;
}

export async function getNote(userId: string, noteId: string) {
  const db = await getDb();
  const note = await db.note.findFirst({ where: { id: noteId, ownerId: userId, deletedAt: null } });
  if (!note) throw new NotFoundError('That note does not exist.');
  return note;
}

export async function createNote(userId: string, input: NoteInput) {
  const db = await getDb();
  const note = await db.note.create({
    data: {
      ownerId: userId,
      title: input.title,
      body: input.body ?? '',
      tags: toCsv(input.tags ?? []),
    },
  });
  await logActivity({ userId, type: 'note', description: `Created note “${input.title}”`, targetType: 'note', targetId: note.id });
  return note;
}

async function assertOwner(userId: string, noteId: string) {
  const db = await getDb();
  const note = await db.note.findFirst({ where: { id: noteId, deletedAt: null } });
  if (!note) throw new NotFoundError('Note not found.');
  if (note.ownerId !== userId) throw new ForbiddenError('This note belongs to someone else.');
  return note;
}

export async function updateNote(userId: string, noteId: string, input: NoteInput) {
  await assertOwner(userId, noteId);
  const db = await getDb();
  return db.note.update({
    where: { id: noteId },
    data: { title: input.title, body: input.body ?? '', tags: toCsv(input.tags ?? []) },
  });
}

export async function setNotePinned(userId: string, noteId: string, pinned: boolean) {
  await assertOwner(userId, noteId);
  const db = await getDb();
  return db.note.update({ where: { id: noteId }, data: { pinned } });
}

export async function setNoteArchived(userId: string, noteId: string, archived: boolean) {
  await assertOwner(userId, noteId);
  const db = await getDb();
  return db.note.update({ where: { id: noteId }, data: { archivedAt: archived ? new Date() : null } });
}

export async function deleteNote(userId: string, noteId: string) {
  const note = await assertOwner(userId, noteId);
  const db = await getDb();
  await db.note.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  await logActivity({ userId, type: 'note', description: `Deleted note “${note.title}”` });
}
