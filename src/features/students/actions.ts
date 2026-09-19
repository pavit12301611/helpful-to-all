'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import { assignmentSchema, courseGradeSchema, examSchema, flashcardDeckSchema, flashcardSchema, studentResourceSchema, timetableSlotSchema } from './schemas';
import {
  addCard,
  createAssignment,
  createDeck,
  createExam,
  createGrade,
  createResource,
  createTimetableSlot,
  deleteAssignment,
  deleteCard,
  deleteDeck,
  deleteExam,
  deleteGrade,
  deleteResource,
  deleteTimetableSlot,
  flagCopyright,
  registerDownload,
  reviewCard,
  updateAssignmentStatus,
  updateResource,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

export async function createResourceAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: studentResourceSchema,
    input: read(formData, ['title', 'description', 'subjectId', 'level', 'language', 'difficulty', 'fileType', 'institution', 'tags', 'url']),
    successMessage: 'Resource shared with the community.',
    handler: (data) => createResource(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function updateResourceAction(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: studentResourceSchema,
    input: read(formData, ['title', 'description', 'subjectId', 'level', 'language', 'difficulty', 'fileType', 'institution', 'tags', 'url']),
    successMessage: 'Resource updated.',
    handler: (data) => updateResource(user.id, id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteResourceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Resource removed.', handler: () => deleteResource(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function flagCopyrightAction(id: string, note: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Thank you - a moderator will review it.', handler: () => flagCopyright(user.id, id, note) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function registerDownloadAction(id: string): Promise<ActionResult> {
  return runAction({ handler: () => registerDownload(id) });
}

export async function createDeckAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: flashcardDeckSchema,
    input: read(formData, ['name', 'description', 'subjectId']),
    successMessage: 'Deck created.',
    handler: (data) => createDeck(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteDeckAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Deck deleted.', handler: () => deleteDeck(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function addCardAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: flashcardSchema,
    input: read(formData, ['deckId', 'front', 'back', 'hint']),
    successMessage: 'Card added.',
    handler: (data) => addCard(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteCardAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Card removed.', handler: () => deleteCard(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function reviewCardAction(id: string, correct: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => reviewCard(user.id, id, correct) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function createAssignmentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: assignmentSchema,
    input: read(formData, ['title', 'description', 'subjectId', 'dueAt', 'status', 'weightPct', 'scorePct']),
    successMessage: 'Assignment added.',
    handler: (data) => createAssignment(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function setAssignmentStatusAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Assignment updated.', handler: () => updateAssignmentStatus(user.id, id, status) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteAssignmentAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Assignment removed.', handler: () => deleteAssignment(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function createExamAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: examSchema,
    input: read(formData, ['title', 'subjectId', 'examAt', 'location', 'notes']),
    successMessage: 'Exam added.',
    handler: (data) => createExam(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteExamAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Exam removed.', handler: () => deleteExam(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function createTimetableSlotAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: timetableSlotSchema,
    input: read(formData, ['title', 'subjectId', 'dayOfWeek', 'startTime', 'endTime', 'room']),
    successMessage: 'Slot added.',
    handler: (data) => createTimetableSlot(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteTimetableSlotAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Slot removed.', handler: () => deleteTimetableSlot(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function createGradeAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: courseGradeSchema,
    input: read(formData, ['title', 'credits', 'gradePoint', 'term']),
    successMessage: 'Grade saved.',
    handler: (data) => createGrade(user.id, data),
  });
  if (result.ok) revalidatePath('/students');
  return result;
}

export async function deleteGradeAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Grade removed.', handler: () => deleteGrade(user.id, id) });
  if (result.ok) revalidatePath('/students');
  return result;
}
