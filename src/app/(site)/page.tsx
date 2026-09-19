import Link from 'next/link';
import {
  BookOpen,
  Boxes,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Luggage,
  MessageSquare,
  Repeat,
  Search,
  Server,
  Shield,
  Store,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { getDb } from '@/server/db/client';
import { currentUser } from '@/server/core/guards';
import { Card, CardContent, Badge } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

const FEATURE_GROUPS = [
  {
    title: 'Personal productivity',
    icon: CheckSquare,
    href: '/tasks',
    items: [
      'Tasks with subtasks, priorities and repeats',
      'Notes with tags and search',
      'Habits with streaks',
      'Calendar with reminders',
      'Expense tracking with CSV export and splits',
      'Bookmarks, timers and a pomodoro',
    ],
  },
  {
    title: 'Groups',
    icon: Users,
    href: '/groups',
    items: [
      'Roles, invites and join requests',
      'Feed with announcements and polls',
      'Shared tasks, calendar and notes',
      'Shopping lists and shared expenses',
      'File sharing with your own storage',
    ],
  },
  {
    title: 'Community help',
    icon: LifeBuoy,
    href: '/help',
    items: [
      'Ask a question, request help or offer it',
      'Categories, urgency and public/private posts',
      'Accept an answer and mark it solved',
      'Comments, votes, saves and reports',
      'Clear rules for medical, legal and money advice',
    ],
  },
  {
    title: 'Student centre',
    icon: GraduationCap,
    href: '/students',
    items: [
      'Study resources with subject, level and language filters',
      'Flashcards with spaced repetition',
      'Assignments, exams and a timetable',
      'GPA calculator and grade tracking',
      'Scholarships, internships and a resume builder',
    ],
  },
  {
    title: 'Local directory',
    icon: Search,
    href: '/resources',
    items: [
      'Hospitals, libraries, shelters and more',
      'Opening hours, accessibility and price level',
      'Reviews and edit suggestions',
      'Verification by moderators',
      'Maps that work with no API key',
    ],
  },
  {
    title: 'Volunteer & donate',
    icon: HandHeart,
    href: '/volunteer',
    items: [
      'Volunteering opportunities with sign-ups',
      'Donation drives for money or goods',
      'Updates from organisers',
      'Verification before anything is promoted',
      'No payment processing — a provider interface instead',
    ],
  },
  {
    title: 'Safety hub',
    icon: Shield,
    href: '/safety',
    items: [
      'Emergency numbers by country and region',
      'Blood donor registry',
      'First-aid and disaster guides',
      'Missing person reports',
      'Your own emergency card',
    ],
  },
  {
    title: 'Small business tools',
    icon: Store,
    href: '/business',
    items: [
      'Invoices with PDF export',
      'Customers, services and appointments',
      'Inventory with low-stock alerts',
      'Sales records and revenue reports',
      'A public page with a QR code',
    ],
  },
];

const TOOL_ROWS = [
  { label: 'Trip planner', icon: Luggage, href: '/trips', description: 'Itinerary, packing list, shared budget and fair splits.' },
  { label: 'Utility tools', icon: Wrench, href: '/tools', description: 'QR codes, converters, generators — all client-side.' },
  { label: 'Unified search', icon: Search, href: '/search', description: 'One privacy-aware search across everything you can see.' },
  { label: 'Messages', icon: MessageSquare, href: '/messages', description: 'Private conversations that respect message settings.' },
];

export default async function LandingPage() {
  const user = await currentUser();
  const db = await getDb();

  const [members, helpPosts, resources, opportunities, groups] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.helpRequest.count({ where: { hiddenAt: null } }),
    db.localResource.count({ where: { deletedAt: null, status: 'active' } }),
    db.volunteerOpportunity.count({ where: { deletedAt: null, hiddenAt: null } }),
    db.group.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="grid gap-16">
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-20">
        <div className="grid gap-6">
          <Badge tone="primary">Self-hostable · AGPL-3.0 · No paid API required</Badge>
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            The community toolkit your neighbourhood, class and small business actually need.
          </h1>
          <p className="text-lg text-muted-foreground">
            OpenHub puts tasks, groups, community help, student tools, a local directory, volunteering, safety information and
            business utilities in one place you can host yourself — with privacy controls that are on by default and moderation that
            is always logged.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create a free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-base font-medium text-foreground hover:bg-muted"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Members', members],
              ['Help posts', helpPosts],
              ['Local resources', resources],
              ['Volunteer drives', opportunities],
              ['Groups', groups],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Card>
          <CardContent className="grid gap-4 pt-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden="true" /> What you can do in five minutes
            </p>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {[
                'Plan today with tasks, habits and a calendar',
                'Ask your neighbourhood for help, or answer someone',
                'Find a hospital, library or shelter near you',
                'Share study notes and flashcards with your class',
                'Send a customer an invoice as a PDF',
                'Generate a QR code without sending the text anywhere',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Alert tone="warning">
              OpenHub is not a replacement for official emergency services. In an emergency, call your local emergency number.
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section id="features" className="mx-auto grid w-full max-w-6xl gap-6 px-4">
        <div className="grid gap-2">
          <h2 className="text-3xl font-semibold text-foreground">Everything in one deployment</h2>
          <p className="text-muted-foreground">
            Eight subsystems, each with real permissions, empty states and moderation. Nothing here is a mock-up.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.title} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                  <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {group.title}
                  </span>
                  <ul className="grid gap-1.5 text-sm text-muted-foreground">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link href={group.href} className="mt-auto text-sm font-medium text-primary">
                    Open {group.title.toLowerCase()}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4">
        <h2 className="text-3xl font-semibold text-foreground">And the smaller tools you reach for daily</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_ROWS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.label}>
                <CardContent className="grid gap-2 pt-6">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {tool.label}
                  </span>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                  <Link href={tool.href} className="text-sm font-medium text-primary">
                    Open
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-3">
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Lock className="h-5 w-5 text-primary" aria-hidden="true" /> Privacy by default
            </span>
            <p className="text-sm text-muted-foreground">
              Profiles are private until you make them public. Exact addresses are never published. Messages, notes and private help
              posts stay between the people involved. No advertising, no third-party analytics.
            </p>
            <Link href="/privacy" className="text-sm font-medium text-primary">
              Read the privacy policy
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" /> Moderation you can audit
            </span>
            <p className="text-sm text-muted-foreground">
              Reports, hidden content, warnings, suspensions and verifications are all written to an audit log with the moderator,
              target and timestamp. Content is hidden, not destroyed, so mistakes can be reversed.
            </p>
            <Link href="/guidelines" className="text-sm font-medium text-primary">
              Read the guidelines
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Server className="h-5 w-5 text-primary" aria-hidden="true" /> Runs on your own server
            </span>
            <p className="text-sm text-muted-foreground">
              Next.js, PostgreSQL and Prisma. One Docker Compose file. Every external service — email, maps, currency, storage,
              payments — is optional and replaceable, and the core works without any of them.
            </p>
            <Link href="/docs" className="text-sm font-medium text-primary">
              Read the setup guide
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4">
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Boxes className="h-5 w-5 text-primary" aria-hidden="true" /> What is included
            </span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CheckSquare, label: 'Tasks & habits' },
                { icon: CalendarDays, label: 'Calendar & events' },
                { icon: Wallet, label: 'Expenses & CSV export' },
                { icon: Repeat, label: 'Recurring to-dos' },
                { icon: BookOpen, label: 'Notes & bookmarks' },
                { icon: Users, label: 'Groups & polls' },
                { icon: LifeBuoy, label: 'Community help' },
                { icon: GraduationCap, label: 'Student centre' },
                { icon: Search, label: 'Local directory' },
                { icon: HandHeart, label: 'Volunteering' },
                { icon: Shield, label: 'Safety hub' },
                { icon: Store, label: 'Business tools' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
