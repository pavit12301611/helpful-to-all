import { z } from 'zod';

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'Give the note a title.').max(160),
  body: z.string().trim().max(20_000, 'Notes can be at most 20,000 characters.').optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export type NoteInput = z.input<typeof noteSchema>;

export const noteFilters = z.object({
  q: z.string().trim().max(80).optional(),
  view: z.enum(['all', 'pinned', 'archived']).default('all'),
  tag: z.string().trim().max(30).optional(),
});
export type NoteFilters = z.infer<typeof noteFilters>;
