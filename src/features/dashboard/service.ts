import { getDb } from '@/server/db/client';
import { contains } from '@/lib/db-config';
import { parseWidgets, serializeWidgets, DEFAULT_WIDGETS, type WidgetKey, type WidgetState } from '@/lib/dashboard';
import { taskSummary, todayRange } from '@/features/tasks/service';
import { upcomingEvents } from '@/features/calendar/service';
import { listHabits } from '@/features/habits/service';

/**
 * Dashboard aggregation service.
 *
 * The dashboard is a read-only composition of other features: it never writes
 * business data, only the member's own layout preference.
 */

export type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;

export async function loadDashboardData(userId: string, city: string | null) {
  const db = await getDb();
  const { start, end } = todayRange();
  const weekAhead = new Date(Date.now() + 7 * 86_400_000);

  const [
    preferences,
    tasks,
    summary,
    events,
    habits,
    community,
    nearbyHelp,
    groups,
    volunteer,
    saved,
    skills,
    expenseTotals,
    exams,
    assignments,
  ] = await Promise.all([
    getPreferences(userId),
    db.task.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        completedAt: null,
        archivedAt: null,
        OR: [{ dueAt: { gte: start, lte: end } }, { dueAt: { lt: start } }],
      },
      orderBy: { dueAt: 'asc' },
      take: 6,
    }),
    taskSummary(userId),
    upcomingEvents(userId, 5),
    listHabits(userId),
    db.helpRequest.findMany({
      where: { deletedAt: null, hiddenAt: null, visibility: 'public', status: { in: ['open', 'in_progress'] } },
      include: { author: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    city
      ? db.helpRequest.findMany({
          where: {
            deletedAt: null,
            hiddenAt: null,
            visibility: 'public',
            status: 'open',
            city: contains(city),
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    db.group.findMany({
      where: { visibility: 'public', deletedAt: null, members: { none: { userId } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    db.volunteerOpportunity.findMany({
      where: { deletedAt: null, hiddenAt: null, status: { in: ['open', 'in_progress'] } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    db.savedItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    db.skillOffer.findMany({
      where: { isActive: true, userId: { not: userId } },
      include: { skill: true, user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    db.expense.groupBy({
      by: ['category'],
      where: { ownerId: userId, occurredOn: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { amountCents: true },
    }),
    db.exam.findMany({ where: { ownerId: userId, examAt: { gte: new Date(), lte: weekAhead } }, orderBy: { examAt: 'asc' }, take: 3 }),
    db.assignment.findMany({
      where: { ownerId: userId, dueAt: { gte: new Date(), lte: weekAhead }, status: { in: ['pending', 'in_progress'] } },
      orderBy: { dueAt: 'asc' },
      take: 3,
    }),
  ]);

  const widgets = parseWidgets(preferences.widgets);

  return {
    preferences,
    widgets,
    tasks,
    summary,
    events,
    habits,
    community,
    nearbyHelp,
    groups,
    volunteer,
    saved,
    skills,
    exams,
    assignments,
    expenseTotalCents: expenseTotals.reduce((sum, row) => sum + (row._sum.amountCents ?? 0), 0),
    expenseCategories: expenseTotals.length,
  };
}

export async function getPreferences(userId: string) {
  const db = await getDb();
  const existing = await db.dashboardPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.dashboardPreference.create({
    data: { userId, widgets: serializeWidgets(DEFAULT_WIDGETS) },
  });
}

export async function saveWidgetLayout(userId: string, widgets: WidgetState[]) {
  const db = await getDb();
  const known = widgets.filter((widget) => (Object.values(WidgetKeys) as string[]).includes(widget.key));
  return db.dashboardPreference.upsert({
    where: { userId },
    create: { userId, widgets: serializeWidgets(known.length ? known : DEFAULT_WIDGETS) },
    update: { widgets: serializeWidgets(known.length ? known : DEFAULT_WIDGETS) },
  });
}

export async function saveDashboardSettings(
  userId: string,
  input: { layout?: string; defaultModule?: string; pinnedTools?: string[] },
) {
  const db = await getDb();
  return db.dashboardPreference.upsert({
    where: { userId },
    create: {
      userId,
      layout: input.layout ?? 'comfortable',
      defaultModule: input.defaultModule ?? 'dashboard',
      pinnedTools: (input.pinnedTools ?? []).join(','),
      widgets: serializeWidgets(DEFAULT_WIDGETS),
    },
    update: {
      ...(input.layout ? { layout: input.layout } : {}),
      ...(input.defaultModule ? { defaultModule: input.defaultModule } : {}),
      ...(input.pinnedTools ? { pinnedTools: input.pinnedTools.join(',') } : {}),
    },
  });
}

const WidgetKeys: Record<string, WidgetKey> = {
  tasks: 'tasks',
  events: 'events',
  habits: 'habits',
  community: 'community',
  nearbyHelp: 'nearbyHelp',
  suggestedSkills: 'suggestedSkills',
  saved: 'saved',
  expenses: 'expenses',
  reminders: 'reminders',
  groups: 'groups',
  volunteer: 'volunteer',
  emergency: 'emergency',
};
