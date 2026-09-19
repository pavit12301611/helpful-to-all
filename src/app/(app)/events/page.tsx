import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listCommunityEvents, listHostableGroups } from '@/features/events/service';
import { EventForm } from '@/features/events/components';
import { Badge, Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Community events' };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const q = (params.q ?? '').trim();

  const [events, hostableGroups] = await Promise.all([listCommunityEvents({ q }), listHostableGroups(user.id)]);

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Community events"
        description="Upcoming events published in public groups: clean-ups, study sessions, meet-ups and classes."
        icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        Only events attached to a public group appear here. Your personal calendar events stay private, and organisers are shown by
        display name rather than contact details.
      </Alert>

      <Card>
        <CardContent className="pt-5">
          <form method="get" action="/events" className="flex flex-wrap items-end gap-3" aria-label="Filter community events">
            <Input name="q" defaultValue={q} placeholder="Search events by title, place or description" aria-label="Search events" className="max-w-md flex-1" />
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState
              title={q ? `No public events match “${q}”` : 'No public events yet'}
              description="Create one below in a public group you belong to, or start a public group first."
              icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
              <CardHeader
                title={event.title}
                description={event.group ? event.group.name : undefined}
                action={<Badge tone="primary">{event.allDay ? 'All day' : event.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>}
              />
              <CardContent className="grid flex-1 gap-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {event.startsAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  {event.endsAt ? ` – ${event.endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
                {event.location ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {event.location}
                  </p>
                ) : null}
                {event.description ? <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p> : null}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {event.owner.profile?.displayName ?? event.owner.username}
                  </span>
                  {event.group ? (
                    <Link href={`/groups/${event.group.slug}`} className="text-sm font-medium text-primary">
                      {labelize(event.group.kind)} group
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventForm groups={hostableGroups} />
    </div>
  );
}
