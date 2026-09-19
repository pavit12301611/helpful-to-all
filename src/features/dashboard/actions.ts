'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { saveDashboardSettings, saveWidgetLayout } from './service';
import { WIDGET_KEYS, type WidgetKey } from '@/lib/dashboard';
import { DASHBOARD_LAYOUTS } from '@/lib/enums';

const layoutSchema = z.object({
  widgets: z
    .array(
      z.object({
        key: z.enum(WIDGET_KEYS as unknown as [WidgetKey, ...WidgetKey[]]),
        visible: z.boolean(),
        order: z.number().int().min(0).max(100),
      }),
    )
    .max(40),
});

const settingsSchema = z.object({
  layout: z.enum(DASHBOARD_LAYOUTS),
  defaultModule: z.string().trim().min(1).max(40),
  pinnedTools: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export async function saveWidgetLayoutAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: layoutSchema,
    input,
    successMessage: 'Dashboard updated.',
    handler: (data) => saveWidgetLayout(user.id, data.widgets),
  });
  if (result.ok) revalidatePath('/dashboard');
  return result;
}

export async function saveDashboardSettingsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({
    schema: settingsSchema,
    input,
    successMessage: 'Preferences saved.',
    handler: (data) => saveDashboardSettings(user.id, data),
  });
  if (result.ok) revalidatePath('/dashboard');
  return result;
}
