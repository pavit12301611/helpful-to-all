import { getSessionUser, type SessionUser } from '@/server/core/session';

export type { SessionUser };
import { isStaffRole, roleHasPermission, type PermissionKey } from '@/server/core/permissions';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';

/**
 * Authorization guards.
 *
 * Every server action and API route that touches protected data starts with one
 * of these. Frontend checks are cosmetic only - the server is the only place
 * where access is decided.
 */

export async function currentUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (user?.isSuspended) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  if (user.isSuspended) {
    throw new ForbiddenError('This account is suspended. Contact a moderator if you think this is a mistake.');
  }
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaffRole(user.role)) throw new ForbiddenError('Moderator access is required.');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new ForbiddenError('Administrator access is required.');
  return user;
}

export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = await roleHasPermission(user.role, permission);
  if (!allowed) throw new ForbiddenError('Your role does not allow that action.');
  return user;
}

export async function isStaff(user: SessionUser): Promise<boolean> {
  return isStaffRole(user.role);
}
