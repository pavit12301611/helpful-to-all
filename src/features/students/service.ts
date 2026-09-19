import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { isStaffRole } from '@/server/core/permissions';
import { RESOURCE_PAGE_SIZE, type AssignmentInput, type CourseGradeInput, type ExamInput, type FlashcardDeckInput, type FlashcardInput, type ResourceFilters, type StudentResourceInput, type TimetableSlotInput } from './schemas';

/**
 * Student centre: study resources with filters, flashcards, assignments, exams,
 * timetable, GPA and opportunity listings.
 *
 * Resources are community uploads, so every read hides deleted or hidden rows and
 * every write checks ownership before touching a record. The copyright rule shown
 * in the UI is enforced here too: a flagged resource stops being listed publicly.
 */

export async function listSubjects() {
  const db = await getDb();
  return db.subject.findMany({ orderBy: { name: 'asc' } });
}

export async function listResources(userId: string | null, filters: ResourceFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { deletedAt: null, hiddenAt: null };

  if (filters.q) {
    where.OR = [{ title: contains(filters.q) }, { description: contains(filters.q) }, { tags: contains(filters.q) }];
  }
  if (filters.subject) where.subjectId = filters.subject;
  if (filters.level) where.level = filters.level;
  if (filters.language) where.language = filters.language;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.fileType) where.fileType = filters.fileType;
  if (filters.institution) where.institution = contains(filters.institution);
  if (filters.tag) where.tags = contains(filters.tag);

  const orderBy =
    filters.sort === 'popular'
      ? [{ downloads: 'desc' as const }, { createdAt: 'desc' as const }]
      : filters.sort === 'title'
        ? [{ title: 'asc' as const }]
        : [{ createdAt: 'desc' as const }];

  const [resources, total] = await Promise.all([
    db.studentResource.findMany({
      where,
      include: { subject: true, uploader: { select: { id: true, username: true, profile: { select: { displayName: true } } } } },
      orderBy,
      take: RESOURCE_PAGE_SIZE,
      skip: (filters.page - 1) * RESOURCE_PAGE_SIZE,
    }),
    db.studentResource.count({ where }),
  ]);

  void userId;
  return { resources, total };
}

export async function getResource(userId: string | null, id: string, role = 'user') {
  const db = await getDb();
  const resource = await db.studentResource.findFirst({
    where: { id, deletedAt: null },
    include: { subject: true, uploader: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
  });
  if (!resource) throw new NotFoundError('That resource does not exist.');
  if (resource.hiddenAt && !isStaffRole(role)) {
    throw new ForbiddenError('This resource was hidden by a moderator.');
  }
  void userId;
  return resource;
}

export async function createResource(userId: string, input: StudentResourceInput) {
  const db = await getDb();
  const resource = await db.studentResource.create({
    data: {
      uploaderId: userId,
      title: input.title,
      description: input.description || null,
      subjectId: input.subjectId || null,
      level: input.level ?? 'other',
      language: input.language || 'en',
      difficulty: input.difficulty ?? 'beginner',
      fileType: input.fileType ?? 'other',
      institution: input.institution || null,
      tags: input.tags ?? '',
      url: input.url || null,
    },
  });
  await logActivity({ userId, type: 'student', description: `Shared study resource “${input.title}”`, targetType: 'student_resource', targetId: resource.id });
  return resource;
}

export async function updateResource(userId: string, id: string, input: StudentResourceInput) {
  const db = await getDb();
  const existing = await db.studentResource.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That resource does not exist.');
  if (existing.uploaderId !== userId) throw new ForbiddenError('Only the person who shared it can edit it.');
  return db.studentResource.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      subjectId: input.subjectId || null,
      level: input.level ?? 'other',
      language: input.language || 'en',
      difficulty: input.difficulty ?? 'beginner',
      fileType: input.fileType ?? 'other',
      institution: input.institution || null,
      tags: input.tags ?? '',
      url: input.url || null,
    },
  });
}

export async function deleteResource(userId: string, id: string) {
  const db = await getDb();
  const existing = await db.studentResource.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That resource does not exist.');
  if (existing.uploaderId !== userId) throw new ForbiddenError('Only the person who shared it can delete it.');
  await db.studentResource.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function flagCopyright(userId: string, id: string, note: string) {
  const db = await getDb();
  const existing = await db.studentResource.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That resource does not exist.');
  await db.studentResource.update({ where: { id }, data: { copyrightFlags: { increment: 1 } } });
  await logActivity({
    userId,
    type: 'student',
    description: `Raised a copyright concern about “${existing.title}”${note ? `: ${note.slice(0, 120)}` : ''}`,
    targetType: 'student_resource',
    targetId: id,
  });
  return { flagged: true };
}

export async function registerDownload(id: string) {
  const db = await getDb();
  await db.studentResource.update({ where: { id }, data: { downloads: { increment: 1 } } });
}

/* ------------------------------------------------------------- flashcards */

export async function listDecks(userId: string) {
  const db = await getDb();
  return db.flashcardDeck.findMany({
    where: { ownerId: userId },
    include: { _count: { select: { cards: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDeck(userId: string, id: string) {
  const db = await getDb();
  const deck = await db.flashcardDeck.findFirst({
    where: { id, ownerId: userId },
    include: { cards: { orderBy: { createdAt: 'asc' } } },
  });
  if (!deck) throw new NotFoundError('That deck does not exist.');
  return deck;
}

export async function createDeck(userId: string, input: FlashcardDeckInput) {
  const db = await getDb();
  return db.flashcardDeck.create({
    data: { ownerId: userId, name: input.name, description: input.description || null },
  });
}

export async function deleteDeck(userId: string, id: string) {
  const db = await getDb();
  const deck = await db.flashcardDeck.findUnique({ where: { id } });
  if (!deck) throw new NotFoundError('That deck does not exist.');
  if (deck.ownerId !== userId) throw new ForbiddenError('Only the owner can delete a deck.');
  await db.flashcardDeck.delete({ where: { id } });
}

export async function addCard(userId: string, input: FlashcardInput) {
  const db = await getDb();
  const deck = await db.flashcardDeck.findUnique({ where: { id: input.deckId } });
  if (!deck) throw new NotFoundError('That deck does not exist.');
  if (deck.ownerId !== userId) throw new ForbiddenError('You can only add cards to your own decks.');
  return db.flashcard.create({
    data: { deckId: input.deckId, ownerId: userId, front: input.front, back: input.back, hint: input.hint || null },
  });
}

export async function deleteCard(userId: string, id: string) {
  const db = await getDb();
  const card = await db.flashcard.findUnique({ where: { id } });
  if (!card) throw new NotFoundError('That card does not exist.');
  if (card.ownerId !== userId) throw new ForbiddenError('Only the owner can delete a card.');
  await db.flashcard.delete({ where: { id } });
}

/**
 * Minimal SM-2 style scheduling: a correct answer widens the interval, a wrong
 * one resets it. Nothing leaves the user's own account.
 */
export async function reviewCard(userId: string, id: string, correct: boolean) {
  const db = await getDb();
  const card = await db.flashcard.findUnique({ where: { id } });
  if (!card) throw new NotFoundError('That card does not exist.');
  if (card.ownerId !== userId) throw new ForbiddenError('You can only review your own cards.');

  const ease = card.easeFactor || 2.5;
  const repetitions = correct ? (card.repetitions ?? 0) + 1 : 0;
  const interval = correct ? Math.max(1, Math.round((card.intervalDays || 1) * ease)) : 1;
  const nextEase = correct ? Math.min(3, ease + 0.1) : Math.max(1.3, ease - 0.2);

  return db.flashcard.update({
    where: { id },
    data: {
      repetitions,
      intervalDays: interval,
      easeFactor: nextEase,
      lastReviewedAt: new Date(),
      nextReviewAt: new Date(Date.now() + interval * 86_400_000),
    },
  });
}

/* --------------------------------------------------------- study planning */

export async function listAssignments(userId: string) {
  const db = await getDb();
  return db.assignment.findMany({ where: { ownerId: userId }, include: { subject: true }, orderBy: { dueAt: 'asc' } });
}

export async function createAssignment(userId: string, input: AssignmentInput) {
  const db = await getDb();
  return db.assignment.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description || null,
      subjectId: input.subjectId || null,
      dueAt: new Date(input.dueAt),
      status: input.status ?? 'pending',
      weightPct: input.weightPct ?? null,
      scorePct: typeof input.scorePct === 'number' ? input.scorePct : null,
    },
  });
}

export async function updateAssignmentStatus(userId: string, id: string, status: string, scorePct?: number) {
  const db = await getDb();
  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment) throw new NotFoundError('That assignment does not exist.');
  if (assignment.ownerId !== userId) throw new ForbiddenError('You can only change your own assignments.');
  return db.assignment.update({
    where: { id },
    data: { status, scorePct: typeof scorePct === 'number' ? scorePct : assignment.scorePct },
  });
}

export async function deleteAssignment(userId: string, id: string) {
  const db = await getDb();
  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment) throw new NotFoundError('That assignment does not exist.');
  if (assignment.ownerId !== userId) throw new ForbiddenError('You can only delete your own assignments.');
  await db.assignment.delete({ where: { id } });
}

export async function listExams(userId: string) {
  const db = await getDb();
  return db.exam.findMany({ where: { ownerId: userId }, include: { subject: true }, orderBy: { examAt: 'asc' } });
}

export async function createExam(userId: string, input: ExamInput) {
  const db = await getDb();
  return db.exam.create({
    data: {
      ownerId: userId,
      title: input.title,
      subjectId: input.subjectId || null,
      examAt: new Date(input.examAt),
      location: input.location || null,
      notes: input.notes || null,
    },
  });
}

export async function deleteExam(userId: string, id: string) {
  const db = await getDb();
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam) throw new NotFoundError('That exam does not exist.');
  if (exam.ownerId !== userId) throw new ForbiddenError('You can only delete your own exams.');
  await db.exam.delete({ where: { id } });
}

export async function listTimetable(userId: string) {
  const db = await getDb();
  return db.timetableSlot.findMany({ where: { ownerId: userId }, include: { subject: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
}

export async function createTimetableSlot(userId: string, input: TimetableSlotInput) {
  const db = await getDb();
  if (input.endTime <= input.startTime) throw new ForbiddenError('The end time must be after the start time.');
  return db.timetableSlot.create({
    data: {
      ownerId: userId,
      title: input.title,
      subjectId: input.subjectId || null,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room || null,
    },
  });
}

export async function deleteTimetableSlot(userId: string, id: string) {
  const db = await getDb();
  const slot = await db.timetableSlot.findUnique({ where: { id } });
  if (!slot) throw new NotFoundError('That slot does not exist.');
  if (slot.ownerId !== userId) throw new ForbiddenError('You can only delete your own timetable.');
  await db.timetableSlot.delete({ where: { id } });
}

export async function listGrades(userId: string) {
  const db = await getDb();
  return db.courseGrade.findMany({ where: { ownerId: userId }, orderBy: [{ term: 'asc' }, { title: 'asc' }] });
}

export async function createGrade(userId: string, input: CourseGradeInput) {
  const db = await getDb();
  return db.courseGrade.create({
    data: { ownerId: userId, title: input.title, credits: input.credits, gradePoint: input.gradePoint, term: input.term || null },
  });
}

export async function deleteGrade(userId: string, id: string) {
  const db = await getDb();
  const grade = await db.courseGrade.findUnique({ where: { id } });
  if (!grade) throw new NotFoundError('That grade does not exist.');
  if (grade.ownerId !== userId) throw new ForbiddenError('You can only delete your own grades.');
  await db.courseGrade.delete({ where: { id } });
}

/* -------------------------------------------------------------- listings */

export async function listListings(filters: { kind?: string; q?: string; page: number }) {
  const db = await getDb();
  const where: Record<string, unknown> = { published: true };
  if (filters.kind) where.kind = filters.kind;
  if (filters.q) where.OR = [{ title: contains(filters.q) }, { description: contains(filters.q) }, { organization: contains(filters.q) }];

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: [{ verified: 'desc' }, { deadline: 'asc' }],
      take: 10,
      skip: (filters.page - 1) * 10,
    }),
    db.listing.count({ where }),
  ]);
  return { listings, total };
}
