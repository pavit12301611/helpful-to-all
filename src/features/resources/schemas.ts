import { z } from 'zod';
import { localResourceCategorySchema } from '@/lib/enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const resourceSchema = z.object({
  name: z.string().trim().min(2, 'Add the place name.').max(120),
  category: localResourceCategorySchema,
  description: optionalText(600),
  address: optionalText(200),
  city: z.string().trim().min(1, 'Add a city so people can find it.').max(80),
  country: optionalText(80),
  phone: optionalText(40),
  website: z.string().trim().url('That does not look like a link.').max(300).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  openingHours: optionalText(400),
  accessibility: z.enum(['step_free', 'steps', 'unknown']).optional(),
  priceLevel: z.coerce.number().int().min(0).max(4).optional(),
});
export type ResourceInput = z.input<typeof resourceSchema>;

export const resourceDirectoryFilters = z.object({
  q: z.string().trim().max(80).optional(),
  category: localResourceCategorySchema.optional(),
  city: optionalText(80),
  accessibility: z.enum(['step_free', 'steps', 'unknown']).optional(),
  priceLevel: z.coerce.number().int().min(0).max(4).optional(),
  verified: z.enum(['yes', 'no']).optional(),
  sort: z.enum(['recent', 'name', 'rating']).default('recent'),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type ResourceDirectoryFilters = z.infer<typeof resourceDirectoryFilters>;

export const DIRECTORY_PAGE_SIZE = 12;

export const resourceReviewSchema = z.object({
  resourceId: z.string().min(1),
  rating: z.coerce.number().int().min(1, 'Pick a rating from 1 to 5.').max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type ResourceReviewInput = z.input<typeof resourceReviewSchema>;

export const editSuggestionSchema = z.object({
  resourceId: z.string().min(1),
  field: z.enum(['name', 'address', 'phone', 'openingHours', 'website', 'accessibility', 'priceLevel', 'category']),
  proposedValue: z.string().trim().min(1, 'Add the corrected value.').max(300),
  note: optionalText(300),
});
export type EditSuggestionInput = z.input<typeof editSuggestionSchema>;

export const ACCESSIBILITY_LABELS: Record<string, string> = {
  step_free: 'Step free access',
  steps: 'Has steps',
  unknown: 'Accessibility unknown',
};

export function parseOpeningHours(raw: string | null): { day: string; value: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, string[] | null>;
    return Object.entries(parsed).map(([day, value]) => ({
      day,
      value: Array.isArray(value) ? `${value[0]} - ${value[1]}` : 'Closed',
    }));
  } catch {
    // Plain text hours are also allowed - show them as a single line.
    return [{ day: 'Hours', value: raw }];
  }
}
