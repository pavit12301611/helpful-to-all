import type { Metadata } from 'next';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { listTasks, taskSummary } from '@/features/tasks/service';
import { taskFilters } from '@/features/tasks/schemas';
import { TaskForm, TaskItem } from '@/features/tasks/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { TASK_PAGE_SIZE } from '@/features/tasks/schemas';

export const metadata: Metadata = { title: 'Tasks' };

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'all', label: 'All open' },
  { key: 'done', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const filters = taskFilters.parse({
    view: params.view ?? params.tab ?? 'today',
    q: params.q,
    priority: params.priority,
    label: params.label,
    groupId: params.groupId,
    page: params.page,
  });

  const db = await getDb();
  const [{ tasks, total }, summary, groups] = await Promise.all([
    listTasks(user.id, filters),
    taskSummary(user.id),
    db.groupMember.findMany({
      where: { userId: user.id, group: { deletedAt: null } },
      include: { group: { select: { id: true, name: true, slug: true } } },
      orderBy: { joinedAt: 'desc' },
      take: 20,
    }),
  ]);

  const searchParamsForPagination: Record<string, string | undefined> = {
    view: filters.view,
    q: params.q,
    priority: params.priority,
    groupId: filters.groupId,
  };

  const scopedGroup = filters.groupId
    ? groups.find((membership) => membership.group.id === filters.groupId)?.group ?? null
    : null;

  return (
    <div className="space-y-5">
      <SectionHeading
        title={scopedGroup ? `${scopedGroup.name} · shared tasks` : 'Tasks'}
        description={
          scopedGroup
            ? 'Everyone in the group sees these tasks. Personal tasks stay on your own list.'
            : `${summary.open} open · ${summary.dueToday} due today · ${summary.overdue} overdue · ${summary.completedThisWeek} finished this week`
        }
      />

      <Card>
        <CardHeader
          title={scopedGroup ? `Add a task for ${scopedGroup.name}` : 'Add a task'}
          icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
          action={
            scopedGroup ? (
              <Link href={`/groups/${scopedGroup.slug}`} className="text-sm text-primary hover:underline">
                Back to group
              </Link>
            ) : null
          }
        />
        <CardContent>
          <TaskForm groups={groups.map((membership) => membership.group)} defaultGroupId={filters.groupId} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Tabs tabs={TABS} current={filters.view} basePath="/tasks" searchParams={searchParamsForPagination} />

        {tasks.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description={
              filters.view === 'today'
                ? 'No tasks due today. Add one above, or enjoy the quiet.'
                : 'No tasks match this filter yet.'
            }
            icon={<ListChecks className="h-8 w-8" aria-hidden="true" />}
          />
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                showGroup
                task={{
                  id: task.id,
                  title: task.title,
                  dueAt: task.dueAt,
                  priority: task.priority,
                  labels: task.labels,
                  completedAt: task.completedAt,
                  recurrence: task.recurrence,
                  groupId: task.groupId,
                  subtasks: task.subtasks,
                }}
              />
            ))}
          </ul>
        )}

        <Pagination
          page={filters.page}
          pageSize={TASK_PAGE_SIZE}
          total={total}
          basePath="/tasks"
          searchParams={searchParamsForPagination}
        />
      </div>
    </div>
  );
}
