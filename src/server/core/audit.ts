import { getDb } from '@/server/db/client';
import { hashIp } from '@/lib/security';
import type { SessionUser } from '@/server/core/session';

/**
 * Audit logging for sensitive operations.
 *
 * Audit entries record *who* did *what* to *which* object. Raw IP addresses are
 * never stored - only a salted hash, which is enough to spot abuse patterns
 * without building a location profile of members.
 */

export type AuditInput = {
  actor?: SessionUser | { id: string; email?: string } | null;
  /** Use when the actor row is about to be deleted (e.g. account deletion). */
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function audit(input: AuditInput): Promise<void> {
  const db = await getDb();
  await db.auditLog.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorEmail: input.actorEmail ?? input.actor?.email ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipHash: hashIp(input.ip),
    },
  });
}

/** Per-user "activity history" shown on the member's own profile. */
export async function logActivity(input: {
  userId: string;
  type: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.activityLog.create({
    data: {
      userId: input.userId,
      type: input.type,
      description: input.description.slice(0, 240),
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
    },
  });
}
