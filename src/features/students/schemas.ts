import { z } from 'zod';
import { difficultySchema, educationLevelSchema, listingKindSchema } from '@/lib/enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const studentResourceSchema = z.object({
  title: z.string().trim().min(3, 'Give the resource a title.').max(140),
  description: optionalText(1000),
  subjectId: optionalText(40),
  level: educationLevelSchema.optional(),
  language: z.string().trim().min(2).max(8).optional().or(z.literal('')),
  difficulty: difficultySchema.optional(),
  fileType: z.enum(['pdf', 'notes', 'video', 'link', 'other']).optional(),
  institution: optionalText(120),
  tags: optionalText(200),
  url: z.string().trim().url('That does not look like a link.').max(400).optional().or(z.literal('')),
});
export type StudentResourceInput = z.input<typeof studentResourceSchema>;

export const resourceFilters = z.object({
  q: z.string().trim().max(80).optional(),
  subject: optionalText(40),
  level: educationLevelSchema.optional(),
  language: optionalText(8),
  difficulty: difficultySchema.optional(),
  fileType: z.enum(['pdf', 'notes', 'video', 'link', 'other']).optional(),
  institution: optionalText(120),
  tag: optionalText(40),
  sort: z.enum(['recent', 'popular', 'title']).default('recent'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type ResourceFilters = z.infer<typeof resourceFilters>;

export const RESOURCE_PAGE_SIZE = 12;

export const flashcardDeckSchema = z.object({
  name: z.string().trim().min(2, 'Name the deck.').max(80),
  description: optionalText(300),
  subjectId: optionalText(40),
});
export type FlashcardDeckInput = z.input<typeof flashcardDeckSchema>;

export const flashcardSchema = z.object({
  deckId: z.string().min(1),
  front: z.string().trim().min(1, 'Add the question or term.').max(400),
  back: z.string().trim().min(1, 'Add the answer.').max(1000),
  hint: optionalText(200),
});
export type FlashcardInput = z.input<typeof flashcardSchema>;

export const assignmentSchema = z.object({
  title: z.string().trim().min(2, 'Add a title.').max(140),
  description: optionalText(600),
  subjectId: optionalText(40),
  dueAt: z.string().trim().min(1, 'When is it due?').max(40),
  status: z.enum(['pending', 'in_progress', 'submitted', 'graded']).optional(),
  weightPct: z.coerce.number().min(0).max(100).optional(),
  scorePct: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
});
export type AssignmentInput = z.input<typeof assignmentSchema>;

export const examSchema = z.object({
  title: z.string().trim().min(2, 'Add a title.').max(140),
  subjectId: optionalText(40),
  examAt: z.string().trim().min(1, 'When is the exam?').max(40),
  location: optionalText(140),
  notes: optionalText(600),
});
export type ExamInput = z.input<typeof examSchema>;

export const timetableSlotSchema = z.object({
  title: z.string().trim().min(1, 'Add a subject or class name.').max(120),
  subjectId: optionalText(40),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM.'),
  endTime: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Use HH:MM.'),
  room: optionalText(80),
});
export type TimetableSlotInput = z.input<typeof timetableSlotSchema>;

export const courseGradeSchema = z.object({
  title: z.string().trim().min(1, 'Add the course name.').max(120),
  credits: z.coerce.number().min(0).max(30),
  gradePoint: z.coerce.number().min(0).max(10),
  term: optionalText(40),
});
export type CourseGradeInput = z.input<typeof courseGradeSchema>;

export const listingFilters = z.object({
  kind: listingKindSchema.optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const LISTING_PAGE_SIZE = 10;

/** GPA uses the 10 point scale common in Indian universities. */
export function computeGpa(grades: { credits: number; gradePoint: number }[]) {
  const totalCredits = grades.reduce((sum, grade) => sum + grade.credits, 0);
  if (totalCredits === 0) return { gpa: 0, credits: 0, percentage: 0 };
  const points = grades.reduce((sum, grade) => sum + grade.credits * grade.gradePoint, 0);
  const gpa = points / totalCredits;
  return { gpa: Number(gpa.toFixed(2)), credits: totalCredits, percentage: Number((gpa * 9.5).toFixed(2)) };
}
