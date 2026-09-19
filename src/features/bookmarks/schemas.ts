import { z } from 'zod';

export const bookmarkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(4, 'Enter a link.')
    .max(600)
    .url('Enter a valid URL, including https://'),
  title: z.string().trim().min(1, 'Give it a title.').max(160),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  category: z.string().trim().max(40).optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export type BookmarkInput = z.input<typeof bookmarkSchema>;

export const bookmarkFilters = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  favorites: z.enum(['all', 'favorites']).default('all'),
});
export type BookmarkFilters = z.infer<typeof bookmarkFilters>;
