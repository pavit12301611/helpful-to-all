import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/server/core/guards';
import { isStaffRole } from '@/server/core/permissions';
import type { SessionUser } from '@/server/core/session';

/**
 * Page level guards.
 *
 * Server components cannot throw user-facing errors nicely, so pages redirect
 * instead: signed-out visitors go to /login, under-permissioned members go back
 * to their dashboard with a message.
 */

export async function requireUserPage(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireStaffPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (!isStaffRole(user.role)) redirect('/dashboard?error=forbidden');
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (user.role !== 'admin') redirect('/dashboard?error=forbidden');
  return user;
}

export { notFound };
