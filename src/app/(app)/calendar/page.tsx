import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { listEvents } from '@/features/calendar/service';
import { calendarViewSchema } from '@/features/calendar/schemas';
import { EventForm, EventRow } from '@/features/calendar/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { cn, todayKey } from '@/lib/utils';

export const metadata: Metadata = { title: 'Calendar' };

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const view = calendarViewSchema.parse({ view: params.view ?? 'month', date: params.date });

  const db = await getDb();
  const [{ events, start, end, anchor }, memberships, trips] = await Promise.all([
    listEvents(user.id, view),
    db.groupMember.findMany({ where: { userId: user.id, group: { deletedAt: null } }, include: { group: { select: { id: true, name: true } } } }),
    db.tripMember.findMany({ where: { userId: user.id, trip: { deletedAt: null } }, include: { trip: { select: { id: true, title: true } } } }),
  ]);

  const eventsByDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = todayKey(event.startsAt);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }

  const shift = (direction: -1 | 1) => {
    const next = new Date(anchor);
    if (view.view === 'day') next.setDate(next.getDate() + direction);
    else if (view.view === 'week') next.setDate(next.getDate() + 7 * direction);
    else next.setMonth(next.getMonth() + direction);
    return `/calendar?view=${view.view}&date=${todayKey(next)}`;
  };

  const days: Date[] = [];
  if (view.view === 'month') {
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }
  } else {
    const total = view.view === 'week' ? 7 : 1;
    for (let index = 0; index < total; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      days.push(day);
    }
  }

  const label =
    view.view === 'month'
      ? anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : view.view === 'week'
        ? `Week of ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Calendar"
        description="Personal, group and trip events in one place."
        action={
          <div className="flex items-center gap-2">
            <Link href={shift(-1)} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/calendar?view=${view.view}&date=${todayKey(new Date())}`}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Today
            </Link>
            <Link href={shift(1)} className="rounded-lg border border-border p-2 hover:bg-muted" aria-label="Next period">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{label}</h2>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(['day', 'week', 'month'] as const).map((option) => (
            <Link
              key={option}
              href={`/calendar?view=${option}&date=${todayKey(anchor)}`}
              className={cn(
                'rounded px-3 py-1 text-sm capitalize',
                view.view === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              aria-current={view.view === option ? 'true' : undefined}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = todayKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = key === todayKey(new Date());
              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-20 rounded-lg border p-1 text-left sm:min-h-24',
                    inMonth ? 'border-border bg-card' : 'border-transparent bg-muted/40',
                    isToday && 'border-primary',
                  )}
                >
                  <Link
                    href={`/calendar?view=day&date=${key}`}
                    className={cn('block text-xs font-medium hover:underline', isToday ? 'text-primary' : 'text-muted-foreground')}
                  >
                    {day.getDate()}
                  </Link>
                  <ul className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, view.view === 'month' ? 2 : 20).map((event) => (
                      <li key={event.id} className="truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-primary">
                        {event.title}
                      </li>
                    ))}
                    {dayEvents.length > 2 && view.view === 'month' ? (
                      <li className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="section-title">Events in this view</h2>
        {events.length === 0 ? (
          <EmptyState title="Nothing scheduled" description="Add an event below - it can be personal or shared with a group." />
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <EventRow key={event.id} event={event} canEdit />
            ))}
          </ul>
        )}
      </div>

      <Card>
        <CardHeader title="Add an event" description={`Range shown: ${start.toDateString()} to ${end.toDateString()}`} />
        <CardContent>
          <EventForm
            groups={memberships.map((membership) => membership.group)}
            trips={trips.map((membership) => membership.trip)}
            defaultDate={`${todayKey(anchor)}T09:00`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
