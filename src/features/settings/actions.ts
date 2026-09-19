'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { runAction, type ActionResult } from '@/server/core/action';
import { updatePreferences } from '@/server/services/notifications';
import { audit } from '@/server/core/audit';

const preferencesSchema = z.object({
  inAppEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(false),
  digestMode: z.enum(['instant', 'daily', 'weekly', 'off']).default('instant'),
  disabledTypes: z.array(z.string().min(1)).default([]),
});

export async function updateNotificationPreferencesAction(formData: FormData): Promise<ActionResult> {
  const types = formData.getAll('disabledTypes').map((value) => String(value));
  return runAction({
    schema: preferencesSchema,
    input: {
      inAppEnabled: formData.get('inAppEnabled') === 'on',
      emailEnabled: formData.get('emailEnabled') === 'on',
      digestMode: String(formData.get('digestMode') ?? 'instant'),
      disabledTypes: types,
    },
    successMessage: 'Notification settings saved.',
    handler: async (data, { user }) => {
      if (!user) return { saved: false };
      await updatePreferences(user.id, data);
      await audit({ actor: user, action: 'preferences.notifications', targetType: 'user', targetId: user.id });
      revalidatePath('/settings');
      return { saved: true };
    },
  });
}
