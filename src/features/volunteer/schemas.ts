import { z } from 'zod';
import { campaignKindSchema, volunteerCauseSchema } from '@/lib/enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const opportunitySchema = z.object({
  title: z.string().trim().min(4, 'Give the opportunity a clear title.').max(140),
  description: z.string().trim().min(20, 'Describe what volunteers will actually do.').max(2000),
  cause: volunteerCauseSchema,
  organizationName: optionalText(120),
  skillsNeeded: optionalText(300),
  itemsNeeded: optionalText(300),
  city: optionalText(80),
  country: optionalText(80),
  startsAt: optionalText(40),
  deadline: optionalText(40),
  volunteersNeeded: z.coerce.number().int().min(1).max(1000).default(1),
});
export type OpportunityInput = z.input<typeof opportunitySchema>;

export const campaignSchema = z.object({
  title: z.string().trim().min(4, 'Give the campaign a clear title.').max(140),
  description: z.string().trim().min(20, 'Explain what the donations are for and how they will be used.').max(2000),
  cause: volunteerCauseSchema,
  kind: campaignKindSchema.default('goods'),
  goalCents: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  itemsNeeded: optionalText(400),
  city: optionalText(80),
  country: optionalText(80),
  contactEmail: z.string().trim().email('Enter a valid contact email.').max(160).optional().or(z.literal('')),
  deadline: optionalText(40),
});
export type CampaignInput = z.input<typeof campaignSchema>;

export const campaignUpdateSchema = z.object({
  campaignId: z.string().min(1),
  title: z.string().trim().min(3, 'Add a title.').max(140),
  body: z.string().trim().min(5, 'Tell donors what happened.').max(2000),
});
export type CampaignUpdateInput = z.input<typeof campaignUpdateSchema>;

export const signupSchema = z.object({
  opportunityId: z.string().min(1),
  message: optionalText(400),
});
export type SignupInput = z.input<typeof signupSchema>;

export const volunteerFilters = z.object({
  q: z.string().trim().max(80).optional(),
  cause: volunteerCauseSchema.optional(),
  city: optionalText(80),
  verified: z.enum(['yes', 'no']).optional(),
  upcoming: z.enum(['yes']).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type VolunteerFilters = z.infer<typeof volunteerFilters>;

export const campaignFilters = z.object({
  q: z.string().trim().max(80).optional(),
  cause: volunteerCauseSchema.optional(),
  kind: campaignKindSchema.optional(),
  city: optionalText(80),
  verified: z.enum(['yes', 'no']).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type CampaignFilters = z.infer<typeof campaignFilters>;

export const VOLUNTEER_PAGE_SIZE = 10;
