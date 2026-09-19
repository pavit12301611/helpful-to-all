import { z } from 'zod';
import { recurrenceSchema } from '@/lib/enums';

export const calendarEventSchema = z.object({
  title: z.string().trim().min(1, 'Give the event a title.').max(140),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  location: z.string().trim().max(160).optional().or(z.literal('')),
  startsAt: z.string().trim().min(1, 'When does it start?').max(40),
  endsAt: z.string().trim().max(40).optional().or(z.literal('')),
  allDay: z.boolean().optional(),
  reminderMinutes: z.coerce.number().int().min(0).max(100_000).optional(),
  recurrence: recurrenceSchema.default('none'),
  groupId: z.string().trim().max(40).optional().or(z.literal('')),
  tripId: z.string().trim().max(40).optional().or(z.literal('')),
});
export type CalendarEventInput = z.input<typeof calendarEventSchema>;

export const calendarViewSchema = z.object({
  view: z.enum(['day', 'week', 'month']).default('month'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .optional(),
});
export type CalendarView = z.infer<typeof calendarViewSchema>;
