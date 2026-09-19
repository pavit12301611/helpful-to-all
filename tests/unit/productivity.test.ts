import { describe, expect, it } from 'vitest';
import { computeStreak, lastSevenDays } from '@/features/habits/service';
import { nextRecurrenceDate } from '@/features/tasks/service';
import { viewRange } from '@/features/calendar/service';

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

describe('lastSevenDays', () => {
  it('ends on the reference day and covers a week', () => {
    const reference = new Date('2026-03-10T12:00:00.000Z');
    const days = lastSevenDays(reference);
    expect(days).toHaveLength(7);
    expect(days[days.length - 1]).toBe(dayKey(reference));
    expect(days[0]).toBe(dayKey(new Date('2026-03-04T12:00:00.000Z')));
  });
});

describe('computeStreak', () => {
  it('counts consecutive days that met the target', () => {
    const today = new Date();
    const logs = new Map<string, number>();
    for (let offset = 0; offset < 4; offset += 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - offset);
      logs.set(dayKey(day), 2);
    }
    expect(computeStreak('daily', 2, logs)).toBe(4);
  });

  it('breaks when a day is missed', () => {
    const today = new Date();
    const logs = new Map<string, number>();
    logs.set(dayKey(today), 1);
    const gap = new Date(today);
    gap.setDate(gap.getDate() - 2);
    logs.set(dayKey(gap), 1);
    expect(computeStreak('daily', 1, logs)).toBe(1);
  });

  it('does not count days below the target', () => {
    const today = new Date();
    const logs = new Map<string, number>([[dayKey(today), 1]]);
    expect(computeStreak('daily', 3, logs)).toBe(0);
  });
});

describe('nextRecurrenceDate', () => {
  it('adds a day, week or month', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const daily = nextRecurrenceDate(future, 'daily');
    expect(daily.getTime() - future.getTime()).toBe(24 * 60 * 60 * 1000);

    const weekly = nextRecurrenceDate(future, 'weekly');
    expect(weekly.getTime() - future.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('never returns a date in the past', () => {
    const past = new Date('2020-01-01T09:00:00.000Z');
    expect(nextRecurrenceDate(past, 'daily').getTime()).toBeGreaterThan(Date.now());
  });

  it('returns the base date for a task that does not repeat', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(nextRecurrenceDate(future, 'none').getTime()).toBe(future.getTime());
  });
});

describe('viewRange', () => {
  const anchor = new Date('2026-03-10T12:00:00.000Z');

  it('covers a single day', () => {
    const range = viewRange('day', anchor);
    expect(range.end.getTime() - range.start.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(range.start <= anchor && anchor <= range.end).toBe(true);
  });

  it('covers a week and a month', () => {
    const week = viewRange('week', anchor);
    expect(week.end.getTime() - week.start.getTime()).toBeGreaterThan(5 * 24 * 60 * 60 * 1000);

    const month = viewRange('month', anchor);
    expect(month.end.getTime() - month.start.getTime()).toBeGreaterThan(27 * 24 * 60 * 60 * 1000);
  });
});
