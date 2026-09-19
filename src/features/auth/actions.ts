'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { clientIp, userAgent } from '@/server/core/session';
import {
  changePassword,
  deleteAccount,
  exportMyData,
  loginUser,
  logoutUser,
  registerUser,
  updatePrivacy,
  updateProfile,
} from './service';
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  preferencesSchema,
  privacySchema,
  profileSchema,
  registerSchema,
} from './schemas';
import { getDb } from '@/server/db/client';

/**
 * Server actions for authentication, profile and privacy.
 * Thin by design: validation lives in `schemas.ts`, behaviour in `service.ts`.
 */

export async function registerAction(input: unknown): Promise<ActionResult<{ id: string; username: string }>> {
  return runAction({
    schema: registerSchema,
    input,
    requireAuth: false,
    successMessage: 'Welcome to OpenHub!',
    handler: async (data) => registerUser(data, { userAgent: await userAgent(), ip: await clientIp() }),
  });
}

export async function loginAction(input: unknown): Promise<ActionResult<{ id: string; username: string }>> {
  return runAction({
    schema: loginSchema,
    input,
    requireAuth: false,
    successMessage: 'Signed in.',
    handler: async (data) => loginUser(data, { userAgent: await userAgent(), ip: await clientIp() }),
  });
}

export async function logoutAction(): Promise<void> {
  await logoutUser();
  revalidatePath('/', 'layout');
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  return runAction({
    schema: changePasswordSchema,
    input,
    successMessage: 'Password updated. You were signed out of other devices.',
    handler: async (data) => changePassword(user.id, data),
  });
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: profileSchema,
    input,
    successMessage: 'Profile saved.',
    handler: async (data) => updateProfile(user.id, data),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function updatePrivacyAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: privacySchema,
    input,
    successMessage: 'Privacy settings saved.',
    handler: async (data) => updatePrivacy(user.id, data),
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: preferencesSchema,
    input,
    successMessage: 'Preferences saved.',
    handler: async (data) => {
      const db = await getDb();
      await db.user.update({ where: { id: user.id }, data });
    },
  });
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function exportDataAction(): Promise<ActionResult<{ payload: Record<string, unknown> }>> {
  const user = await requireUser();
  return runAction({
    successMessage: 'Your data export is ready.',
    handler: async () => ({ payload: await exportMyData(user.id) }),
  });
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  return runAction({
    schema: deleteAccountSchema,
    input,
    successMessage: 'Your account has been deleted.',
    handler: async (data) => deleteAccount(user.id, data.password),
  });
}
