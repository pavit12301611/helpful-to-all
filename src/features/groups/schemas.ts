import { z } from 'zod';
import { groupKindSchema, groupMemberRoleSchema, groupVisibilitySchema } from '@/lib/enums';

export const groupSchema = z.object({
  name: z.string().trim().min(2, 'Give the group a name.').max(60),
  description: z.string().trim().max(600).optional().or(z.literal('')),
  kind: groupKindSchema.default('friends'),
  visibility: groupVisibilitySchema.default('private'),
});
export type GroupInput = z.input<typeof groupSchema>;

export const groupPostSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(1, 'Add a title.').max(120),
  body: z.string().trim().max(5000).optional().or(z.literal('')),
  kind: z.enum(['post', 'announcement', 'poll']).default('post'),
});
export type GroupPostInput = z.input<typeof groupPostSchema>;

export const pollSchema = z.object({
  groupId: z.string().min(1),
  question: z.string().trim().min(3, 'Ask a clear question.').max(160),
  options: z.array(z.string().trim().min(1).max(60)).min(2, 'Add at least two options.').max(8),
  multi: z.boolean().optional(),
  closesAt: z.string().trim().max(40).optional().or(z.literal('')),
});
export type PollInput = z.input<typeof pollSchema>;

export const shoppingItemSchema = z.object({
  groupId: z.string().min(1),
  label: z.string().trim().min(1, 'What do you need?').max(80),
  quantity: z.string().trim().max(40).optional().or(z.literal('')),
});

export const inviteSchema = z.object({
  groupId: z.string().min(1),
  email: z.string().trim().toLowerCase().email('Enter a valid email.').optional().or(z.literal('')),
  message: z.string().trim().max(200).optional().or(z.literal('')),
  role: groupMemberRoleSchema.default('member'),
});
export type InviteInput = z.input<typeof inviteSchema>;

export const groupFilters = z.object({
  q: z.string().trim().max(60).optional(),
  kind: groupKindSchema.optional(),
  tab: z.enum(['mine', 'public', 'discover']).default('mine'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type GroupFilters = z.infer<typeof groupFilters>;

export const GROUP_PAGE_SIZE = 12;
