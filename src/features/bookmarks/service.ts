import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { toCsv } from '@/lib/utils';
import { contains } from '@/lib/db-config';
import type { BookmarkFilters, BookmarkInput } from './schemas';

/** Saved links. Private to the owner; used by the "Saved resources" widget. */

export async function listBookmarks(userId: string, filters: BookmarkFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { ownerId: userId, archivedAt: null };
  if (filters.q) {
    where.OR = [{ title: contains(filters.q) }, { url: contains(filters.q) }, { description: contains(filters.q) }];
  }
  if (filters.category) where.category = filters.category;
  if (filters.favorites === 'favorites') where.favorite = true;

  const [bookmarks, categories] = await Promise.all([
    db.bookmark.findMany({ where, orderBy: [{ favorite: 'desc' }, { createdAt: 'desc' }], take: 100 }),
    db.bookmark.findMany({ where: { ownerId: userId, category: { not: null } }, select: { category: true } }),
  ]);

  const uniqueCategories = Array.from(
    new Set(categories.map((item) => item.category).filter((value): value is string => Boolean(value))),
  ).sort();

  return { bookmarks, categories: uniqueCategories };
}

export async function createBookmark(userId: string, input: BookmarkInput) {
  const db = await getDb();
  return db.bookmark.create({
    data: {
      ownerId: userId,
      url: input.url,
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      tags: toCsv(input.tags ?? []),
    },
  });
}

async function assertOwner(userId: string, bookmarkId: string) {
  const db = await getDb();
  const bookmark = await db.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark) throw new NotFoundError('Bookmark not found.');
  if (bookmark.ownerId !== userId) throw new ForbiddenError('This bookmark belongs to someone else.');
  return bookmark;
}

export async function updateBookmark(userId: string, bookmarkId: string, input: BookmarkInput) {
  await assertOwner(userId, bookmarkId);
  const db = await getDb();
  return db.bookmark.update({
    where: { id: bookmarkId },
    data: {
      url: input.url,
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      tags: toCsv(input.tags ?? []),
    },
  });
}

export async function toggleBookmarkFavorite(userId: string, bookmarkId: string, favorite: boolean) {
  await assertOwner(userId, bookmarkId);
  const db = await getDb();
  return db.bookmark.update({ where: { id: bookmarkId }, data: { favorite } });
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  await assertOwner(userId, bookmarkId);
  const db = await getDb();
  await db.bookmark.update({ where: { id: bookmarkId }, data: { archivedAt: new Date() } });
}
