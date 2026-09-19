/**
 * Dev helper: prints a session cookie value for an existing account so pages can
 * be smoke-tested with curl. Not used by the app at runtime.
 *
 *   DATABASE_URL="file:./prisma/dev.db" npx tsx scripts/dev-session.ts priya@openhub.test
 */
import { getDb, disconnectDb } from '../src/server/db/client';
import { generateToken, hashToken } from '../src/lib/security';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('usage: dev-session.ts <email>');
  const db = await getDb();
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const token = generateToken(32);
  await db.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), userAgent: 'dev-session', expiresAt: new Date(Date.now() + 86_400_000) },
  });
  console.log(token);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
