import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { todayKey, addDays } from '@/lib/utils';
import type { HabitInput } from './schemas';

/**
 * Habit tracking with streaks.
 *
 * Logs are stored per calendar day (YYYY-MM-DD) so streak maths is simple and
 * timezone-safe for the user's own day.
 */

export type HabitWithStats = {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  targetCount: number;
  createdAt: Date;
  todayCount: number;
  streak: number;
  last7: { day: string; count: number }[];
};

export async function listHabits(userId: string): Promise<HabitWithStats[]> {
  const db = await getDb();
  const habits = await db.habit.findMany({
    where: { ownerId: userId, archivedAt: null },
    include: { logs: { orderBy: { day: 'desc' }, take: 120 } },
    orderBy: { createdAt: 'asc' },
  });

  const today = todayKey();
  return habits.map((habit) => {
    const logMap = new Map(habit.logs.map((log) => [log.day, log.count]));
    return {
      id: habit.id,
      title: habit.title,
      description: habit.description,
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      createdAt: habit.createdAt,
      todayCount: logMap.get(today) ?? 0,
      streak: computeStreak(habit.frequency, habit.targetCount, logMap),
      last7: lastSevenDays().map((day) => ({ day, count: logMap.get(day) ?? 0 })),
    };
  });
}

export function lastSevenDays(reference = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => todayKey(addDays(reference, index - 6)));
}

/**
 * Streak = consecutive periods (days or weeks) that met the target,
 * counting today as still-open if it has not been completed yet.
 */
export function computeStreak(frequency: string, targetCount: number, logMap: Map<string, number>): number {
  const met = (day: Date) => (logMap.get(todayKey(day)) ?? 0) >= targetCount;

  if (frequency === 'weekly') {
    let streak = 0;
    const cursor = new Date();
    // Move to the Monday of the current week.
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    // If the current week is not complete yet, start counting from last week.
    const weekMet = (weekStart: Date) => {
      for (let offset = 0; offset < 7; offset += 1) {
        if (met(addDays(weekStart, offset))) return true;
      }
      return false;
    };
    if (!weekMet(cursor)) cursor.setDate(cursor.getDate() - 7);
    while (weekMet(cursor)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
      if (streak > 520) break;
    }
    return streak;
  }

  let streak = 0;
  const cursor = new Date();
  if (!met(cursor)) cursor.setDate(cursor.getDate() - 1);
  while (met(cursor)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}

export async function createHabit(userId: string, input: HabitInput) {
  const db = await getDb();
  return db.habit.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description || null,
      frequency: input.frequency ?? 'daily',
      targetCount: input.targetCount ?? 1,
    },
  });
}

async function assertOwner(userId: string, habitId: string) {
  const db = await getDb();
  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw new NotFoundError('Habit not found.');
  if (habit.ownerId !== userId) throw new ForbiddenError('This habit belongs to someone else.');
  return habit;
}

export async function updateHabit(userId: string, habitId: string, input: HabitInput) {
  await assertOwner(userId, habitId);
  const db = await getDb();
  return db.habit.update({
    where: { id: habitId },
    data: {
      title: input.title,
      description: input.description || null,
      frequency: input.frequency ?? 'daily',
      targetCount: input.targetCount ?? 1,
    },
  });
}

export async function deleteHabit(userId: string, habitId: string) {
  await assertOwner(userId, habitId);
  const db = await getDb();
  await db.habit.delete({ where: { id: habitId } });
}

export async function archiveHabit(userId: string, habitId: string, archived: boolean) {
  await assertOwner(userId, habitId);
  const db = await getDb();
  return db.habit.update({ where: { id: habitId }, data: { archivedAt: archived ? new Date() : null } });
}

/** Toggle today's completion (idempotent per day). */
export async function logHabitToday(userId: string, habitId: string) {
  await assertOwner(userId, habitId);
  const db = await getDb();
  const day = todayKey();
  const existing = await db.habitLog.findUnique({ where: { habitId_day: { habitId, day } } });
  if (existing) {
    await db.habitLog.delete({ where: { id: existing.id } });
    return { logged: false };
  }
  await db.habitLog.create({ data: { habitId, day, count: 1 } });
  return { logged: true };
}
