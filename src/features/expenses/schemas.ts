import { z } from 'zod';
import { expenseCategorySchema } from '@/lib/enums';

export const expenseSchema = z.object({
  description: z.string().trim().max(200).optional().or(z.literal('')),
  category: expenseCategorySchema.default('other'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter an amount.' })
    .positive('Enter an amount greater than zero.')
    .max(100_000_000, 'That amount is too large.'),
  currency: z.string().trim().length(3, 'Use a 3 letter currency code.').default('USD'),
  occurredOn: z.string().trim().max(40).optional().or(z.literal('')),
  groupId: z.string().trim().max(40).optional().or(z.literal('')),
  tripId: z.string().trim().max(40).optional().or(z.literal('')),
  businessId: z.string().trim().max(40).optional().or(z.literal('')),
  isShared: z.boolean().optional(),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const expenseFilters = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use the YYYY-MM format.')
    .optional(),
  category: expenseCategorySchema.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});
export type ExpenseFilters = z.infer<typeof expenseFilters>;

export const EXPENSE_PAGE_SIZE = 25;

/**
 * Expense forms submit a share target as a prefixed value (`group:<id>` /
 * `trip:<id>`). Splitting it here keeps a trip id from being written into
 * `groupId`, which would silently skip trip splits. Lives in schemas.ts (not
 * actions.ts) because actions.ts is a `"use server"` module and must only
 * export async functions.
 */
export function splitShareTarget(value: FormDataEntryValue | null): { groupId: string; tripId: string } {
  const raw = String(value ?? '');
  if (raw.startsWith('group:')) return { groupId: raw.slice('group:'.length), tripId: '' };
  if (raw.startsWith('trip:')) return { groupId: '', tripId: raw.slice('trip:'.length) };
  return { groupId: raw, tripId: '' };
}
