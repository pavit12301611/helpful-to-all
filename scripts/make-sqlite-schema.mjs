#!/usr/bin/env node
/**
 * Generates `prisma/sqlite.schema.prisma` from the canonical `prisma/schema.prisma`.
 *
 * The only difference is the datasource provider, which Prisma does not allow to be
 * read from an environment variable. Because the schema intentionally avoids
 * PostgreSQL-only features, this rewrite is safe and keeps a single source of truth.
 *
 * Usage: node scripts/make-sqlite-schema.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');

if (!/provider\s*=\s*"postgresql"/.test(source)) {
  console.error('[make-sqlite-schema] canonical schema does not declare the postgresql provider.');
  process.exit(1);
}

const output = source.replace(
  /provider\s*=\s*"postgresql"/,
  'provider = "sqlite"',
);

writeFileSync(join(root, 'prisma/sqlite.schema.prisma'), output, 'utf8');
console.log('[make-sqlite-schema] wrote prisma/sqlite.schema.prisma');
