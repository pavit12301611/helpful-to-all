import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getTask } from '@/features/tasks/service';
import { SubtaskEditor, SubtaskRow, TaskItem } from '@/features/tasks/components';
import { Card, CardContent, CardHeader, DefinitionList } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatDateTime } from '@/lib/utils';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Task' };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;

  let task: Awaited<ReturnType<typeof getTask>> | null = null;
  let error: string | null = null;
  try {
    task = await getTask(user.id, id);
  } catch (cause) {
    error = isAppError(cause) ? cause.message : 'We could not load that task.';
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Alert tone="warning" title="Task unavailable">
          {error}
        </Alert>
        <Link href="/tasks" className="link text-sm">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to tasks
      </Link>

      <ul className="space-y-2">
        <TaskItem
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
      </ul>

      <Card>
        <CardHeader title="Details" />
        <CardContent className="space-y-4">
          {task.description ? <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p> : null}
          <DefinitionList
            items={[
              { label: 'Due', value: formatDateTime(task.dueAt) },
              { label: 'Created', value: formatDateTime(task.createdAt) },
              {
                label: 'Group',
                value: task.group ? <Link className="link" href={`/groups/${task.group.slug}`}>{task.group.name}</Link> : 'Personal',
              },
              {
                label: 'Assignee',
                value: task.assignee?.profile?.displayName ?? task.owner.profile?.displayName ?? 'You',
              },
              { label: 'Repeats', value: task.recurrence === 'none' ? 'Does not repeat' : task.recurrence },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Subtasks"
          description={`${task.subtasks.filter((sub) => sub.completedAt).length} of ${task.subtasks.length} done`}
        />
        <CardContent className="space-y-4">
          {task.subtasks.length ? (
            <ul>
              {task.subtasks.map((subtask) => (
                <SubtaskRow key={subtask.id} subtask={subtask} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Break the task into smaller steps.</p>
          )}
          <SubtaskEditor taskId={task.id} />
        </CardContent>
      </Card>
    </div>
  );
}
