'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Check, Copy, Download, GraduationCap, Trash2, X } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, StatusBadge, labelize } from '@/components/ui/card';
import { useToast } from '@/components/ui/feedback';
import { DIFFICULTY, EDUCATION_LEVELS, LISTING_KINDS, RESOURCE_FILE_TYPES } from '@/lib/enums';
import { formatDate, formatDateTime, labelize as toLabel } from '@/lib/utils';
import {
  addCardAction,
  createAssignmentAction,
  createDeckAction,
  createExamAction,
  createGradeAction,
  createResourceAction,
  createTimetableSlotAction,
  deleteAssignmentAction,
  deleteCardAction,
  deleteDeckAction,
  deleteExamAction,
  deleteGradeAction,
  deleteResourceAction,
  deleteTimetableSlotAction,
  flagCopyrightAction,
  registerDownloadAction,
  reviewCardAction,
  setAssignmentStatusAction,
} from './actions';

type Subject = { id: string; name: string };

export function ResourceForm({ subjects }: { subjects: Subject[] }) {
  return (
    <ServerForm action={createResourceAction} successMessage="Resource shared." resetOnSuccess ariaLabel="Share a study resource" className="space-y-4">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Calculus notes - limits" />}
          </Field>
          <Field label="What is it and who is it for?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={3} maxLength={1000} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Subject" name="subjectId" error={errors.subjectId}>
              {(props) => (
                <Select {...props} name="subjectId" defaultValue="">
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Level" name="level" error={errors.level}>
              {(props) => (
                <Select {...props} name="level" defaultValue="undergraduate">
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {labelize(level)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Difficulty" name="difficulty" error={errors.difficulty}>
              {(props) => (
                <Select {...props} name="difficulty" defaultValue="beginner">
                  {DIFFICULTY.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {labelize(difficulty)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Type" name="fileType" error={errors.fileType}>
              {(props) => (
                <Select {...props} name="fileType" defaultValue="notes">
                  {RESOURCE_FILE_TYPES.map((fileType) => (
                    <option key={fileType} value={fileType}>
                      {labelize(fileType)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Language" name="language" error={errors.language} hint="ISO code, e.g. en or hi.">
              {(props) => <Input {...props} name="language" defaultValue="en" maxLength={8} />}
            </Field>
            <Field label="Institution" name="institution" error={errors.institution}>
              {(props) => <Input {...props} name="institution" maxLength={120} placeholder="Optional" />}
            </Field>
          </div>
          <Field label="Link" name="url" error={errors.url} hint="Link to a file or page you have the right to share.">
            {(props) => <Input {...props} name="url" type="url" placeholder="https://example.org/notes.pdf" />}
          </Field>
          <Field label="Tags" name="tags" error={errors.tags} hint="Comma separated, e.g. calculus,exam">
            {(props) => <Input {...props} name="tags" maxLength={200} />}
          </Field>
          <p className="text-xs text-muted-foreground">
            Copyright rule: only share material you wrote or that is openly licensed. Do not upload paid textbooks, question
            papers from restricted sources or anyone else&apos;s copyrighted work.
          </p>
          <SubmitButton pending={pending}>Share resource</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ResourceRow({
  resource,
  canManage,
}: {
  resource: {
    id: string;
    title: string;
    description: string | null;
    level: string;
    language: string;
    difficulty: string;
    fileType: string;
    institution: string | null;
    tags: string;
    url: string | null;
    downloads: number;
    verified: boolean;
    copyrightFlags: number;
    createdAt: Date;
    subject: { name: string } | null;
    uploader: { username: string; profile: { displayName: string | null } | null };
  };
  canManage: boolean;
}) {
  const [note, setNote] = React.useState('');
  const [flagging, setFlagging] = React.useState(false);

  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/students/resources/${resource.id}`} className="text-sm font-semibold hover:underline">
            {resource.title}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{resource.description || 'No description.'}</p>
        </div>
        <div className="flex items-center gap-1">
          {resource.verified ? <Badge tone="success">Verified</Badge> : null}
          {resource.copyrightFlags > 0 ? <Badge tone="danger">{resource.copyrightFlags} flag(s)</Badge> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {resource.subject ? <Badge tone="primary">{resource.subject.name}</Badge> : null}
        <Badge tone="neutral">{labelize(resource.level)}</Badge>
        <Badge tone="neutral">{labelize(resource.difficulty)}</Badge>
        <Badge tone="neutral">{labelize(resource.fileType)}</Badge>
        <Badge tone="neutral">{resource.language}</Badge>
        {resource.institution ? <Badge tone="neutral">{resource.institution}</Badge> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => registerDownloadAction(resource.id)}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Open resource
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No link - details only</span>
        )}
        <span className="text-xs text-muted-foreground">
          {resource.downloads} open{resource.downloads === 1 ? '' : 's'} · shared by {resource.uploader.profile?.displayName ?? resource.uploader.username} ·{' '}
          {formatDate(resource.createdAt)}
        </span>
        {canManage ? (
          <ConfirmActionButton
            action={() => deleteResourceAction(resource.id)}
            title="Remove this resource?"
            description="It will no longer appear in the student centre."
            confirmLabel="Remove resource"
            label="Remove"
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            className="text-muted-foreground"
          />
        ) : (
          <button type="button" onClick={() => setFlagging((current) => !current)} className="text-xs text-muted-foreground underline" aria-expanded={flagging}>
            Report a copyright problem
          </button>
        )}
      </div>

      {flagging ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex-1">
            <label htmlFor={`flag-${resource.id}`} className="label">
              What is the problem?
            </label>
            <Input id={`flag-${resource.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="This is a scanned paid textbook." />
          </div>
          <ConfirmActionButton
            action={async () => {
              const result = await flagCopyrightAction(resource.id, note);
              if (result.ok) {
                setFlagging(false);
                setNote('');
              }
              return result;
            }}
            title="Send this report to moderators?"
            description="Moderators review every copyright report and can hide the resource."
            confirmLabel="Send report"
            label="Send report"
            variant="danger"
            size="sm"
          />
        </div>
      ) : null}
    </li>
  );
}

export function DeckForm({ subjects }: { subjects: Subject[] }) {
  void subjects;
  return (
    <ServerForm action={createDeckAction} successMessage="Deck created." resetOnSuccess ariaLabel="Create a flashcard deck" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Deck name" name="name" error={errors.name} required>
            {(props) => <Input {...props} name="name" required maxLength={80} placeholder="Electronics formulas" />}
          </Field>
          <Field label="Description" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} maxLength={300} />}
          </Field>
          <SubmitButton pending={pending}>Create deck</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function DeckCard({ deck }: { deck: { id: string; name: string; description: string | null; _count: { cards: number } } }) {
  return (
    <li className="card-surface flex items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <Link href={`/students/flashcards/${deck.id}`} className="block truncate text-sm font-medium hover:underline">
          {deck.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {deck._count.cards} card{deck._count.cards === 1 ? '' : 's'}
          {deck.description ? ` · ${deck.description}` : ''}
        </p>
      </div>
      <ConfirmActionButton
        action={() => deleteDeckAction(deck.id)}
        title={`Delete “${deck.name}”?`}
        description="All cards in the deck are deleted too."
        confirmLabel="Delete deck"
        label={`Delete ${deck.name}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function CardForm({ deckId }: { deckId: string }) {
  return (
    <ServerForm action={addCardAction} successMessage="Card added." resetOnSuccess ariaLabel="Add a flashcard" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="deckId" value={deckId} />
          <Field label="Front (question or term)" name="front" error={errors.front} required>
            {(props) => <Input {...props} name="front" required maxLength={400} />}
          </Field>
          <Field label="Back (answer)" name="back" error={errors.back} required>
            {(props) => <Textarea {...props} name="back" rows={2} required maxLength={1000} />}
          </Field>
          <Field label="Hint" name="hint" error={errors.hint}>
            {(props) => <Input {...props} name="hint" maxLength={200} />}
          </Field>
          <SubmitButton pending={pending}>Add card</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function FlashcardStudy({
  cards,
}: {
  cards: { id: string; front: string; back: string; hint: string | null; nextReviewAt: Date | null }[];
}) {
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const card = cards[index];

  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">Nothing left to review</p>
        <p className="text-sm text-muted-foreground">You reviewed {done} card{done === 1 ? '' : 's'}. Add more above, or come back tomorrow.</p>
      </div>
    );
  }

  async function answer(correct: boolean) {
    await reviewCardAction(card!.id, correct);
    setRevealed(false);
    setDone((current) => current + 1);
    setIndex((current) => current + 1);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">
        Card {index + 1} of {cards.length} · reviewed {done} this session
      </p>
      <p className="mt-3 text-lg font-semibold text-foreground">{card.front}</p>
      {card.hint && !revealed ? <p className="mt-1 text-sm text-muted-foreground">Hint: {card.hint}</p> : null}

      {revealed ? (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-3">
          <p className="whitespace-pre-wrap text-sm text-foreground">{card.back}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => answer(true)} className="inline-flex h-9 items-center gap-1 rounded-lg bg-success px-3 text-sm font-medium text-success-foreground">
              <Check className="h-4 w-4" aria-hidden="true" />
              I knew it
            </button>
            <button type="button" onClick={() => answer(false)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm">
              <X className="h-4 w-4" aria-hidden="true" />
              Show me again soon
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Show answer
        </button>
      )}
    </div>
  );
}

export function CardList({ cards }: { cards: { id: string; front: string; back: string }[] }) {
  return (
    <ul className="space-y-1">
      {cards.map((card) => (
        <li key={card.id} className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">{card.front}</p>
            <p className="text-muted-foreground">{card.back}</p>
          </div>
          <ConfirmActionButton
            action={() => deleteCardAction(card.id)}
            title="Delete this card?"
            description="It will be removed from the deck."
            confirmLabel="Delete card"
            label="Delete card"
            variant="ghost"
            size="icon"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            className="text-muted-foreground"
          />
        </li>
      ))}
    </ul>
  );
}

export function AssignmentForm({ subjects }: { subjects: Subject[] }) {
  return (
    <ServerForm action={createAssignmentAction} successMessage="Assignment added." resetOnSuccess ariaLabel="Add an assignment" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Lab report 3" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject" name="subjectId" error={errors.subjectId}>
              {(props) => (
                <Select {...props} name="subjectId" defaultValue="">
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Due" name="dueAt" error={errors.dueAt} required>
              {(props) => <Input {...props} name="dueAt" type="date" required />}
            </Field>
            <Field label="Weight (%)" name="weightPct" error={errors.weightPct}>
              {(props) => <Input {...props} name="weightPct" type="number" min={0} max={100} placeholder="20" />}
            </Field>
          </div>
          <Field label="Notes" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} maxLength={600} />}
          </Field>
          <SubmitButton pending={pending}>Add assignment</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function AssignmentRow({
  assignment,
}: {
  assignment: { id: string; title: string; description: string | null; dueAt: Date; status: string; weightPct: number | null; scorePct: number | null; subject: { name: string } | null };
}) {
  const overdue = assignment.status !== 'graded' && assignment.status !== 'submitted' && assignment.dueAt < new Date();
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{assignment.title}</p>
        <p className="text-xs text-muted-foreground">
          {assignment.subject?.name ?? 'No subject'} · due {formatDate(assignment.dueAt)}
          {assignment.weightPct ? ` · ${assignment.weightPct}% of grade` : ''}
          {assignment.scorePct !== null ? ` · scored ${assignment.scorePct}%` : ''}
        </p>
        {assignment.description ? <p className="mt-1 text-xs text-muted-foreground">{assignment.description}</p> : null}
      </div>
      {overdue ? <Badge tone="danger">Overdue</Badge> : <StatusBadge status={assignment.status} />}
      <label htmlFor={`assignment-${assignment.id}`} className="sr-only">
        Status for {assignment.title}
      </label>
      <select
        id={`assignment-${assignment.id}`}
        className="input-base h-8 w-32 text-xs"
        value={assignment.status}
        onChange={(event) => setAssignmentStatusAction(assignment.id, event.target.value)}
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="submitted">Submitted</option>
        <option value="graded">Graded</option>
      </select>
      <ConfirmActionButton
        action={() => deleteAssignmentAction(assignment.id)}
        title="Delete this assignment?"
        description="It will be removed from your planner."
        confirmLabel="Delete"
        label={`Delete ${assignment.title}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function ExamForm({ subjects }: { subjects: Subject[] }) {
  return (
    <ServerForm action={createExamAction} successMessage="Exam added." resetOnSuccess ariaLabel="Add an exam" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Digital electronics final" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject" name="subjectId" error={errors.subjectId}>
              {(props) => (
                <Select {...props} name="subjectId" defaultValue="">
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Date and time" name="examAt" error={errors.examAt} required>
              {(props) => <Input {...props} name="examAt" type="datetime-local" required />}
            </Field>
            <Field label="Room or centre" name="location" error={errors.location}>
              {(props) => <Input {...props} name="location" maxLength={140} />}
            </Field>
          </div>
          <Field label="Syllabus or notes" name="notes" error={errors.notes}>
            {(props) => <Textarea {...props} name="notes" rows={2} maxLength={600} />}
          </Field>
          <SubmitButton pending={pending}>Add exam</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ExamRow({ exam }: { exam: { id: string; title: string; examAt: Date; location: string | null; notes: string | null; subject: { name: string } | null } }) {
  const days = Math.ceil((exam.examAt.getTime() - Date.now()) / 86_400_000);
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{exam.title}</p>
        <p className="text-xs text-muted-foreground">
          {exam.subject?.name ?? 'No subject'} · {formatDateTime(exam.examAt)}
          {exam.location ? ` · ${exam.location}` : ''}
        </p>
        {exam.notes ? <p className="mt-1 text-xs text-muted-foreground">{exam.notes}</p> : null}
      </div>
      <Badge tone={days < 0 ? 'neutral' : days <= 7 ? 'danger' : 'primary'}>{days < 0 ? 'Done' : `in ${days} day${days === 1 ? '' : 's'}`}</Badge>
      <ConfirmActionButton
        action={() => deleteExamAction(exam.id)}
        title="Delete this exam?"
        description="It will be removed from your planner."
        confirmLabel="Delete"
        label={`Delete ${exam.title}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableForm({ subjects }: { subjects: Subject[] }) {
  return (
    <ServerForm action={createTimetableSlotAction} successMessage="Slot added." resetOnSuccess ariaLabel="Add a timetable slot" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Class" name="title" error={errors.title} required>
              {(props) => <Input {...props} name="title" required maxLength={120} placeholder="Signals and systems" />}
            </Field>
            <Field label="Day" name="dayOfWeek" error={errors.dayOfWeek}>
              {(props) => (
                <Select {...props} name="dayOfWeek" defaultValue="1">
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Starts" name="startTime" error={errors.startTime} required>
              {(props) => <Input {...props} name="startTime" type="time" required defaultValue="09:00" />}
            </Field>
            <Field label="Ends" name="endTime" error={errors.endTime} required>
              {(props) => <Input {...props} name="endTime" type="time" required defaultValue="10:00" />}
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject" name="subjectId" error={errors.subjectId}>
              {(props) => (
                <Select {...props} name="subjectId" defaultValue="">
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Room" name="room" error={errors.room}>
              {(props) => <Input {...props} name="room" maxLength={80} />}
            </Field>
          </div>
          <SubmitButton pending={pending}>Add slot</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function TimetableGrid({ slots }: { slots: { id: string; title: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null }[] }) {
  return (
    <div className="space-y-2">
      {DAYS.map((day, dayIndex) => {
        const daySlots = slots.filter((slot) => slot.dayOfWeek === dayIndex);
        return (
          <div key={day} className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</p>
            {daySlots.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Free</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {daySlots.map((slot) => (
                  <li key={slot.id} className="flex items-center gap-2 text-sm">
                    <span className="tabular-nums text-muted-foreground">
                      {slot.startTime}-{slot.endTime}
                    </span>
                    <span className="flex-1 truncate text-foreground">{slot.title}</span>
                    {slot.room ? <span className="text-xs text-muted-foreground">{slot.room}</span> : null}
                    <ConfirmActionButton
                      action={() => deleteTimetableSlotAction(slot.id)}
                      title="Remove this slot?"
                      description={`${slot.title} on ${day} will be removed.`}
                      confirmLabel="Remove"
                      label={`Remove ${slot.title}`}
                      variant="ghost"
                      size="icon"
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      className="text-muted-foreground"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GradeForm() {
  return (
    <ServerForm action={createGradeAction} successMessage="Grade saved." resetOnSuccess ariaLabel="Add a course grade" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Course" name="title" error={errors.title} required>
              {(props) => <Input {...props} name="title" required maxLength={120} />}
            </Field>
            <Field label="Credits" name="credits" error={errors.credits} required>
              {(props) => <Input {...props} name="credits" type="number" min={0} max={30} step="0.5" required defaultValue="3" />}
            </Field>
            <Field label="Grade point (0-10)" name="gradePoint" error={errors.gradePoint} required>
              {(props) => <Input {...props} name="gradePoint" type="number" min={0} max={10} step="0.1" required defaultValue="8" />}
            </Field>
            <Field label="Term" name="term" error={errors.term}>
              {(props) => <Input {...props} name="term" maxLength={40} placeholder="Sem 5" />}
            </Field>
          </div>
          <SubmitButton pending={pending}>Add grade</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function GradeRow({ grade }: { grade: { id: string; title: string; credits: number; gradePoint: number; term: string | null } }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      <span className="flex-1 truncate text-foreground">{grade.title}</span>
      <span className="text-xs text-muted-foreground">
        {grade.credits} credits · {grade.gradePoint} point{grade.term ? ` · ${grade.term}` : ''}
      </span>
      <ConfirmActionButton
        action={() => deleteGradeAction(grade.id)}
        title="Delete this grade?"
        description="Your GPA will be recalculated."
        confirmLabel="Delete"
        label={`Delete ${grade.title}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function ListingRow({ listing }: { listing: { id: string; kind: string; title: string; organization: string | null; description: string; url: string | null; deadline: Date | null; location: string | null; verified: boolean } }) {
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{listing.title}</p>
          <p className="text-xs text-muted-foreground">
            {listing.organization ?? 'Organisation not listed'}
            {listing.location ? ` · ${listing.location}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone="primary">{toLabel(listing.kind)}</Badge>
          {listing.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {listing.url ? (
          <a href={listing.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted">
            Open official link
          </a>
        ) : null}
        {listing.deadline ? <span className="text-xs text-muted-foreground">Apply by {formatDate(listing.deadline)}</span> : null}
      </div>
      {!listing.verified ? (
        <p className="mt-2 text-xs text-warning">
          Unverified listing. Check the official website before paying a fee or sharing documents.
        </p>
      ) : null}
    </li>
  );
}

export function ListingKindFilter({ current }: { current?: string }) {
  return (
    <form action="/students" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tab" value="opportunities" />
      <div>
        <label htmlFor="listing-kind" className="label">
          Type
        </label>
        <select id="listing-kind" name="kind" defaultValue={current ?? ''} className="input-base">
          <option value="">All</option>
          {LISTING_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {toLabel(kind)}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
        Filter
      </button>
    </form>
  );
}

/**
 * Resume and cover letter builder.
 *
 * Everything happens in the browser: nothing typed here is sent to the server or
 * stored, which keeps personal details such as phone numbers out of the database.
 */
export function ResumeBuilder({ defaults }: { defaults: { name: string; headline: string; city: string; email: string } }) {
  const [form, setForm] = React.useState({
    name: defaults.name,
    headline: defaults.headline,
    city: defaults.city,
    email: defaults.email,
    phone: '',
    summary: '',
    education: '',
    skills: '',
    experience: '',
    projects: '',
  });
  const [kind, setKind] = React.useState<'resume' | 'cover'>('resume');
  const [cover, setCover] = React.useState({ company: '', role: '', why: '' });
  const toast = useToast();

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildResume() {
    return [
      form.name,
      form.headline,
      [form.city, form.email, form.phone].filter(Boolean).join(' · '),
      '',
      form.summary ? `SUMMARY\n${form.summary}` : '',
      form.education ? `EDUCATION\n${form.education}` : '',
      form.skills ? `SKILLS\n${form.skills}` : '',
      form.experience ? `EXPERIENCE\n${form.experience}` : '',
      form.projects ? `PROJECTS\n${form.projects}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  function buildCoverLetter() {
    return [
      `Dear ${cover.company ? cover.company + ' team' : 'hiring team'},`,
      '',
      `I am writing to apply for the ${cover.role || 'open role'}.`,
      '',
      form.summary || 'A short paragraph about why you are a good fit.',
      '',
      cover.why || 'Add one specific reason you want this role.',
      '',
      form.skills ? `Relevant skills: ${form.skills.split('\n').join(', ')}` : '',
      '',
      'Thank you for your time.',
      form.name,
      [form.email, form.phone].filter(Boolean).join(' · '),
    ]
      .filter(Boolean)
      .join('\n');
  }

  const output = kind === 'resume' ? buildResume() : buildCoverLetter();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Document type">
          <button type="button" onClick={() => setKind('resume')} aria-pressed={kind === 'resume'} className={`h-9 rounded-lg px-3 text-sm ${kind === 'resume' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
            Resume
          </button>
          <button type="button" onClick={() => setKind('cover')} aria-pressed={kind === 'cover'} className={`h-9 rounded-lg px-3 text-sm ${kind === 'cover' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
            Cover letter
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name">
            {(props) => <Input {...props} value={form.name} onChange={(event) => update('name', event.target.value)} />}
          </Field>
          <Field label="Headline">
            {(props) => <Input {...props} value={form.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Final year electronics student" />}
          </Field>
          <Field label="City">
            {(props) => <Input {...props} value={form.city} onChange={(event) => update('city', event.target.value)} />}
          </Field>
          <Field label="Email">
            {(props) => <Input {...props} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />}
          </Field>
        </div>
        <Field label="Phone" hint="Only used in the text you copy - never stored by OpenHub.">
          {(props) => <Input {...props} value={form.phone} onChange={(event) => update('phone', event.target.value)} />}
        </Field>
        <Field label="Summary">
          {(props) => <Textarea {...props} rows={3} value={form.summary} onChange={(event) => update('summary', event.target.value)} />}
        </Field>
        <Field label="Education (one per line)">
          {(props) => <Textarea {...props} rows={2} value={form.education} onChange={(event) => update('education', event.target.value)} />}
        </Field>
        <Field label="Skills (one per line)">
          {(props) => <Textarea {...props} rows={3} value={form.skills} onChange={(event) => update('skills', event.target.value)} />}
        </Field>
        <Field label="Experience (one per line)">
          {(props) => <Textarea {...props} rows={3} value={form.experience} onChange={(event) => update('experience', event.target.value)} />}
        </Field>
        <Field label="Projects (one per line)">
          {(props) => <Textarea {...props} rows={2} value={form.projects} onChange={(event) => update('projects', event.target.value)} />}
        </Field>

        {kind === 'cover' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company">
              {(props) => <Input {...props} value={cover.company} onChange={(event) => setCover((current) => ({ ...current, company: event.target.value }))} />}
            </Field>
            <Field label="Role">
              {(props) => <Input {...props} value={cover.role} onChange={(event) => setCover((current) => ({ ...current, role: event.target.value }))} />}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Why this role?">
                {(props) => <Textarea {...props} rows={2} value={cover.why} onChange={(event) => setCover((current) => ({ ...current, why: event.target.value }))} />}
              </Field>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(output);
                toast.push({ tone: 'success', title: 'Copied to clipboard.' });
              } catch {
                toast.push({ tone: 'warning', title: 'Copy failed', description: 'Select the text and copy it manually.' });
              }
            }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy text
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted"
            onClick={() => {
              const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = kind === 'resume' ? 'resume.txt' : 'cover-letter.txt';
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .txt
          </button>
          <button type="button" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted" onClick={() => window.print()}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Print / save PDF
          </button>
        </div>
        <label htmlFor="builder-output" className="label">
          Preview
        </label>
        <textarea id="builder-output" readOnly value={output} rows={18} className="input-base font-mono text-xs" />
        <p className="text-xs text-muted-foreground">
          Nothing you type here is uploaded. The builder runs entirely in your browser.
        </p>
        <Checkbox name="builder-tip" label="Tip: keep the resume to one page" defaultChecked disabled />
      </div>
    </div>
  );
}
