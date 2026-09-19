import { z } from 'zod';
import { HABIT_FREQUENCY } from '@/lib/enums';

export const habitSchema = z.object({
  title: z.string().trim().min(1, 'Give the habit a name.').max(80),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  frequency: z.enum(HABIT_FREQUENCY).default('daily'),
  targetCount: z.coerce.number().int().min(1).max(20).default(1),
});
export type HabitInput = z.input<typeof habitSchema>;
