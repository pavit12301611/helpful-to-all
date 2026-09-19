import { PrismaClient } from '@/generated/prisma/client';
import { databaseUrl, dbDialect } from '@/lib/db-config';

/**
 * Single Prisma client for the whole server.
 *
 * Prisma 7 uses driver adapters instead of the Rust query engine, so the same
 * generated client talks to PostgreSQL (`@prisma/adapter-pg`) in production and
 * to SQLite (`@prisma/adapter-better-sqlite3`) in zero-setup local development.
 *
 * The adapter modules are imported lazily so a PostgreSQL-only deployment never
 * needs the SQLite native module installed.
 */

type ClientAdapter = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>['adapter'];

const globalForDb = globalThis as unknown as { openHubDb?: PrismaClient };

async function createAdapter(): Promise<ClientAdapter> {
  if (dbDialect === 'sqlite') {
    const { createSqliteAdapter } = await import('./sqlite-adapter');
    const url = databaseUrl.startsWith('file:') ? databaseUrl : `file:${databaseUrl}`;
    return (await createSqliteAdapter(url)) as unknown as ClientAdapter;
  }
  const { PrismaPg } = await import('@prisma/adapter-pg');
  return new PrismaPg({ connectionString: databaseUrl }) as unknown as ClientAdapter;
}

export async function getDb(): Promise<PrismaClient> {
  if (globalForDb.openHubDb) return globalForDb.openHubDb;
  const adapter = await createAdapter();
  const client = new PrismaClient({
    adapter: adapter as NonNullable<ClientAdapter>,
    log: process.env.PRISMA_LOG === '1' ? ['warn', 'error'] : ['error'],
  });
  globalForDb.openHubDb = client;
  return client;
}

/** Close the client (used by tests and by graceful shutdown). */
export async function disconnectDb(): Promise<void> {
  if (globalForDb.openHubDb) {
    await globalForDb.openHubDb.$disconnect();
    globalForDb.openHubDb = undefined;
  }
}
