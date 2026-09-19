'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { markAllNotificationsRead, markNotificationRead } from '@/server/services/notifications';

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  return runAction({
    input: { notificationId },
    handler: async (_input, { user }) => {
      if (!user) return { marked: false };
      await markNotificationRead(user.id, notificationId);
      revalidatePath('/notifications');
      revalidatePath('/dashboard');
      return { marked: true };
    },
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  return runAction({
    successMessage: 'All notifications marked as read.',
    handler: async (_input, { user }) => {
      if (!user) return { count: 0 };
      const count = await markAllNotificationsRead(user.id);
      revalidatePath('/notifications');
      revalidatePath('/dashboard');
      return { count };
    },
  });
}
