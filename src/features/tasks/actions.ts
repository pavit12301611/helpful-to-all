'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  addSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  setTaskArchived,
  setTaskCompleted,
  toggleSubtask,
  updateTask,
} from './service';
import { subtaskSchema, taskSchema } from './schemas';

function formDataToTask(formData: FormData) {
  const labels = formData.getAll('labels').filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return {
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    dueAt: formData.get('dueAt') ?? '',
    priority: formData.get('priority') || 'medium',
    recurrence: formData.get('recurrence') || 'none',
    labels: labels.length ? labels : String(formData.get('labelsCsv') ?? '').split(',').filter(Boolean),
    groupId: formData.get('groupId') ?? '',
    assigneeId: formData.get('assigneeId') ?? '',
  };
}

export async function createTaskAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  return runAction({
    schema: taskSchema,
    input: formDataToTask(formData),
    successMessage: 'Task created.',
    handler: async (data) => createTask(user.id, data),
  });
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  return runAction({
    schema: taskSchema.extend({ id: z.string().min(1) }),
    input: { ...formDataToTask(formData), id: taskId },
    successMessage: 'Task updated.',
    handler: async (data) => updateTask(user.id, data.id, data),
  });
}

export async function toggleTaskAction(taskId: string, completed: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: completed ? 'Nice work — task completed.' : 'Task reopened.',
    handler: async () => setTaskCompleted(user.id, taskId, completed),
  });
  if (result.ok) revalidatePath('/tasks');
  return result;
}

export async function archiveTaskAction(taskId: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: archived ? 'Task archived.' : 'Task restored.',
    handler: async () => setTaskArchived(user.id, taskId, archived),
  });
  if (result.ok) revalidatePath('/tasks');
  return result;
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  return runAction({
    successMessage: 'Task deleted.',
    handler: async () => deleteTask(user.id, taskId),
  });
}

export async function addSubtaskAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: subtaskSchema,
    input: { taskId: formData.get('taskId'), title: formData.get('title') },
    successMessage: 'Subtask added.',
    handler: async (data) => addSubtask(user.id, data.taskId, data.title),
  });
  if (result.ok) revalidatePath('/tasks');
  return result;
}

export async function toggleSubtaskAction(subtaskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    handler: async () => toggleSubtask(user.id, subtaskId),
  });
  if (result.ok) revalidatePath('/tasks');
  return result;
}

export async function deleteSubtaskAction(subtaskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    successMessage: 'Subtask removed.',
    handler: async () => deleteSubtask(user.id, subtaskId),
  });
  if (result.ok) revalidatePath('/tasks');
  return result;
}
