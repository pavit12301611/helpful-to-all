import { getDb } from '@/server/db/client';
import { hashPassword, verifyPassword, passwordStrength } from '@/lib/security';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { audit, logActivity } from '@/server/core/audit';
import { sendEmail, renderEmail } from '@/server/services/email';
import { DEFAULT_WIDGETS } from '@/lib/dashboard';
import { createSession, setSessionCookie, destroySessionCookie } from '@/server/core/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { appUrl } from '@/lib/env';
import { toCsv } from '@/lib/utils';
import type { LoginInput, ProfileInput, PrivacyInput, RegisterInput } from './schemas';

/**
 * Authentication & account service.
 *
 * Passwords are hashed with scrypt, sessions are opaque tokens stored as
 * hashes, and every privileged change is written to the audit log.
 */

export async function registerUser(input: RegisterInput, meta: { userAgent?: string | null; ip?: string | null }) {
  await enforceRateLimit('register', meta.ip ?? 'unknown');

  if (passwordStrength(input.password).score < 2) {
    throw new ValidationError('Please choose a stronger password (mix letters, numbers and a symbol).', {
      password: 'Please choose a stronger password.',
    });
  }

  const db = await getDb();
  const existing = await db.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing?.email === input.email) {
    throw new ConflictError('An account with that email already exists.', );
  }
  if (existing?.username === input.username) {
    throw new ConflictError('That username is taken.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      role: input.userType === 'student' ? 'student' : input.userType === 'volunteer' ? 'volunteer' : 'user',
      profile: {
        create: {
          displayName: input.displayName,
          city: input.city || null,
          country: input.country || null,
          profileVisibility: 'community',
        },
      },
      notificationPrefs: { create: {} },
      dashboard: { create: { widgets: JSON.stringify(DEFAULT_WIDGETS) } },
    },
  });

  if (input.userType) {
    await setUserTypes(user.id, [input.userType]);
  }

  await audit({
    actor: { id: user.id, email: user.email },
    action: 'auth.register',
    targetType: 'user',
    targetId: user.id,
    ip: meta.ip,
  });
  await logActivity({ userId: user.id, type: 'account', description: 'Joined OpenHub' });

  const { text, html } = renderEmail(`Welcome to OpenHub, ${input.displayName}`, [
    'Your account is ready. Here are three things you can do next:',
    '1. Complete your profile so neighbours and classmates can find you.',
    '2. Add your first task or habit on the dashboard.',
    '3. Ask a question or offer help in the Community Help section.',
    appUrl(),
  ]);
  await sendEmail({ to: user.email, subject: 'Welcome to OpenHub', text, html });

  const token = await createSession({ userId: user.id, userAgent: meta.userAgent, ip: meta.ip });
  await setSessionCookie(token);
  return { id: user.id, username: user.username };
}

export async function loginUser(input: LoginInput, meta: { userAgent?: string | null; ip?: string | null }) {
  await enforceRateLimit('login', `${input.email}:${meta.ip ?? 'unknown'}`);

  const db = await getDb();
  const user = await db.user.findUnique({ where: { email: input.email } });
  // Constant-ish error message: never reveal whether the email exists.
  if (!user || !user.passwordHash) throw new UnauthorizedError('Email or password is incorrect.');
  if (user.deletedAt) throw new UnauthorizedError('Email or password is incorrect.');
  if (!user.isActive) throw new ForbiddenError('This account is deactivated.');
  if (user.isSuspended) {
    throw new ForbiddenError(user.suspendedReason ?? 'This account is suspended.');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await audit({ actor: { id: user.id, email: user.email }, action: 'auth.login_failed', targetType: 'user', targetId: user.id, ip: meta.ip });
    throw new UnauthorizedError('Email or password is incorrect.');
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await createSession({ userId: user.id, userAgent: meta.userAgent, ip: meta.ip });
  await setSessionCookie(token);
  await audit({ actor: { id: user.id, email: user.email }, action: 'auth.login', targetType: 'user', targetId: user.id, ip: meta.ip });
  return { id: user.id, username: user.username };
}

export async function logoutUser(): Promise<void> {
  await destroySessionCookie();
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const db = await getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError('Your current password is not correct.', { currentPassword: 'Incorrect password.' });
  if (passwordStrength(input.newPassword).score < 2) {
    throw new ValidationError('Please choose a stronger password.');
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ actor: { id: user.id, email: user.email }, action: 'auth.password_change', targetType: 'user', targetId: userId });
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const db = await getDb();
  await db.profile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: input.displayName,
      bio: input.bio || null,
      city: input.city || null,
      country: input.country || null,
      website: input.website || null,
      availability: input.availability || null,
    },
    update: {
      displayName: input.displayName,
      bio: input.bio || null,
      city: input.city || null,
      country: input.country || null,
      website: input.website || null,
      availability: input.availability || null,
    },
  });

  await setUserTypes(userId, input.userTypes ?? []);
  await syncTags(userId, 'skill', input.skills ?? []);
  await syncTags(userId, 'interest', input.interests ?? []);
  await syncTags(userId, 'language', input.languages ?? []);

  await audit({ actor: { id: userId }, action: 'profile.update', targetType: 'user', targetId: userId });
  await logActivity({ userId, type: 'profile', description: 'Updated profile' });
}

async function setUserTypes(userId: string, types: string[]) {
  const db = await getDb();
  await db.profile.update({ where: { userId }, data: { userTypes: toCsv(types) } });
}

async function syncTags(userId: string, kind: string, labels: string[]) {
  const db = await getDb();
  const unique = Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean))).slice(0, 30);

  const existing = await db.userTag.findMany({
    where: { userId, tag: { kind } },
    include: { tag: true },
  });
  const existingLabels = new Map(existing.map((link) => [link.tag.label.toLowerCase(), link]));
  const wanted = new Set(unique.map((label) => label.toLowerCase()));

  for (const [label, link] of existingLabels) {
    if (!wanted.has(label)) await db.userTag.delete({ where: { id: link.id } });
  }

  for (const label of unique) {
    if (existingLabels.has(label.toLowerCase())) continue;
    const tag = await db.tag.upsert({
      where: { kind_slug: { kind, slug: label.toLowerCase().replace(/\s+/g, '-') } },
      create: { kind, slug: label.toLowerCase().replace(/\s+/g, '-'), label },
      update: {},
    });
    await db.userTag.create({ data: { userId, tagId: tag.id } });
  }
}

export async function updatePrivacy(userId: string, input: PrivacyInput) {
  const db = await getDb();
  await db.profile.upsert({
    where: { userId },
    create: { userId, displayName: 'Member', ...input },
    update: input,
  });
  await audit({ actor: { id: userId }, action: 'privacy.update', targetType: 'user', targetId: userId });
}

/** Full personal data export (GDPR style). */
export async function exportMyData(userId: string): Promise<Record<string, unknown>> {
  const db = await getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      tasks: { where: { deletedAt: null } },
      notes: { where: { deletedAt: null } },
      habits: { include: { logs: true } },
      bookmarks: true,
      calendarEvents: true,
      expenses: { include: { splits: true } },
      helpRequests: { where: { deletedAt: null } },
      helpResponses: { where: { deletedAt: null } },
      comments: { where: { deletedAt: null } },
      memberships: { include: { group: true } },
      notifications: true,
      activityLogs: true,
      files: true,
    },
  });
  if (!user) throw new NotFoundError();

  const tags = await db.userTag.findMany({ where: { userId }, include: { tag: true } });

  // Never export secrets.
  const { passwordHash: _passwordHash, ...safeUser } = user;
  void _passwordHash;

  await audit({ actor: { id: userId, email: user.email }, action: 'data.export', targetType: 'user', targetId: userId });
  return {
    exportedAt: new Date().toISOString(),
    user: { ...safeUser, profile: { ...safeUser.profile, tags: tags.map((t) => t.tag) } },
  };
}

/** Permanently delete the account and everything attached to it. */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const db = await getDb();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ValidationError('Password is incorrect.', { password: 'Password is incorrect.' });

  // Cascade rules remove profiles, content and memberships; we delete files too.
  const files = await db.file.findMany({ where: { ownerId: userId } });
  const { storageProvider } = await import('@/server/services/storage');
  const storage = storageProvider();
  await Promise.all(files.map((file) => storage.remove(file.storageKey)));

  await audit({ action: 'account.delete', targetType: 'user', targetId: userId, actorEmail: user.email });
  await db.user.delete({ where: { id: userId } });
  await destroySessionCookie();
}
