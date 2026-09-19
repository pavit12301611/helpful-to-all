import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const tripSchema = z.object({
  title: z.string().trim().min(2, 'Name the trip.').max(100),
  description: optionalText(600),
  destination: optionalText(120),
  startsAt: optionalText(40),
  endsAt: optionalText(40),
  budgetCents: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  currency: z.string().trim().min(3).max(3).optional().or(z.literal('')),
  visibility: z.enum(['private', 'members']).default('private'),
  accommodationNotes: optionalText(600),
  transportNotes: optionalText(600),
  importantContacts: optionalText(600),
});
export type TripInput = z.input<typeof tripSchema>;

export const itineraryItemSchema = z.object({
  tripId: z.string().min(1),
  title: z.string().trim().min(2, 'What is happening?').max(140),
  description: optionalText(600),
  location: optionalText(160),
  startsAt: optionalText(40),
  endsAt: optionalText(40),
  costCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
});
export type ItineraryItemInput = z.input<typeof itineraryItemSchema>;

export const packingItemSchema = z.object({
  tripId: z.string().min(1),
  label: z.string().trim().min(1, 'Add an item.').max(100),
  category: optionalText(40),
});
export type PackingItemInput = z.input<typeof packingItemSchema>;

export const tripExpenseSchema = z.object({
  tripId: z.string().min(1),
  description: z.string().trim().min(2, 'What did you pay for?').max(160),
  amountCents: z.coerce.number().int().min(1, 'Add an amount.').max(1_000_000_000),
  category: z.enum(['food', 'transport', 'housing', 'utilities', 'health', 'education', 'entertainment', 'shopping', 'travel', 'business', 'other']).default('travel'),
  occurredOn: optionalText(40),
  splitWith: z.string().trim().max(400).optional().or(z.literal('')),
});
export type TripExpenseInput = z.input<typeof tripExpenseSchema>;

export const tripInviteSchema = z.object({
  tripId: z.string().min(1),
  username: z.string().trim().min(2, 'Add a username.').max(40),
});
export type TripInviteInput = z.input<typeof tripInviteSchema>;

export const PACKING_CATEGORIES = ['documents', 'clothing', 'toiletries', 'electronics', 'medicine', 'money', 'other'];

export const tripPollSchema = z.object({
  tripId: z.string().min(1),
  question: z.string().trim().min(3, 'Ask a question.').max(200),
  options: z.array(z.string().trim().min(1)).min(2, 'Add at least two options.').max(8),
  closesAt: optionalText(40),
});
export type TripPollInput = z.input<typeof tripPollSchema>;

export const tripVoteSchema = z.object({
  tripId: z.string().min(1),
  pollId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).min(1, 'Pick an option.').max(1),
});
export type TripVoteInput = z.input<typeof tripVoteSchema>;
