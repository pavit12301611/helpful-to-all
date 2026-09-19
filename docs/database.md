# Database

OpenHub targets **PostgreSQL** in production and supports **SQLite** for local development so contributors can run the whole stack with no infrastructure.

- Schema: `prisma/schema.prisma` — 85 models.
- Initial migration: `prisma/migrations/0001_init/migration.sql` (full DDL, 123 foreign keys).
- Seed: `prisma/seed.ts` — idempotent, marks everything as demo data.
- Scripts: `scripts/db-push.mjs` (SQLite table creation), `scripts/make-sqlite-schema.mjs` (SQLite dialect schema), `scripts/write-init-migration.mjs` (regenerate the initial migration), `scripts/verify-seed.ts`, `scripts/dev-session.ts`.

## PostgreSQL

```bash
# .env
DATABASE_URL="postgresql://openhub:openhub@localhost:5432/openhub?schema=public"
OPENHUB_DB="postgresql"

npm run db:generate          # Prisma client for PostgreSQL
npm run db:migrate:deploy    # apply prisma/migrations
npm run db:seed              # optional demo data
```

## SQLite

```bash
npm run db:generate:sqlite                             # generates prisma/sqlite.schema.prisma + client
DATABASE_URL="file:./prisma/dev.db" npm run db:push    # creates the 85 tables
npm run db:seed
```

SQLite foreign-key enforcement is per connection, so `src/server/sqlite-adapter.ts` wraps the driver adapter and issues `PRAGMA foreign_keys = ON` for every connection. Do not remove that wrapper.

`prisma db push` and `prisma migrate` need network access for engine downloads; `scripts/db-push.mjs` performs the same DDL work offline, which is why it exists.

## Dialect differences in code

All dialect-specific behaviour funnels through `src/lib/db-config.ts`:

- `dbDialect` / `isSqlite` — detected from `OPENHUB_DB` or the URL prefix.
- `contains(value)` — adds `mode: 'insensitive'` on PostgreSQL only (SQLite comparisons are already case-insensitive for ASCII and reject the option).
- `searchTerms(query)` — shared keyword splitting.

Never write a raw `contains: { mode: 'insensitive' }` in a feature; use `contains()` so both dialects work.

## Seeding

```bash
DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/seed.ts          # additive
DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/seed.ts --force  # recreate demo data
```

`--force` deletes seeded rows first (including `AuditLog`, whose `actorId` uses `onDelete: SetNull` and therefore is not cascaded). `tsx` does not load `.env`, so pass `DATABASE_URL` explicitly.

The seed creates:

- three demo members (`admin@`, `priya@`, `rahul@openhub.test`, password `OpenHub!2345` or `SEED_PASSWORD`),
- roles and permissions,
- tasks, notes, habits, bookmarks, expenses and calendar events,
- a public group with posts and a poll,
- help requests with answers and comments,
- student resources, flashcards, assignments and listings,
- local resources, volunteer opportunities and a donation campaign,
- emergency numbers, guides, a blood donor and a missing person report,
- a business profile with services, customers, inventory, appointments, an invoice and sales.

Everything seeded is fictional. Delete it before going public.

## Backups

```bash
pg_dump "$DATABASE_URL" -Fc -f openhub-$(date +%F).dump     # PostgreSQL
cp prisma/dev.db prisma/dev.db.bak                          # SQLite
```

Also back up the upload directory (`storage/uploads` or your object storage bucket) — files are referenced by id in the database and are not stored inline.

## Adding a model

1. Edit `prisma/schema.prisma` (add relations, indexes and comments).
2. Write the migration SQL in a new folder under `prisma/migrations/`, or regenerate the initial migration for a fresh install with `npm run db:migration:sql`.
3. Run `npm run db:generate` and `npm run db:generate:sqlite` so both dialects stay in sync.
4. Add the service functions and the `runAction` wrappers, plus permission checks.
5. Extend the seed and the audit log if the model is moderation-relevant.
