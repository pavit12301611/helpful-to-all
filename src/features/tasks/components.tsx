'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Pencil, Trash2, Plus } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/card';
import { TASK_PRIORITIES, RECURRENCE } from '@/lib/enums';
import { labelize } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import {
  addSubtaskAction,
  archiveTaskAction,
  createTaskAction,
  deleteSubtaskAction,
  deleteTaskAction,
  toggleSubtaskAction,
  toggleTaskAction,
  updateTaskAction,
} from './actions';

const priorityTone: Record<string, 'neutral' | 'info' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

export function TaskForm({
  groups,
  defaultGroupId,
  compact = false,
}: {
  groups: { id: string; name: string }[];
  defaultGroupId?: string;
  compact?: boolean;
}) {
  return (
    <ServerForm
      action={createTaskAction}
      successMessage="Task created."
      resetOnSuccess
      ariaLabel="Create a task"
      className="space-y-3"
    >
      {({ errors, pending }) => (
        <>
          <Field label="What needs doing?" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={160} placeholder="Call the plumber" />}
          </Field>

          {!compact ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Due" name="dueAt" error={errors.dueAt}>
                  {(props) => <Input {...props} name="dueAt" type="datetime-local" />}
                </Field>
                <Field label="Priority" name="priority" error={errors.priority}>
                  {(props) => (
                    <Select {...props} name="priority" defaultValue="medium">
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {labelize(priority)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Repeat" name="recurrence" error={errors.recurrence}>
                  {(props) => (
                    <Select {...props} name="recurrence" defaultValue="none">
                      {RECURRENCE.map((value) => (
                        <option key={value} value={value}>
                          {value === 'none' ? 'Does not repeat' : labelize(value)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <Field label="Labels" name="labelsCsv" error={errors.labels} hint="Comma separated, e.g. home, urgent-call">
                {(props) => <Input {...props} name="labelsCsv" placeholder="home, admin" />}
              </Field>

              <Field label="Notes" name="description" error={errors.description}>
                {(props) => <Textarea {...props} name="description" rows={3} placeholder="Optional details" />}
              </Field>

              {groups.length ? (
                <Field label="Group task" name="groupId" hint="Leave empty to keep it personal.">
                  {(props) => (
                    <Select {...props} name="groupId" defaultValue={defaultGroupId ?? ''}>
                      <option value="">Personal task</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}
            </>
          ) : null}

          <SubmitButton pending={pending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add task
          </SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function TaskItem({
  task,
  showGroup = false,
}: {
  task: {
    id: string;
    title: string;
    dueAt: Date | null;
    priority: string;
    labels: string;
    completedAt: Date | null;
    recurrence: string;
    groupId: string | null;
    subtasks?: { id: string; title: string; completedAt: Date | null }[];
  };
  showGroup?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const done = Boolean(task.completedAt);
  const overdue = !done && task.dueAt ? task.dueAt < new Date() : false;

  return (
    <li className="rounded-lg border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={async () => toggleTaskAction(task.id, !done)}
          aria-pressed={done}
          aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            done ? 'border-success bg-success text-success-foreground' : 'border-input hover:border-primary'
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <Link href={`/tasks/${task.id}`} className={`text-sm font-medium hover:underline ${done ? 'text-muted-foreground line-through' : ''}`}>
            {task.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={priorityTone[task.priority] ?? 'neutral'}>{labelize(task.priority)}</Badge>
            {task.dueAt ? (
              <span className={`text-xs ${overdue ? 'font-medium text-danger' : 'text-muted-foreground'}`}>
                {overdue ? 'Overdue · ' : 'Due '}
                {formatDateTime(task.dueAt)}
              </span>
            ) : null}
            {task.recurrence !== 'none' ? <Badge tone="neutral">Repeats {labelize(task.recurrence)}</Badge> : null}
            {task.labels
              ? task.labels
                  .split(',')
                  .filter(Boolean)
                  .map((label) => (
                    <Badge key={label} tone="primary">
                      {label}
                    </Badge>
                  ))
              : null}
            {showGroup && task.groupId ? <Badge tone="neutral">Group task</Badge> : null}
            {task.subtasks?.length ? (
              <span className="text-xs text-muted-foreground">
                {task.subtasks.filter((sub) => sub.completedAt).length}/{task.subtasks.length} subtasks
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            aria-expanded={editing}
            aria-label={`Edit ${task.title}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <ConfirmIconAction
            action={() => archiveTaskAction(task.id, true)}
            title="Archive this task?"
            description="Archived tasks stay in your history and can be restored."
            confirmLabel="Archive"
            label={`Archive ${task.title}`}
            icon={<span className="text-xs">📁</span>}
          />
          <ConfirmIconAction
            action={() => deleteTaskAction(task.id)}
            title="Delete this task?"
            description="The task and its subtasks will be removed."
            confirmLabel="Delete task"
            label={`Delete ${task.title}`}
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>

      {editing ? (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <ServerForm
            action={(formData) => updateTaskAction(task.id, formData)}
            successMessage="Task updated."
            onSuccess={() => setEditing(false)}
            ariaLabel="Edit task"
            className="space-y-3"
          >
            {({ errors, pending }) => (
              <>
                <Field label="Title" name="title" error={errors.title} required>
                  {(props) => <Input {...props} name="title" defaultValue={task.title} required />}
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Due" name="dueAt" error={errors.dueAt}>
                    {(props) => (
                      <Input
                        {...props}
                        name="dueAt"
                        type="datetime-local"
                        defaultValue={task.dueAt ? toLocalInputValue(task.dueAt) : ''}
                      />
                    )}
                  </Field>
                  <Field label="Priority" name="priority" error={errors.priority}>
                    {(props) => (
                      <Select {...props} name="priority" defaultValue={task.priority}>
                        {TASK_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {labelize(priority)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Repeat" name="recurrence" error={errors.recurrence}>
                    {(props) => (
                      <Select {...props} name="recurrence" defaultValue={task.recurrence}>
                        {RECURRENCE.map((value) => (
                          <option key={value} value={value}>
                            {value === 'none' ? 'Does not repeat' : labelize(value)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
                <Field label="Labels" name="labelsCsv" error={errors.labels}>
                  {(props) => <Input {...props} name="labelsCsv" defaultValue={task.labels} />}
                </Field>
                <div className="flex gap-2">
                  <SubmitButton pending={pending}>Save changes</SubmitButton>
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </ServerForm>
        </div>
      ) : null}
    </li>
  );
}

export function SubtaskEditor({ taskId }: { taskId: string }) {
  return (
    <ServerForm action={addSubtaskAction} successMessage="Subtask added." resetOnSuccess ariaLabel="Add subtask" className="flex gap-2">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="taskId" value={taskId} />
          <div className="flex-1">
            <label htmlFor="subtask-title" className="sr-only">
              Subtask title
            </label>
            <Input id="subtask-title" name="title" placeholder="Add a subtask" aria-invalid={Boolean(errors.title)} />
          </div>
          <SubmitButton pending={pending}>Add</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function SubtaskRow({ subtask }: { subtask: { id: string; title: string; completedAt: Date | null } }) {
  const done = Boolean(subtask.completedAt);
  return (
    <li className="flex items-center gap-2 py-1">
      <button
        type="button"
        onClick={() => toggleSubtaskAction(subtask.id)}
        aria-pressed={done}
        aria-label={done ? `Mark “${subtask.title}” as not done` : `Mark “${subtask.title}” as done`}
        className={`flex h-4 w-4 items-center justify-center rounded border ${done ? 'border-success bg-success text-success-foreground' : 'border-input'}`}
      >
        {done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
      </button>
      <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : ''}`}>{subtask.title}</span>
      <ConfirmIconAction
        action={() => deleteSubtaskAction(subtask.id)}
        title="Remove subtask?"
        description={`“${subtask.title}” will be removed.`}
        confirmLabel="Remove"
        label={`Remove ${subtask.title}`}
        icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
      />
    </li>
  );
}

/** Convert a Date into the value format expected by <input type="datetime-local">. */
export function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
