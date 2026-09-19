import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 keeps connection configuration here instead of the schema file.
 *
 * OpenHub supports two dialects:
 *   - PostgreSQL (default, production, Docker)  -> `@prisma/adapter-pg`
 *   - SQLite     (zero-setup local dev / CI)     -> `@prisma/adapter-better-sqlite3`
 *
 * Select the dialect with OPENHUB_DB=sqlite (see docs/database.md).
 */
/**
 * Air-gapped installs: Prisma's CLI normally downloads its `schema-engine`
 * binary from binaries.prisma.sh. When that host is unreachable, set
 * OPENHUB_OFFLINE=true - generate/push then run fully offline (WASM parser +
 * scripts/db-push.mjs) and the unused binary path is satisfied with a no-op.
 * See docs/offline-install.md.
 */
if (process.env.OPENHUB_OFFLINE === 'true' && !process.env.PRISMA_SCHEMA_ENGINE_BINARY) {
  process.env.PRISMA_SCHEMA_ENGINE_BINARY = process.platform === 'win32' ? 'cmd' : '/bin/true';
}

const useSqlite = process.env.OPENHUB_DB === 'sqlite';

// Runtime database access is configured in src/server/db/client.ts (driver adapters).
const url =
  process.env.DATABASE_URL ?? (useSqlite ? 'file:./prisma/dev.db' : 'postgresql://openhub:openhub@localhost:5432/openhub');

export default defineConfig({
  schema: useSqlite ? 'prisma/sqlite.schema.prisma' : 'prisma/schema.prisma',
  datasource: { url },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
