import { z } from 'zod';
import { bloodGroupSchema, emergencyServiceSchema } from '@/lib/enums';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const emergencyNumberSchema = z.object({
  country: z.string().trim().min(2, 'Add a country.').max(80),
  region: optionalText(80),
  service: emergencyServiceSchema,
  number: z.string().trim().min(2, 'Add the number.').max(30),
  notes: optionalText(300),
  source: optionalText(200),
});
export type EmergencyNumberInput = z.input<typeof emergencyNumberSchema>;

export const bloodDonorSchema = z.object({
  bloodGroup: bloodGroupSchema,
  city: z.string().trim().min(1, 'Add a city so donors can be found.').max(80),
  country: optionalText(80),
  lastDonatedAt: optionalText(40),
  contactPreference: z.enum(['message', 'email', 'phone']).default('message'),
  available: z.enum(['on', 'off']).default('on'),
});
export type BloodDonorInput = z.input<typeof bloodDonorSchema>;

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2, 'Add a name.').max(80),
  relation: optionalText(40),
  phone: z.string().trim().min(4, 'Add a phone number.').max(30),
  isPrimary: z.enum(['on', 'off']).optional(),
});
export type EmergencyContactInput = z.input<typeof emergencyContactSchema>;

export const missingPersonSchema = z.object({
  name: z.string().trim().min(2, 'Add the person\'s name.').max(100),
  age: z.coerce.number().int().min(0).max(130).optional(),
  lastSeenAt: optionalText(40),
  lastSeenLocation: optionalText(200),
  description: z.string().trim().min(20, 'Describe what happened and what they were wearing.').max(1500),
  contactNote: optionalText(300),
});
export type MissingPersonInput = z.input<typeof missingPersonSchema>;

export const guideSchema = z.object({
  slug: z.string().trim().min(3).max(80),
  kind: z.enum(['first_aid', 'disaster', 'health', 'safety', 'other']).default('safety'),
  title: z.string().trim().min(4).max(140),
  body: z.string().trim().min(20).max(8000),
  locale: z.string().trim().min(2).max(8).optional().or(z.literal('')),
  published: z.enum(['on', 'off']).optional(),
});
export type GuideInput = z.input<typeof guideSchema>;

export const safetyFilters = z.object({
  country: optionalText(80),
  service: emergencyServiceSchema.optional(),
  q: z.string().trim().max(60).optional(),
  bloodGroup: bloodGroupSchema.optional(),
  city: optionalText(80),
  kind: z.enum(['first_aid', 'disaster', 'health', 'safety', 'other']).optional(),
  status: z.enum(['searching', 'found', 'closed']).optional(),
});
export type SafetyFilters = z.infer<typeof safetyFilters>;

export const SAFETY_DISCLAIMER =
  'OpenHub is not a replacement for official emergency services. In an emergency, call your local emergency number first. OpenHub never contacts emergency services for you.';
