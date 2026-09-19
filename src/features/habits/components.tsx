'use client';

import { Check, Flame, Trash2, Archive } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Card, CardContent, Progress, labelize } from '@/components/ui/card';
import { HABIT_FREQUENCY } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { archiveHabitAction, createHabitAction, deleteHabitAction, logHabitAction } from './actions';
import type { HabitWithStats } from './service';

export function HabitForm() {
  return (
    <ServerForm action={createHabitAction} successMessage="Habit created." resetOnSuccess ariaLabel="Create a habit" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Habit" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" placeholder="Read 20 pages" required maxLength={80} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="How often?" name="frequency" error={errors.frequency}>
              {(props) => (
                <Select {...props} name="frequency" defaultValue="daily">
                  {HABIT_FREQUENCY.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {labelize(frequency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Times per period" name="targetCount" error={errors.targetCount} hint="1 means once per day (or week).">
              {(props) => <Input {...props} name="targetCount" type="number" min={1} max={20} defaultValue={1} />}
            </Field>
          </div>
          <Field label="Why does this matter?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} placeholder="Optional motivation" />}
          </Field>
          <SubmitButton pending={pending}>Create habit</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function HabitCard({ habit }: { habit: HabitWithStats }) {
  const done = habit.todayCount >= habit.targetCount;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{habit.title}</h2>
            {habit.description ? <p className="mt-0.5 text-xs text-muted-foreground">{habit.description}</p> : null}
          </div>
          <div className="flex items-center gap-0.5">
            <ConfirmIconAction
              action={() => archiveHabitAction(habit.id, true)}
              title="Archive this habit?"
              description="Your history is kept, and you can restore it later."
              confirmLabel="Archive"
              label="Archive habit"
              icon={<Archive className="h-4 w-4" aria-hidden="true" />}
            />
            <ConfirmIconAction
              action={() => deleteHabitAction(habit.id)}
              title="Delete this habit?"
              description="The habit and its history will be removed."
              confirmLabel="Delete habit"
              label="Delete habit"
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => logHabitAction(habit.id)}
            aria-pressed={done}
            aria-label={done ? `Mark ${habit.title} as not done today` : `Mark ${habit.title} as done today`}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              done ? 'border-success bg-success text-success-foreground' : 'border-input text-muted-foreground hover:border-success',
            )}
          >
            <Check className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Flame className="h-4 w-4 text-warning" aria-hidden="true" />
              {habit.streak} {habit.frequency === 'weekly' ? 'week' : 'day'} streak
            </p>
            <p className="text-xs text-muted-foreground">
              {done ? 'Done today' : `${habit.todayCount}/${habit.targetCount} today`}
            </p>
          </div>
        </div>

        <div aria-label="Last 7 days" className="flex gap-1">
          {habit.last7.map((entry) => {
            const met = entry.count >= habit.targetCount;
            return (
              <div
                key={entry.day}
                title={`${entry.day}: ${entry.count}`}
                className={cn('h-6 flex-1 rounded', met ? 'bg-success' : 'bg-muted')}
                role="img"
                aria-label={`${entry.day}: ${met ? 'completed' : 'not completed'}`}
              />
            );
          })}
        </div>

        <Progress value={habit.todayCount} max={habit.targetCount} label="Today" tone={done ? 'success' : 'primary'} />
      </CardContent>
    </Card>
  );
}
