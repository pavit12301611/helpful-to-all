import { z } from 'zod';
import { reportReasonSchema, targetTypeSchema } from '@/lib/enums';

/** Shared social primitives: comments, votes, saving and reporting. */

export const commentSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  body: z.string().trim().min(1, 'Write a comment first.').max(2000, 'Comments can be at most 2,000 characters.'),
  parentId: z.string().trim().max(40).optional().or(z.literal('')),
});
export type CommentInput = z.input<typeof commentSchema>;

export const voteSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]).default(1),
});

export const reportSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type ReportInput = z.input<typeof reportSchema>;

export const saveSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

export const blockSchema = z.object({
  blockedId: z.string().min(1),
  reason: z.string().trim().max(200).optional().or(z.literal('')),
});
