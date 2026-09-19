'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { calendarEventSchema } from './schemas';
import { createEvent, deleteEvent, updateEvent } from './service';

function readEvent(formData: FormData) {
  return {
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    location: formData.get('location') ?? '',
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt') ?? '',
    allDay: formData.get('allDay') === 'on',
    reminderMinutes: formData.get('reminderMinutes') || undefined,
    recurrence: formData.get('recurrence') || 'none',
    groupId: formData.get('groupId') ?? '',
    tripId: formData.get('tripId') ?? '',
  };
}

export async function createEventAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({ schema: calendarEventSchema, input: readEvent(formData), successMessage: 'Event added.', handler: (data) => createEvent(user.id, data) });
  if (result.ok) {
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    revalidatePath('/events');
  }
  return result;
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ schema: calendarEventSchema, input: readEvent(formData), successMessage: 'Event updated.', handler: (data) => updateEvent(user.id, eventId, data) });
  if (result.ok) revalidatePath('/calendar');
  return result;
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Event deleted.', handler: () => deleteEvent(user.id, eventId) });
  if (result.ok) revalidatePath('/calendar');
  return result;
}
