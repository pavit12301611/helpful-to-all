import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarDays,
  Flame,
  HandHeart,
  LifeBuoy,
  Phone,
  Repeat,
  ShieldAlert,
  Users,
  Wallet,
  CheckSquare,
  GraduationCap,
  Heart,
  BellRing,
} from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { loadDashboardData } from '@/features/dashboard/service';
import { DashboardCustomizer } from '@/features/dashboard/components';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { cn, formatDate, formatMoney, formatRelative, labelize } from '@/lib/utils';
import type { WidgetKey } from '@/lib/dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUserPage();
  const db = await getDb();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const data = await loadDashboardData(user.id, profile?.city ?? null);
  const firstName = (profile?.displayName ?? user.username).split(' ')[0];
  const compact = data.preferences.layout === 'compact';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.summary.open} open task{data.summary.open === 1 ? '' : 's'}
            {data.summary.overdue > 0 ? ` · ${data.summary.overdue} overdue` : ''} ·{' '}
            {data.events.length} event{data.events.length === 1 ? '' : 's'} in the next week
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/help/new"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ask for help
          </Link>
          <DashboardCustomizer
            widgets={data.widgets}
            layout={data.preferences.layout}
            defaultModule={data.preferences.defaultModule}
            pinnedTools={data.preferences.pinnedTools.split(',').filter(Boolean)}
          />
        </div>
      </div>

      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {data.widgets
          .filter((widget) => widget.visible)
          .sort((a, b) => a.order - b.order)
          .map((widget) => (
            <WidgetShell key={widget.key} widgetKey={widget.key} wide={widget.key === 'community' && !compact}>
              {renderWidget(widget.key, data)}
            </WidgetShell>
          ))}
      </div>
    </div>
  );
}

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;

const WIDGET_META: Record<WidgetKey, { title: string; href: string; icon: React.ReactNode }> = {
  tasks: { title: "Today's tasks", href: '/tasks', icon: <CheckSquare className="h-5 w-5" aria-hidden="true" /> },
  events: { title: 'Upcoming events', href: '/calendar', icon: <CalendarDays className="h-5 w-5" aria-hidden="true" /> },
  habits: { title: 'Habit progress', href: '/habits', icon: <Repeat className="h-5 w-5" aria-hidden="true" /> },
  community: { title: 'Recent community posts', href: '/help', icon: <LifeBuoy className="h-5 w-5" aria-hidden="true" /> },
  nearbyHelp: { title: 'Help near you', href: '/help', icon: <Users className="h-5 w-5" aria-hidden="true" /> },
  suggestedSkills: { title: 'Skills to learn', href: '/skills', icon: <GraduationCap className="h-5 w-5" aria-hidden="true" /> },
  saved: { title: 'Saved items', href: '/saved', icon: <Heart className="h-5 w-5" aria-hidden="true" /> },
  expenses: { title: 'Expense summary', href: '/expenses', icon: <Wallet className="h-5 w-5" aria-hidden="true" /> },
  reminders: { title: 'Important reminders', href: '/students', icon: <BellRing className="h-5 w-5" aria-hidden="true" /> },
  groups: { title: 'Recommended groups', href: '/groups', icon: <Users className="h-5 w-5" aria-hidden="true" /> },
  volunteer: { title: 'Volunteer opportunities', href: '/volunteer', icon: <HandHeart className="h-5 w-5" aria-hidden="true" /> },
  emergency: { title: 'Emergency shortcut', href: '/safety', icon: <ShieldAlert className="h-5 w-5" aria-hidden="true" /> },
};

function WidgetShell({
  widgetKey,
  wide,
  children,
}: {
  widgetKey: WidgetKey;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const meta = WIDGET_META[widgetKey];
  return (
    <Card className={cn('flex flex-col', wide && 'lg:col-span-2')}>
      <CardHeader
        title={meta.title}
        icon={meta.icon}
        action={
          <Link href={meta.href} className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        }
      />
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

function renderWidget(key: WidgetKey, data: DashboardData): React.ReactNode {
  switch (key) {
    case 'tasks':
      return data.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks due today. Enjoy the quiet.</p>
      ) : (
        <ul className="space-y-2">
          {data.tasks.map((task) => {
            const overdue = task.dueAt ? task.dueAt < new Date() : false;
            return (
              <li key={task.id} className="flex items-start justify-between gap-2">
                <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 text-sm hover:underline">
                  <span className="block truncate">{task.title}</span>
                  <span className={cn('text-xs', overdue ? 'text-danger' : 'text-muted-foreground')}>
                    {overdue ? 'Overdue · ' : 'Due '}
                    {task.dueAt ? formatRelative(task.dueAt) : 'no date'}
                  </span>
                </Link>
                <Badge tone={task.priority === 'urgent' ? 'danger' : 'neutral'}>{labelize(task.priority)}</Badge>
              </li>
            );
          })}
        </ul>
      );

    case 'events':
      return data.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        <ul className="space-y-2">
          {data.events.map((event) => (
            <li key={event.id} className="text-sm">
              <Link href="/calendar" className="block truncate font-medium hover:underline">
                {event.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatRelative(event.startsAt)}
                {event.location ? ` · ${event.location}` : ''}
                {event.group ? ` · ${event.group.name}` : ''}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'habits':
      return data.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No habits yet. Small daily wins add up.</p>
      ) : (
        <ul className="space-y-2">
          {data.habits.slice(0, 5).map((habit) => (
            <li key={habit.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href="/habits" className="truncate hover:underline">
                {habit.title}
              </Link>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                {habit.streak}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'reminders': {
      const items = [
        ...data.exams.map((exam) => ({ id: exam.id, label: `Exam: ${exam.title}`, at: exam.examAt, href: '/students' })),
        ...data.assignments.map((assignment) => ({
          id: assignment.id,
          label: `Assignment: ${assignment.title}`,
          at: assignment.dueAt,
          href: '/students',
        })),
      ].sort((a, b) => a.at.getTime() - b.at.getTime());

      return items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing due in the next seven days.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <Link href={item.href} className="block truncate hover:underline">
                {item.label}
              </Link>
              <span className="text-xs text-muted-foreground">{formatDate(item.at)}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'nearbyHelp':
      return data.nearbyHelp.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open requests in your city yet. Add your city in your profile to see local requests.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.nearbyHelp.map((request) => (
            <li key={request.id} className="text-sm">
              <Link href={`/help/${request.id}`} className="block truncate font-medium hover:underline">
                {request.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {labelize(request.category)} · {formatRelative(request.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'community':
      return data.community.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public requests yet. Be the first to ask or offer help.</p>
      ) : (
        <ul className="space-y-2">
          {data.community.map((request) => (
            <li key={request.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/help/${request.id}`} className="block truncate text-sm font-medium hover:underline">
                  {request.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {request.author.profile?.displayName ?? request.author.username} · {labelize(request.category)} ·{' '}
                  {formatRelative(request.createdAt)}
                </span>
              </div>
              <Badge tone={request.urgency === 'urgent' ? 'danger' : 'neutral'}>{labelize(request.urgency)}</Badge>
            </li>
          ))}
        </ul>
      );

    case 'expenses':
      return (
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-foreground">{formatMoney(data.expenseTotalCents)}</p>
          <p className="text-sm text-muted-foreground">
            Spent this month across {data.expenseCategories} categor{data.expenseCategories === 1 ? 'y' : 'ies'}.
          </p>
          <Link href="/expenses" className="link text-sm">
            Add or export expenses
          </Link>
        </div>
      );

    case 'groups':
      return data.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No new public groups right now.</p>
      ) : (
        <ul className="space-y-2">
          {data.groups.map((group) => (
            <li key={group.id} className="text-sm">
              <Link href={`/groups/${group.slug}`} className="block truncate font-medium hover:underline">
                {group.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {group._count.members} member{group._count.members === 1 ? '' : 's'} · {labelize(group.kind)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'volunteer':
      return data.volunteer.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open opportunities right now.</p>
      ) : (
        <ul className="space-y-2">
          {data.volunteer.map((opportunity) => (
            <li key={opportunity.id} className="text-sm">
              <Link href={`/volunteer/${opportunity.id}`} className="block truncate font-medium hover:underline">
                {opportunity.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {labelize(opportunity.cause)}
                {opportunity.city ? ` · ${opportunity.city}` : ''}
                {opportunity.verified ? ' · verified' : ''}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'saved':
      return data.saved.length === 0 ? (
        <p className="text-sm text-muted-foreground">Save anything - a resource, a request or a group - to find it here.</p>
      ) : (
        <ul className="space-y-2">
          {data.saved.map((item) => (
            <li key={item.id} className="text-sm">
              <Link href="/saved" className="block truncate hover:underline">
                {labelize(item.targetType)}
              </Link>
              <span className="text-xs text-muted-foreground">Saved {formatRelative(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      );

    case 'suggestedSkills':
      return data.skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No skill offers yet. You can be the first to teach something.</p>
      ) : (
        <ul className="space-y-2">
          {data.skills.map((offer) => (
            <li key={offer.id} className="text-sm">
              <Link href={`/skills?skill=${encodeURIComponent(offer.skill.name)}`} className="block truncate font-medium hover:underline">
                Learn {offer.skill.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                with {offer.user.profile?.displayName ?? offer.user.username} · {labelize(offer.level)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'emergency':
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            OpenHub is not a replacement for official emergency services. In an emergency, call your local number.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/safety"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-danger px-3 text-sm font-medium text-danger-foreground"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Open safety hub
            </Link>
            <Link
              href="/safety/contacts"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              My emergency card
            </Link>
          </div>
        </div>
      );

    default:
      return <EmptyState title="Widget unavailable" />;
  }
}
