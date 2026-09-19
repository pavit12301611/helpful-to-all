import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Database, FileText, KeyRound, Server, Shield, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Documentation' };

const QUICK_START = [
  'git clone <your-fork> && cd helpful-to-all',
  'cp .env.example .env   # then set AUTH_SECRET and DATABASE_URL',
  'npm install',
  'npm run setup:sqlite     # or setup:postgres / setup:docker',
  'npm run dev              # http://localhost:3000',
];

const DOC_GROUPS = [
  {
    title: 'Getting started',
    icon: Terminal,
    items: [
      { label: 'Quick start (SQLite)', body: 'Fastest path: one command creates the database, applies the schema and seeds demo data.' },
      { label: 'PostgreSQL', body: 'Set DATABASE_URL, run `npm run setup:postgres` which applies prisma/migrations and seeds.' },
      { label: 'Docker Compose', body: '`docker compose up` starts Postgres and the app together; see docs/docker.md.' },
    ],
  },
  {
    title: 'Configuration',
    icon: KeyRound,
    items: [
      { label: 'Environment variables', body: 'Every variable is documented in .env.example and docs/environment.md. No secret is hard-coded.' },
      { label: 'Optional services', body: 'Email, object storage, currency rates, Redis rate limiting and payments are all optional.' },
      { label: 'Feature flags', body: 'ALLOW_EMBED controls framing, ENABLE_HSTS controls the HSTS header, MAP_PROVIDER picks map links.' },
    ],
  },
  {
    title: 'Architecture',
    icon: Server,
    items: [
      { label: 'Layering', body: 'app/ routes → features/*/actions (server actions) → features/*/service → server/services. UI never talks to Prisma.' },
      { label: 'Permissions', body: 'Roles map to permissions in server/core/permissions.ts; guards in server/core/guards.ts.' },
      { label: 'Errors', body: 'Every action returns a serialisable ActionResult; service errors are AppError subclasses.' },
    ],
  },
  {
    title: 'Data',
    icon: Database,
    items: [
      { label: 'Schema', body: '85 Prisma models in prisma/schema.prisma; SQLite variant generated for local development.' },
      { label: 'Migrations', body: 'prisma/migrations/0001_init contains the full DDL; `npm run db:migrate:deploy` applies it.' },
      { label: 'Seed data', body: 'prisma/seed.ts is idempotent and marks everything as demo. Override SEED_PASSWORD.' },
    ],
  },
  {
    title: 'Moderation',
    icon: Shield,
    items: [
      { label: 'Report queue', body: '/admin?tab=queue — review, hide, restore, lock and record an outcome.' },
      { label: 'Audit log', body: 'Every privileged action writes ModerationAction and AuditLog rows.' },
      { label: 'Verification', body: 'Resources, opportunities and campaigns are verified from /admin?tab=verify.' },
    ],
  },
  {
    title: 'Policies',
    icon: FileText,
    items: [
      { label: 'Community guidelines', body: 'What belongs where, and how enforcement works.' },
      { label: 'Privacy', body: 'What is stored, what never is, and the controls members have.' },
      { label: 'Terms of use', body: 'Baseline terms for the software and for instance operators.' },
    ],
  },
];

const DEMO_ACCOUNTS = [
  { email: 'admin@openhub.test', role: 'Administrator — moderation console and audit log' },
  { email: 'priya@openhub.test', role: 'Student — tasks, notes, student centre' },
  { email: 'rahul@openhub.test', role: 'Organiser — groups, volunteering, business tools' },
];

export default function DocsPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-12">
      <SectionHeading
        title="Documentation"
        description="How to run OpenHub, how it is put together, and how to moderate an instance."
        icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        The long-form documents live in the <code>docs/</code> folder of the repository. This page summarises them and links the
        policies that are rendered inside the app.
      </Alert>

      <Card>
        <CardHeader title="Quick start" description="Local development with SQLite. Switch to PostgreSQL for production." />
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            {QUICK_START.join('\n')}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Demo accounts (password <code>OpenHub!2345</code>, or whatever you set in <code>SEED_PASSWORD</code>):
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <code>{account.email}</code> — {account.role}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOC_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title}>
              <CardHeader
                title={group.title}
                icon={<Icon className="h-5 w-5" aria-hidden="true" />}
              />
              <CardContent>
                <ul className="grid gap-3 text-sm">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-muted-foreground">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Policies inside the app" />
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/guidelines" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted">
            Community guidelines
          </Link>
          <Link href="/privacy" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted">
            Terms of use
          </Link>
          <Link href="/safety" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted">
            Safety hub
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
