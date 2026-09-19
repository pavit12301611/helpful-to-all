import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { logActivity } from '@/server/core/audit';
import { notify } from '@/server/services/notifications';
import { toCsv } from '@/lib/utils';
import { contains } from '@/lib/db-config';
import { TASK_PAGE_SIZE, parseDateTime, type TaskFilters, type TaskInput } from './schemas';

/**
 * Task service.
 *
 * Personal and group tasks share one model: a task belongs to an owner, and may
 * additionally belong to a group (visible to members) and an assignee.
 */

export type TaskWithSubtasks = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  priority: string;
  recurrence: string;
  labels: string;
  completedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  groupId: string | null;
  assigneeId: string | null;
  subtasks: { id: string; title: string; completedAt: Date | null }[];
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function todayRange() {
  return { start: startOfToday(), end: endOfToday() };
}

export async function listTasks(userId: string, filters: TaskFilters) {
  const db = await getDb();
  const { start, end } = todayRange();

  const where: Record<string, unknown> = {
    deletedAt: null,
    archivedAt: filters.view === 'archived' ? { not: null } : null,
  };

  // Group boards show every member's task; the personal list stays private.
  if (filters.groupId) {
    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: filters.groupId, userId } },
    });
    if (membership) {
      where.groupId = filters.groupId;
    } else {
      where.ownerId = userId;
    }
  } else {
    where.ownerId = userId;
  }

  switch (filters.view) {
    case 'today':
      where.completedAt = null;
      where.OR = [
        { dueAt: { gte: start, lte: end } },
        { dueAt: null, createdAt: { gte: start } },
        { dueAt: { lt: start } },
      ];
      break;
    case 'upcoming':
      where.completedAt = null;
      where.dueAt = { gt: end };
      break;
    case 'overdue':
      where.completedAt = null;
      where.dueAt = { lt: start };
      break;
    case 'done':
      where.completedAt = { not: null };
      break;
    case 'archived':
      break;
    case 'all':
    default:
      where.completedAt = null;
      break;
  }

  if (filters.q) {
    const term = contains(filters.q);
    where.title = term;
  }
  if (filters.priority) where.priority = filters.priority;
  if (filters.label) where.labels = { contains: filters.label };

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      include: { subtasks: { orderBy: { position: 'asc' } } },
      orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: TASK_PAGE_SIZE,
      skip: (filters.page - 1) * TASK_PAGE_SIZE,
    }),
    db.task.count({ where }),
  ]);

  return { tasks, total };
}

export async function getTask(userId: string, taskId: string) {
  const db = await getDb();
  const task = await db.task.findFirst({
    where: { id: taskId, deletedAt: null, OR: [{ ownerId: userId }, { assigneeId: userId }, { group: { members: { some: { userId } } } }] },
    include: {
      subtasks: { orderBy: { position: 'asc' } },
      group: { select: { id: true, name: true, slug: true } },
      assignee: { include: { profile: true } },
      owner: { include: { profile: true } },
    },
  });
  if (!task) throw new NotFoundError('That task does not exist or you cannot see it.');
  return task;
}

export async function createTask(userId: string, input: TaskInput) {
  const db = await getDb();

  if (input.groupId) {
    const member = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId } },
    });
    if (!member) throw new ForbiddenError('You can only add tasks to groups you belong to.');
  }

  const task = await db.task.create({
    data: {
      ownerId: userId,
      groupId: input.groupId || null,
      assigneeId: input.assigneeId || null,
      title: input.title,
      description: input.description || null,
      dueAt: parseDateTime(input.dueAt),
      priority: input.priority ?? 'medium',
      recurrence: input.recurrence ?? 'none',
      labels: toCsv(input.labels ?? []),
    },
  });

  await logActivity({ userId, type: 'task', description: `Created task “${input.title}”`, targetType: 'task', targetId: task.id });

  if (task.assigneeId && task.assigneeId !== userId) {
    await notify({
      userId: task.assigneeId,
      type: 'task_reminder',
      title: 'You were assigned a task',
      body: input.title,
      targetType: 'task',
      targetId: task.id,
      link: `/tasks/${task.id}`,
      actorId: userId,
    });
  }

  return task;
}

async function assertCanEdit(userId: string, taskId: string) {
  const db = await getDb();
  const task = await db.task.findFirst({ where: { id: taskId, deletedAt: null } });
  if (!task) throw new NotFoundError('Task not found.');
  if (task.ownerId !== userId && task.assigneeId !== userId) {
    throw new ForbiddenError('Only the task owner or assignee can change it.');
  }
  return task;
}

export async function updateTask(userId: string, taskId: string, input: TaskInput) {
  await assertCanEdit(userId, taskId);
  const db = await getDb();
  return db.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description || null,
      dueAt: parseDateTime(input.dueAt),
      priority: input.priority ?? 'medium',
      recurrence: input.recurrence ?? 'none',
      labels: toCsv(input.labels ?? []),
      assigneeId: input.assigneeId || null,
    },
  });
}

/** Advance a recurring task: completing one occurrence creates the next. */
export function nextRecurrenceDate(current: Date | null, recurrence: string): Date {
  const base = current ?? new Date();
  const next = new Date(base);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  // Never schedule the next occurrence in the past.
  const now = new Date();
  while (next < now) {
    if (recurrence === 'daily') next.setDate(next.getDate() + 1);
    else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
    else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
    else break;
  }
  return next;
}

export async function setTaskCompleted(userId: string, taskId: string, completed: boolean) {
  const task = await assertCanEdit(userId, taskId);
  const db = await getDb();

  const updated = await db.task.update({
    where: { id: taskId },
    data: { completedAt: completed ? new Date() : null },
  });

  if (completed && task.recurrence !== 'none') {
    await db.task.create({
      data: {
        ownerId: task.ownerId,
        groupId: task.groupId,
        assigneeId: task.assigneeId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        recurrence: task.recurrence,
        labels: task.labels,
        dueAt: nextRecurrenceDate(task.dueAt, task.recurrence),
      },
    });
  }

  return updated;
}

export async function setTaskArchived(userId: string, taskId: string, archived: boolean) {
  await assertCanEdit(userId, taskId);
  const db = await getDb();
  return db.task.update({ where: { id: taskId }, data: { archivedAt: archived ? new Date() : null } });
}

export async function deleteTask(userId: string, taskId: string) {
  const task = await assertCanEdit(userId, taskId);
  const db = await getDb();
  await db.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
  await logActivity({ userId, type: 'task', description: `Deleted task “${task.title}”` });
}

/* ---------------------------------------------------------------- subtasks */

export async function addSubtask(userId: string, taskId: string, title: string) {
  await assertCanEdit(userId, taskId);
  const db = await getDb();
  const count = await db.subtask.count({ where: { taskId } });
  return db.subtask.create({ data: { taskId, ownerId: userId, title, position: count } });
}

export async function toggleSubtask(userId: string, subtaskId: string) {
  const db = await getDb();
  const subtask = await db.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) throw new NotFoundError('Subtask not found.');
  await assertCanEdit(userId, subtask.taskId);
  return db.subtask.update({
    where: { id: subtaskId },
    data: { completedAt: subtask.completedAt ? null : new Date() },
  });
}

export async function deleteSubtask(userId: string, subtaskId: string) {
  const db = await getDb();
  const subtask = await db.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) throw new NotFoundError('Subtask not found.');
  await assertCanEdit(userId, subtask.taskId);
  await db.subtask.delete({ where: { id: subtaskId } });
}

/* ----------------------------------------------------------------- summary */

export async function taskSummary(userId: string) {
  const db = await getDb();
  const { start, end } = todayRange();
  const [dueToday, overdue, open, completedThisWeek] = await Promise.all([
    db.task.count({ where: { ownerId: userId, deletedAt: null, completedAt: null, dueAt: { gte: start, lte: end } } }),
    db.task.count({ where: { ownerId: userId, deletedAt: null, completedAt: null, dueAt: { lt: start } } }),
    db.task.count({ where: { ownerId: userId, deletedAt: null, completedAt: null } }),
    db.task.count({
      where: { ownerId: userId, deletedAt: null, completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    }),
  ]);
  return { dueToday, overdue, open, completedThisWeek };
}

export async function validateTaskInput(input: unknown) {
  const { taskSchema } = await import('./schemas');
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError('Please check the task details.');
  return parsed.data;
}
