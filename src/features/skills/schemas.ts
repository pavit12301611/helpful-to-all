import { z } from 'zod';
import { skillFormatSchema, skillLevelSchema } from '@/lib/enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const skillOfferSchema = z.object({
  skillId: z.string().min(1, 'Choose a skill.'),
  format: skillFormatSchema.default('both'),
  level: skillLevelSchema.default('intermediate'),
  description: z.string().trim().min(10, 'Explain what you teach and how.').max(800),
  availability: optionalText(200),
  language: optionalText(40),
  city: optionalText(80),
  priceMode: z.enum(['free', 'exchange', 'paid']).default('free'),
  priceCents: z.coerce.number().int().min(0).max(10_000_000).optional(),
  radiusKm: z.coerce.number().int().min(0).max(200).optional(),
});
export type SkillOfferInput = z.input<typeof skillOfferSchema>;

export const skillRequestSchema = z.object({
  skillId: z.string().min(1, 'Choose a skill.'),
  format: skillFormatSchema.default('both'),
  level: skillLevelSchema.default('beginner'),
  description: z.string().trim().min(10, 'Say what you want to learn and when.').max(800),
  availability: optionalText(200),
  language: optionalText(40),
  city: optionalText(80),
  radiusKm: z.coerce.number().int().min(0).max(200).optional(),
});
export type SkillRequestInput = z.input<typeof skillRequestSchema>;

export const skillFilters = z.object({
  q: z.string().trim().max(60).optional(),
  skill: optionalText(40),
  format: skillFormatSchema.optional(),
  city: optionalText(80),
  priceMode: z.enum(['free', 'exchange', 'paid']).optional(),
  kind: z.enum(['teach', 'learn']).default('teach'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type SkillFilters = z.infer<typeof skillFilters>;

export const SKILL_PAGE_SIZE = 12;

export const connectionSchema = z.object({
  offerId: optionalText(40),
  requestId: optionalText(40),
  message: z.string().trim().min(5, 'Add a short message.').max(500),
});
export type ConnectionInput = z.input<typeof connectionSchema>;

export const meetingSchema = z.object({
  connectionId: z.string().min(1),
  meetingAt: z.string().trim().min(1, 'Pick a time.'),
  meetingNote: optionalText(400),
  status: z.enum(['pending', 'accepted', 'declined', 'cancelled', 'completed']).default('accepted'),
});
export type MeetingInput = z.input<typeof meetingSchema>;

export const skillReviewSchema = z.object({
  connectionId: optionalText(40),
  revieweeId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional().or(z.literal('')),
});
export type SkillReviewInput = z.input<typeof skillReviewSchema>;

export const skillSchema = z.object({
  name: z.string().trim().min(2, 'Name the skill.').max(60),
});

export const PRICE_MODE_LABELS: Record<string, string> = {
  free: 'Free',
  exchange: 'Skill exchange',
  paid: 'Paid',
};
