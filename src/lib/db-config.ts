/**
 * Database dialect configuration.
 *
 * OpenHub targets PostgreSQL in production (Docker) and offers a SQLite
 * fallback so contributors can run the whole stack with zero infrastructure.
 * Everything dialect specific funnels through this module.
 */
import type { Prisma } from '@/generated/prisma/client';

export type DbDialect = 'postgresql' | 'sqlite';

const rawUrl = process.env.DATABASE_URL ?? '';

export const dbDialect: DbDialect =
  process.env.OPENHUB_DB === 'sqlite' || rawUrl.startsWith('file:') ? 'sqlite' : 'postgresql';

export const databaseUrl: string =
  rawUrl ||
  (dbDialect === 'sqlite' ? 'file:./prisma/dev.db' : 'postgresql://openhub:openhub@localhost:5432/openhub');

export const isSqlite = dbDialect === 'sqlite';

type StringFilter = { contains: string; mode?: 'insensitive' | 'default' };

/**
 * Case-insensitive `contains` filter. SQLite comparisons are already
 * case-insensitive for ASCII and reject the `mode` option, so it is only added
 * for PostgreSQL.
 */
export function contains(value: string): StringFilter {
  return isSqlite ? { contains: value } : { contains: value, mode: 'insensitive' };
}

/** Multi-keyword search helper: every keyword must match one of the columns. */
export function searchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .slice(0, 6);
}

export type { Prisma };
