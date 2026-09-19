import { cookies } from 'next/headers';
import { getDb } from '@/server/db/client';
import { generateToken, hashToken, hashIp } from '@/lib/security';
import { env } from '@/lib/env';

/**
 * Session handling.
 *
 * Cookies are httpOnly + sameSite=lax and contain a random token; only its
 * SHA-256 hash is stored in the database, so a leaked database cannot be used
 * to hijack sessions. Session rows carry the expiry and can be revoked from
 * the settings page.
 */

export const SESSION_COOKIE = 'openhub_session';
const SLIDING_RENEWAL_MS = 60 * 60 * 1000; // at most one DB write per hour

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  locale: string;
  theme: string;
  isSuspended: boolean;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function createSession(options: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<string> {
  const db = await getDb();
  const token = generateToken(32);
  const ttlDays = env().SESSION_TTL_DAYS;

  await db.session.create({
    data: {
      userId: options.userId,
      tokenHash: hashToken(token),
      userAgent: options.userAgent?.slice(0, 200) ?? null,
      ipHash: hashIp(options.ip),
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: env().SESSION_TTL_DAYS * 86_400,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.session.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

/** Resolve the signed-in user from the session cookie (or null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }
  const { user } = session;
  if (!user.isActive || user.deletedAt) return null;

  // Sliding expiry: extend the session at most once per hour.
  if (Date.now() - session.lastSeenAt.getTime() > SLIDING_RENEWAL_MS) {
    const ttlDays = env().SESSION_TTL_DAYS;
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ttlDays * 86_400_000) },
    });
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    locale: user.locale,
    theme: user.theme,
    isSuspended: user.isSuspended,
    displayName: user.profile?.displayName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

/** Client IP for rate limiting (never persisted in raw form - only a hash). */
export async function clientIp(): Promise<string | null> {
  const { headers } = await import('next/headers');
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return store.get('x-real-ip');
}

export async function userAgent(): Promise<string | null> {
  const { headers } = await import('next/headers');
  const store = await headers();
  return store.get('user-agent');
}
