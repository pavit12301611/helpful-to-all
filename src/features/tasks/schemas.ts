import { z } from 'zod';
import { recurrenceSchema, taskPrioritySchema } from '@/lib/enums';

/** Task validation. Shared by the web form, the API route and the tests. */

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(160, 'Titles can be at most 160 characters.'),
  description: optionalText(4000),
  dueAt: optionalText(40),
  priority: taskPrioritySchema.default('medium'),
  recurrence: recurrenceSchema.default('none'),
  labels: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  groupId: optionalText(40),
  assigneeId: optionalText(40),
});
export type TaskInput = z.input<typeof taskSchema>;
export type TaskValues = z.infer<typeof taskSchema>;

export const subtaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, 'Enter a subtask.').max(160),
});

export const taskFilters = z.object({
  view: z.enum(['today', 'upcoming', 'all', 'done', 'archived', 'overdue']).default('today'),
  q: z.string().trim().max(80).optional(),
  priority: taskPrioritySchema.optional(),
  label: z.string().trim().max(30).optional(),
  groupId: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(200).default(1),
});
export type TaskFilters = z.infer<typeof taskFilters>;

export const TASK_PAGE_SIZE = 20;

/** Parse the HTML datetime-local value into a Date, or null when empty. */
export function parseDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
