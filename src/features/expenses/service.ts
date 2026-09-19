import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { parseMoneyToCents } from '@/lib/utils';
import { logActivity } from '@/server/core/audit';
import { EXPENSE_PAGE_SIZE, type ExpenseFilters, type ExpenseInput } from './schemas';

/**
 * Personal, group and trip expenses.
 *
 * Amounts are stored as integer minor units (cents) so totals never drift.
 * `isShared` expenses are split between the members of the related group or trip.
 */

/** Split an amount as evenly as possible; the remainder goes to the first people. */
export function splitEvenly(amountCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(amountCents / count);
  const remainder = amountCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthValue] = month.split('-').map(Number);
  const start = new Date(year ?? 1970, (monthValue ?? 1) - 1, 1);
  const end = new Date(year ?? 1970, monthValue ?? 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function listExpenses(userId: string, filters: ExpenseFilters) {
  const db = await getDb();
  const month = filters.month ?? currentMonth();
  const { start, end } = monthRange(month);

  const where: Record<string, unknown> = { ownerId: userId, occurredOn: { gte: start, lte: end } };
  if (filters.category) where.category = filters.category;

  const [expenses, total, grouped] = await Promise.all([
    db.expense.findMany({
      where,
      include: { splits: { include: { user: { include: { profile: true } } } } },
      orderBy: { occurredOn: 'desc' },
      take: EXPENSE_PAGE_SIZE,
      skip: (filters.page - 1) * EXPENSE_PAGE_SIZE,
    }),
    db.expense.count({ where }),
    db.expense.groupBy({ by: ['category'], where, _sum: { amountCents: true }, _count: { _all: true } }),
  ]);

  const totalCents = grouped.reduce((sum, row) => sum + (row._sum.amountCents ?? 0), 0);

  return {
    month,
    expenses,
    total,
    totalCents,
    byCategory: grouped
      .map((row) => ({
        category: row.category,
        amountCents: row._sum.amountCents ?? 0,
        count: row._count._all,
      }))
      .sort((a, b) => b.amountCents - a.amountCents),
  };
}

async function assertSplitAllowed(userId: string, groupId?: string | null, tripId?: string | null) {
  const db = await getDb();
  if (groupId) {
    const member = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!member) throw new ForbiddenError('You can only share expenses with groups you belong to.');
    const members = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
    return members.map((member) => member.userId);
  }
  if (tripId) {
    const member = await db.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
    if (!member) throw new ForbiddenError('You can only share expenses with trips you belong to.');
    const members = await db.tripMember.findMany({ where: { tripId }, select: { userId: true } });
    return members.map((member) => member.userId);
  }
  return null;
}

export async function createExpense(userId: string, input: ExpenseInput) {
  const db = await getDb();
  const amountCents = parseMoneyToCents(input.amount as number | string);
  const participants = await assertSplitAllowed(userId, input.groupId || null, input.tripId || null);
  const isShared = Boolean(input.isShared) && Boolean(participants?.length);

  const expense = await db.expense.create({
    data: {
      ownerId: userId,
      groupId: input.groupId || null,
      tripId: input.tripId || null,
      businessId: input.businessId || null,
      category: input.category ?? 'other',
      description: input.description || null,
      amountCents,
      currency: (input.currency ?? 'USD').toUpperCase(),
      occurredOn: input.occurredOn ? new Date(input.occurredOn) : new Date(),
      isShared,
      splits:
        isShared && participants
          ? {
              create: participants.map((participantId, index) => ({
                userId: participantId,
                shareCents: splitEvenly(amountCents, participants.length)[index] ?? 0,
              })),
            }
          : undefined,
    },
    include: { splits: true },
  });

  await logActivity({
    userId,
    type: 'expense',
    description: `Added ${input.category ?? 'other'} expense of ${amountCents / 100} ${expense.currency}`,
    targetType: 'task',
    targetId: expense.id,
  });

  return expense;
}

async function assertOwner(userId: string, expenseId: string) {
  const db = await getDb();
  const expense = await db.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new NotFoundError('Expense not found.');
  if (expense.ownerId !== userId) throw new ForbiddenError('Only the person who added it can change it.');
  return expense;
}

export async function updateExpense(userId: string, expenseId: string, input: ExpenseInput) {
  await assertOwner(userId, expenseId);
  const db = await getDb();
  return db.expense.update({
    where: { id: expenseId },
    data: {
      description: input.description || null,
      category: input.category ?? 'other',
      amountCents: parseMoneyToCents(input.amount as number | string),
      currency: (input.currency ?? 'USD').toUpperCase(),
      occurredOn: input.occurredOn ? new Date(input.occurredOn) : undefined,
    },
  });
}

export async function deleteExpense(userId: string, expenseId: string) {
  await assertOwner(userId, expenseId);
  const db = await getDb();
  await db.expense.delete({ where: { id: expenseId } });
  await logActivity({ userId, type: 'expense', description: 'Deleted an expense' });
}

export async function setSplitSettled(userId: string, splitId: string, settled: boolean) {
  const db = await getDb();
  const split = await db.expenseSplit.findUnique({ where: { id: splitId }, include: { expense: true } });
  if (!split) throw new NotFoundError('Split not found.');
  if (split.userId !== userId && split.expense.ownerId !== userId) {
    throw new ForbiddenError('You cannot change this split.');
  }
  return db.expenseSplit.update({ where: { id: splitId }, data: { settledAt: settled ? new Date() : null } });
}

/** Balances between the caller and everyone they share expenses with. */
export async function expenseBalances(userId: string) {
  const db = await getDb();
  const [owed, owedToMe] = await Promise.all([
    db.expenseSplit.findMany({
      where: { userId, settledAt: null, expense: { ownerId: { not: userId } } },
      include: { expense: { include: { owner: { include: { profile: true } } } } },
    }),
    db.expenseSplit.findMany({
      where: { userId: { not: userId }, settledAt: null, expense: { ownerId: userId } },
      include: { user: { include: { profile: true } }, expense: true },
    }),
  ]);

  const balances = new Map<string, { name: string; cents: number }>();
  const bump = (id: string, name: string, cents: number) => {
    const current = balances.get(id) ?? { name, cents: 0 };
    balances.set(id, { name, cents: current.cents + cents });
  };

  for (const split of owed) {
    bump(split.expense.ownerId, split.expense.owner.profile?.displayName ?? split.expense.owner.username, -split.shareCents);
  }
  for (const split of owedToMe) {
    bump(split.userId, split.user.profile?.displayName ?? split.user.username, split.shareCents);
  }

  return Array.from(balances.entries())
    .map(([id, value]) => ({ userId: id, name: value.name, cents: value.cents }))
    .filter((entry) => entry.cents !== 0);
}

/** CSV export - the same rows the user can see on screen. */
export function expensesToCsv(rows: {
  occurredOn: Date;
  category: string;
  description: string | null;
  amountCents: number;
  currency: string;
}[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = 'Date,Category,Description,Amount,Currency';
  const lines = rows.map((row) =>
    [
      row.occurredOn.toISOString().slice(0, 10),
      escape(row.category),
      escape(row.description ?? ''),
      (row.amountCents / 100).toFixed(2),
      escape(row.currency),
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

export async function exportExpenses(userId: string, month?: string) {
  const db = await getDb();
  const target = month ?? currentMonth();
  const { start, end } = monthRange(target);
  const expenses = await db.expense.findMany({
    where: { ownerId: userId, occurredOn: { gte: start, lte: end } },
    orderBy: { occurredOn: 'asc' },
  });
  return expensesToCsv(expenses);
}
