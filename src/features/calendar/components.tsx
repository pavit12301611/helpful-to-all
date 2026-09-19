'use client';

import Link from 'next/link';
import { CalendarDays, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea, Checkbox } from '@/components/ui/field';
import { Badge } from '@/components/ui/card';
import { RECURRENCE } from '@/lib/enums';
import { formatDateTime, labelize } from '@/lib/utils';
import { createEventAction, deleteEventAction } from './actions';

export function EventForm({
  groups,
  trips,
  defaultDate,
}: {
  groups: { id: string; name: string }[];
  trips: { id: string; title: string }[];
  defaultDate?: string;
}) {
  return (
    <ServerForm action={createEventAction} successMessage="Event added." resetOnSuccess ariaLabel="Create an event" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required placeholder="Team stand-up" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts" name="startsAt" error={errors.startsAt} required>
              {(props) => <Input {...props} name="startsAt" type="datetime-local" defaultValue={defaultDate} required />}
            </Field>
            <Field label="Ends" name="endsAt" error={errors.endsAt}>
              {(props) => <Input {...props} name="endsAt" type="datetime-local" />}
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Location" name="location" error={errors.location}>
              {(props) => <Input {...props} name="location" placeholder="Community hall" />}
            </Field>
            <Field label="Reminder" name="reminderMinutes" error={errors.reminderMinutes} hint="Minutes before">
              {(props) => (
                <Select {...props} name="reminderMinutes" defaultValue="">
                  <option value="">No reminder</option>
                  <option value="15">15 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="1440">1 day</option>
                </Select>
              )}
            </Field>
            <Field label="Repeats" name="recurrence" error={errors.recurrence}>
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
          <Field label="Notes" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.length ? (
              <Field label="Group event" name="groupId" hint="Members are notified.">
                {(props) => (
                  <Select {...props} name="groupId" defaultValue="">
                    <option value="">Personal event</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
            {trips.length ? (
              <Field label="Trip event" name="tripId">
                {(props) => (
                  <Select {...props} name="tripId" defaultValue="">
                    <option value="">Not part of a trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </div>
          <Checkbox name="allDay" label="All day event" />
          <SubmitButton pending={pending}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Add event
          </SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function EventRow({
  event,
  canEdit,
}: {
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date | null;
    location: string | null;
    allDay: boolean;
    groupId: string | null;
    tripId: string | null;
    group: { name: string; slug: string } | null;
    trip: { id: string; title: string } | null;
  };
  canEdit: boolean;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="w-24 shrink-0 text-xs text-muted-foreground">
        {event.allDay ? 'All day' : formatDateTime(event.startsAt).split(',').slice(1).join(',')}
        <div className="text-[11px]">{formatDateTime(event.startsAt).split(',')[0]}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {event.location ? <span className="text-xs text-muted-foreground">{event.location}</span> : null}
          {event.group ? (
            <Link href={`/groups/${event.group.slug}`}>
              <Badge tone="primary">{event.group.name}</Badge>
            </Link>
          ) : null}
          {event.trip ? (
            <Link href={`/trips/${event.trip.id}`}>
              <Badge tone="info">{event.trip.title}</Badge>
            </Link>
          ) : null}
        </div>
      </div>
      {canEdit ? (
        <ConfirmIconAction
          action={() => deleteEventAction(event.id)}
          title="Delete this event?"
          description={`“${event.title}” will be removed from the calendar.`}
          confirmLabel="Delete event"
          label="Delete event"
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        />
      ) : null}
    </li>
  );
}
