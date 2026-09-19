import { z } from 'zod';
import { localeSchema, themeSchema, userTypeSchema } from '@/lib/enums';

/**
 * Validation for authentication and profile forms.
 * Every schema is used both by the server action and (for instant feedback) by
 * the client form, so the rules can never drift apart.
 */

const trimmed = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Please use at least ${min} characters.`)
    .max(max, `Please keep this under ${max} characters.`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email address.')
  .max(180)
  .email('Enter a valid email address.');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Usernames need at least 3 characters.')
  .max(24, 'Usernames can be at most 24 characters.')
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'Use lowercase letters, numbers, dot, dash or underscore.');

export const passwordSchema = z
  .string()
  .min(10, 'Passwords need at least 10 characters.')
  .max(200, 'That password is too long.');

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  displayName: trimmed(2, 60),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  userType: userTypeSchema.optional(),
  acceptGuidelines: z
    .boolean()
    .refine((value) => value === true, 'Please accept the community guidelines to continue.'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  displayName: trimmed(2, 60),
  bio: z.string().trim().max(600).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  website: z
    .string()
    .trim()
    .max(200)
    .url('Enter a valid URL (including https://).')
    .optional()
    .or(z.literal('')),
  availability: z.string().trim().max(120).optional().or(z.literal('')),
  userTypes: z.array(userTypeSchema).max(6).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const privacySchema = z.object({
  profileVisibility: z.enum(['public', 'community', 'private']),
  showLocation: z.boolean(),
  showOnlineStatus: z.boolean(),
  showActivity: z.boolean(),
  searchable: z.boolean(),
  allowMessages: z.enum(['everyone', 'contacts', 'none']),
  showGroupMembership: z.boolean(),
});
export type PrivacyInput = z.infer<typeof privacySchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm.'),
  confirmText: z
    .string()
    .trim()
    .refine((value) => value.toUpperCase() === 'DELETE', 'Type DELETE to confirm.'),
});

export const preferencesSchema = z.object({
  locale: localeSchema,
  theme: themeSchema,
});
