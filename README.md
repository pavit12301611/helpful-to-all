# OpenHub

**A free, self-hostable community utility platform.** Tasks, groups, community help, student tools, a local resource directory, volunteering, a safety hub and small business tools — in one deployment you run yourself.

OpenHub is a real full-stack application: 51 server-rendered pages, 4 API routes, 85 database models, 26 feature modules, server actions with typed validation, role-based permissions, moderation with an audit trail, and automated tests. Nothing here is a mock-up.

Licensed **AGPL-3.0** (see [LICENSE](LICENSE) and [why AGPL](#why-agpl-30)).

---

## Contents

- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [What is included](#what-is-included)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Database](#database)
- [Docker](#docker)
- [Testing](#testing)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Quick start

Requirements: **Node.js 20+** (22 recommended) and npm. PostgreSQL is optional — SQLite works for local development with no setup.

```bash
git clone <your-fork> && cd helpful-to-all
cp .env.example .env          # then set AUTH_SECRET
npm install

# Local development (SQLite, zero infrastructure):
npm run setup:sqlite          # installs deps, generates the client, creates + seeds prisma/dev.db
npm run dev                   # http://localhost:3000
```

With PostgreSQL instead:

```bash
# .env: DATABASE_URL="postgresql://openhub:openhub@localhost:5432/openhub?schema=public"
#       OPENHUB_DB="postgresql"
npm run setup:postgres        # installs deps, applies prisma/migrations, seeds demo data
npm run dev
```

Generate an `AUTH_SECRET` with `openssl rand -base64 32`. It is the only variable that is truly required; everything else has a working default.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build and standalone server |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run lint` | ESLint with `--max-warnings=0` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright journeys (Chromium + mobile viewport) |
| `npm run check` | Typecheck + lint + unit tests |
| `npm run format` / `format:check` | Prettier |
| `npm run db:generate` / `db:generate:sqlite` | Prisma client for PostgreSQL / SQLite |
| `npm run db:migrate:deploy` | Apply `prisma/migrations` (PostgreSQL) |
| `npm run db:seed` | Idempotent demo seed (`--force` recreates) |
| `npm run setup:sqlite` / `setup:postgres` / `setup:docker` | One-command environment setup |

---

## Demo accounts

`npm run db:seed` creates three members. Password for all of them: **`OpenHub!2345`** (override with `SEED_PASSWORD` before seeding — change it if your instance is reachable from the internet).

| Email | Role | What to look at |
| --- | --- | --- |
| `admin@openhub.test` | Administrator | `/admin` — report queue, members, verification, audit log |
| `priya@openhub.test` | Student | Tasks, notes, habits, `/students`, `/help` |
| `rahul@openhub.test` | Organiser / small business | `/groups`, `/volunteer`, `/business` (invoices, inventory, QR page) |

> **All seeded content is demo data.** Every seeded name, business, listing and post is fictional and marked as a demo. Replace or delete it before using OpenHub publicly.

---

## What is included

### Personal productivity — `/tasks` `/notes` `/habits` `/calendar` `/expenses` `/bookmarks` `/timers`
Tasks with subtasks, priorities, labels and daily/weekly/monthly recurrence · notes with tags · habits with streaks · calendar with day/week/month views and reminders · expense tracking with categories, CSV export and splits · bookmarks · pomodoro, stopwatch and countdown (browser-only state).

### Groups — `/groups`
Public, private and invite-only groups · owner/admin/moderator/member roles · invitations with hashed tokens and 14-day expiry · join requests · feed with announcements, pins and polls · shared tasks, calendar, notes, shopping lists, expenses and files.

### Community help — `/help`
Questions, requests and offers · categories and urgency · public or private visibility · answers with an accepted answer and solved state · comments, votes, saves and reports · explicit rules for medical, legal and financial topics.

### Student centre — `/students` `/resources`
Study resources filterable by subject, level, language, difficulty, file type, institution and tags · flashcards with spaced repetition · assignments, exams and a timetable · GPA calculator · scholarships and internships · resume and cover-letter builders · doubt discussions · copyright rules on every upload.

### Skill exchange — `/skills`
Teach and learn listings · matching by skill and city · connect requests with scheduling · reviews and ratings · no exact home addresses, ever.

### Local resource directory — `/resources`
17 categories (hospitals, libraries, shelters, food banks, mental health, legal aid, and more) · opening hours, accessibility and price level · verification by moderators · reviews and edit suggestions · a map abstraction that produces OpenStreetMap/Google links with **no API key**.

### Volunteer & donation centre — `/volunteer`
Volunteering opportunities with skills/items needed and sign-ups · donation campaigns for money or goods with progress and updates · organiser verification · **no payment processing**, only a provider interface for the future · a "verify before sending money or goods" warning on every campaign.

### Safety hub — `/safety`
Emergency numbers by country and region · blood donor registry · first-aid and disaster guides · missing person reports · a personal emergency card · and an explicit statement that OpenHub is **not** a replacement for official emergency services and never contacts them.

### Small business tools — `/business`
Business profile with a public page and QR code · services, customers and appointments (public booking) · inventory with low-stock alerts · invoices with line items, tax and **PDF export** · sales records and revenue reports (by day, by method, outstanding, low stock) · canned messages.

### Trip planner — `/trips`
Itinerary, shared packing list, shared budget with even splits and settle tracking, polls, notes, map links and important contacts.

### Utility tools — `/tools`
22 tools: QR generator, password generator and strength checker, placeholder text, random picker, case converter, word counter, JSON formatter, CSV⇄JSON, Base64, URL encode/decode, SHA hashes, unit converter, currency converter, time zones, colour + WCAG contrast, percentage, BMI, bill splitter, age, date difference and countdown. **All of them run in the browser.** Nothing you type is stored — the only server call is asking for a QR image, and that text is not persisted.

### Discovery, notifications and messaging — `/search` `/notifications` `/messages` `/saved` `/activity` `/members`
One privacy-aware search across people, groups, help, events, resources, skills, student material, volunteering, businesses and your own content · notifications with per-type muting · private direct messages that respect each member's message settings · saved items · your own activity history · a public member directory that only lists profiles set to public.

### Admin & moderation — `/admin`
Report queue with outcomes · hide/restore content · lock discussions · warn, suspend and reinstate members · change roles · verify resources, opportunities and campaigns · hidden-content review · audit log and moderation history. **Every action is logged.**

---

## Architecture

```
src/
  app/                      Next.js App Router: (site) public pages, (app) shell pages, (auth), api/
  components/               UI primitives (button, card, field, dialog, feedback, list) and layout
  features/                 26 modules: schemas.ts (Zod) + service.ts + actions.ts + components.tsx
  server/
    core/                   session, guards, permissions, runAction, audit, page guards
    services/               email, notifications, maps, payments, storage, moderation, search, pdf
    db/                     Prisma client + dialect adapters
  lib/                      enums, env, errors, rate-limit, security, i18n messages, utils
  generated/prisma/         Generated Prisma client (gitignored)
```

The rules the codebase follows:

1. **Routes never touch Prisma.** A page or route calls a feature service; a server action calls `runAction`, which validates with Zod and normalises every failure into a serialisable `ActionResult`.
2. **Services own authorisation.** Membership, ownership and role checks live in `features/*/service.ts`, so a forgotten UI check cannot leak data.
3. **Errors are typed.** `NotFoundError`, `ForbiddenError`, `ConflictError` and `RateLimitError` map to user-facing messages; stack traces never reach the browser.
4. **Every privileged action is audited** through `audit()` and surfaced in `/admin?tab=audit`.
5. **External services are optional.** Email, storage, maps, currency rates, Redis and payments all have a null/local default so the core runs with only a database.

---

## Configuration

Every variable is documented in [`.env.example`](.env.example) and in [docs/environment.md](docs/environment.md). No secret is hard-coded anywhere in the source.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./prisma/dev.db` or a `postgresql://` URL |
| `OPENHUB_DB` | no | `sqlite` or `postgresql` (inferred from the URL) |
| `AUTH_SECRET` | yes in production | `openssl rand -base64 32` |
| `APP_URL` | no | Used for invite and notification links |
| `SESSION_TTL_DAYS` | no | Default 30 |
| `EMAIL_PROVIDER` | no | `console` (default), `smtp` or `resend` |
| `STORAGE_PROVIDER` | no | `local` (default) or `s3` |
| `MAP_PROVIDER` | no | `openstreetmap` (default) or `none` |
| `CURRENCY_API_KEY` | no | Only for the currency tool's live rates |
| `REDIS_URL` | no | Shared rate limiting; in-memory otherwise |
| `ALLOW_EMBED` | no | Set to `true` to allow iframe embedding (dev previews) |
| `ENABLE_HSTS` | no | Send HSTS outside production (only behind HTTPS) |
| `SEED_PASSWORD` | no | Password for the demo accounts |

---

## Database

- **Schema:** `prisma/schema.prisma` — 85 models covering every subsystem.
- **Migrations:** `prisma/migrations/0001_init/migration.sql` is the full initial DDL; `npm run db:migrate:deploy` applies it.
- **SQLite for development:** `npm run db:generate:sqlite` generates a SQLite-dialect schema, and `scripts/db-push.mjs` creates the tables (with foreign keys enabled per connection).
- **Seed:** `prisma/seed.ts` is idempotent — run it repeatedly, or pass `--force` to recreate everything.

See [docs/database.md](docs/database.md).

---

## Docker

```bash
cp .env.example .env      # set AUTH_SECRET (and POSTGRES_PASSWORD)
docker compose up -d --build
docker compose exec app npm run db:migrate:deploy
docker compose exec app npm run db:seed      # optional demo data
```

The app runs as a non-root user, uses the Next.js standalone output, exposes port 3000 and has a health check. See [docs/docker.md](docs/docker.md) and [docs/deployment.md](docs/deployment.md).

---

## Testing

```bash
npm run check        # typecheck + lint + unit tests
npm test             # 73 unit tests (pure functions: splits, streaks, GPA, invoice totals, tools…)
npm run test:e2e     # 30 Playwright tests across 10 named journeys
npx playwright install --with-deps chromium   # once, before the first e2e run
```

The ten end-to-end journeys:

1. **Register and reach the dashboard** — account creation, navigation, field errors
2. **Task lifecycle** — create, subtask, complete, confirmed delete
3. **Ask, answer and solve** — help request answered by a second member and accepted
4. **Join a group and post** — public group discovery, joining, feed post
5. **Trip with a shared budget** — itinerary, shared expense, split balances, packing list
6. **Invoice and PDF export** — create an invoice, fetch the PDF, confirm it is owner-only
7. **Verify a listing and audit it** — moderation queue, verification, audit log, staff-only access
8. **Report content and review it** — report as a member, outcome recorded by a moderator
9. **Utility tools run in the browser** — password generation with no server call, QR image, unit/colour tools
10. **Privacy controls and data export** — private profile disappears from the directory, JSON export, deletion requires password + typed `DELETE`

---

## Documentation

| Document | Contents |
| --- | --- |
| [docs/environment.md](docs/environment.md) | Every variable, defaults and production recommendations |
| [docs/database.md](docs/database.md) | Schema overview, migrations, SQLite vs PostgreSQL, seeding |
| [docs/docker.md](docs/docker.md) | Compose setup, volumes, health checks, backups |
| [docs/deployment.md](docs/deployment.md) | Production checklist, HTTPS, scaling, monitoring |
| [docs/architecture.md](docs/architecture.md) | Layering, permissions, error handling, data flow |
| [docs/api.md](docs/api.md) | Server actions and API routes, with auth requirements |
| [docs/moderation.md](docs/moderation.md) | Moderator handbook: reports, hiding, suspensions, audit |
| [docs/privacy.md](docs/privacy.md) | What is stored, what never is, member controls |
| [docs/roadmap.md](docs/roadmap.md) | What is deliberately not in v1 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, conventions, review process |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community expectations |
| [SECURITY.md](SECURITY.md) | How to report a vulnerability |

The same policies are rendered inside the app at `/guidelines`, `/privacy`, `/terms` and `/docs`.

---

## Roadmap

Deliberately **not** in v1 (and why): payment processing (interface only — [docs/roadmap.md](docs/roadmap.md)), push notifications, offline mobile apps, real-time presence, multi-tenancy, and automatic emergency-service contact (never planned — that would be dangerous).

---

## Why AGPL-3.0

OpenHub is community infrastructure: it holds people's personal data, their health-adjacent requests, their money records and their safety information. A permissive licence would allow someone to take this code, run it as a closed service, and keep every improvement — including security fixes — to themselves. AGPL-3.0 closes that gap: **anyone who runs a modified OpenHub over a network must offer their users the source**, including their changes.

For a community platform that is the behaviour we want: fixes flow back to everyone, and instances cannot quietly diverge on safety or privacy.

If maximum reuse matters more to you than that guarantee (for example, you want to embed OpenHub in a product under an incompatible licence), the AGPL permits relicensing by the copyright holders — open an issue to discuss a dual licence, or start from an MIT-licensed alternative.

---

## Licence and credits

OpenHub is © its contributors and released under the [GNU Affero General Public License v3.0](LICENSE).

Third-party dependencies keep their own licences; none of them require a paid API for core functionality. `better-sqlite3` is a development convenience only — production uses PostgreSQL.
