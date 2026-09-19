'use client';

import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { createEventAction } from '@/features/calendar/actions';

/**
 * Publish an event into a public group. The calendar feature owns event
 * creation (including the membership check), so this form only adds the
 * community-events framing.
 */
export function EventForm({ groups }: { groups: { id: string; name: string; slug: string }[] }) {
  return (
    <Card>
      <CardHeader
        title="Publish a community event"
        description="Pick one of your public groups. Members get a notification and the event is listed here."
      />
      <CardContent className="grid gap-3">
        {groups.length === 0 ? (
          <Alert tone="info">
            You do not belong to a public group yet. Create one (or ask a group owner to switch a group to public) and you can
            publish events from here.
          </Alert>
        ) : null}
        <ServerForm action={createEventAction} className="grid gap-3" ariaLabel="Publish a community event" resetOnSuccess>
          {({ errors, pending }) => (
            <>
              <Field label="Title" name="title" error={errors.title} required>
                {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Sunday river clean-up" />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Public group" name="groupId" error={errors.groupId} required>
                  {(props) => (
                    <Select {...props} name="groupId" required disabled={groups.length === 0}>
                      <option value="">Choose a group…</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Location" name="location" error={errors.location} hint="A landmark is enough — no home addresses.">
                  {(props) => <Input {...props} name="location" maxLength={160} placeholder="Near the community hall" />}
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Starts" name="startsAt" error={errors.startsAt} required>
                  {(props) => <Input {...props} name="startsAt" type="datetime-local" required />}
                </Field>
                <Field label="Ends" name="endsAt" error={errors.endsAt}>
                  {(props) => <Input {...props} name="endsAt" type="datetime-local" />}
                </Field>
              </div>
              <Field label="Details" name="description" error={errors.description} hint="What to bring, who it is for, accessibility notes.">
                {(props) => <Textarea {...props} name="description" rows={3} maxLength={2000} />}
              </Field>
              <div className="flex items-center gap-2">
                <input id="field-event-allday" name="allDay" type="checkbox" className="h-4 w-4 rounded border-border" />
                <label htmlFor="field-event-allday" className="text-sm text-foreground">
                  All-day event
                </label>
              </div>
              <SubmitButton pending={pending} className="justify-self-start">
                Publish event
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}
