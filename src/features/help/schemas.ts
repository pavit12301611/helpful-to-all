import { z } from 'zod';
import { helpCategorySchema, helpKindSchema, helpStatusSchema, helpUrgencySchema } from '@/lib/enums';

export const helpRequestSchema = z.object({
  title: z.string().trim().min(6, 'Give your request a clear title (at least 6 characters).').max(140),
  body: z.string().trim().min(20, 'Add at least a couple of sentences so people can help.').max(5000),
  category: helpCategorySchema,
  kind: helpKindSchema.default('question'),
  urgency: helpUrgencySchema.default('normal'),
  visibility: z.enum(['public', 'private']).default('public'),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
});
export type HelpRequestInput = z.input<typeof helpRequestSchema>;

export const helpResponseSchema = z.object({
  requestId: z.string().min(1),
  body: z.string().trim().min(10, 'Write at least 10 characters.').max(4000),
});
export type HelpResponseInput = z.input<typeof helpResponseSchema>;

export const helpFilters = z.object({
  q: z.string().trim().max(80).optional(),
  category: helpCategorySchema.optional(),
  kind: helpKindSchema.optional(),
  status: helpStatusSchema.optional(),
  urgency: helpUrgencySchema.optional(),
  city: z.string().trim().max(80).optional(),
  tab: z.enum(['all', 'open', 'mine', 'offers', 'urgent', 'solved']).default('all'),
  sort: z.enum(['recent', 'helpful', 'urgent']).default('recent'),
  page: z.coerce.number().int().min(1).max(200).default(1),
});
export type HelpFilters = z.infer<typeof helpFilters>;

export const HELP_PAGE_SIZE = 15;
