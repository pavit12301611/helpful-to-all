/**
 * SQLite driver adapter wrapper.
 *
 * SQLite disables foreign key enforcement per connection, which would silently
 * skip the ON DELETE CASCADE rules declared in the Prisma schema. OpenHub wraps
 * the official better-sqlite3 adapter and turns enforcement on for every
 * connection it hands to Prisma, so SQLite behaves like PostgreSQL in
 * development, tests and small self-hosted installs.
 */

type Queryable = { executeRaw: (params: { sql: string; args: unknown[]; argTypes: unknown[] }) => Promise<unknown> };

async function enableForeignKeys(adapter: unknown): Promise<void> {
  const queryable = adapter as Queryable;
  await queryable.executeRaw({ sql: 'PRAGMA foreign_keys = ON', args: [], argTypes: [] });
  await queryable.executeRaw({ sql: 'PRAGMA journal_mode = WAL', args: [], argTypes: [] });
}

export async function createSqliteAdapter(url: string) {
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
  const factory = new PrismaBetterSqlite3({ url });

  return {
    provider: factory.provider,
    adapterName: `${factory.adapterName}-openhub`,
    async connect() {
      const adapter = await factory.connect();
      await enableForeignKeys(adapter);
      return adapter;
    },
    async connectToShadowDb() {
      const adapter = await factory.connectToShadowDb();
      await enableForeignKeys(adapter);
      return adapter;
    },
  };
}
