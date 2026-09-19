#!/usr/bin/env node
/**
 * Applies the Prisma schema to a local SQLite database without needing Prisma's
 * schema-engine binary. Used by `npm run db:push` (offline / zero-setup mode).
 *
 * Usage: DATABASE_URL=file:./dev.db node scripts/db-push.mjs [--force-reset]
 */
import { existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadSchemaModels, generateDdl, generateDropAll } from './lib/prisma-ddl.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const forceReset = process.argv.includes('--force-reset');

if (!url.startsWith('file:')) {
  console.error('[db-push] only sqlite (file:) URLs are supported by this script.');
  console.error('[db-push] for PostgreSQL run: npm run db:migrate:deploy');
  process.exit(1);
}

const relative = url.replace(/^file:/, '');
const dbPath = resolve(root, relative.replace(/^\.\//, ''));

if (forceReset && existsSync(dbPath)) {
  unlinkSync(dbPath);
}

const { default: Database } = await import('better-sqlite3');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const models = loadSchemaModels();

if (forceReset) {
  db.exec(generateDropAll(models, 'sqlite'));
}

db.exec(generateDdl(models, 'sqlite'));

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all();
console.log(`[db-push] ${tables.length} tables ready in ${dbPath}`);
db.close();
