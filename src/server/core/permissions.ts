import { getDb } from '@/server/db/client';
import { STAFF_ROLES, type UserRole } from '@/lib/enums';

/**
 * Role based access control.
 *
 * Roles and permissions live in the database (seeded, editable by admins) so a
 * self-hosted community can adjust them without a deploy. Permission keys are
 * stable strings checked in services - never in the UI alone.
 */

export const PERMISSIONS = {
  moderateContent: 'moderate:content',
  manageUsers: 'users:manage',
  verifyResources: 'resources:verify',
  verifyCampaigns: 'campaigns:verify',
  manageCategories: 'categories:manage',
  manageSettings: 'settings:manage',
  viewAuditLog: 'audit:view',
  featureContent: 'content:feature',
  exportData: 'data:export',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Fallback matrix used when the Role table has not been seeded yet. */
const DEFAULT_MATRIX: Record<string, PermissionKey[]> = {
  user: [],
  student: [],
  volunteer: [],
  organizer: [],
  business: [],
  moderator: [
    PERMISSIONS.moderateContent,
    PERMISSIONS.verifyResources,
    PERMISSIONS.verifyCampaigns,
    PERMISSIONS.featureContent,
  ],
  admin: Object.values(PERMISSIONS),
};

const globalForPermissions = globalThis as unknown as {
  openHubPermissions?: { loadedAt: number; map: Map<string, Set<string>> };
};

const CACHE_TTL_MS = 60_000;

async function loadPermissionMap(): Promise<Map<string, Set<string>>> {
  const cached = globalForPermissions.openHubPermissions;
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.map;

  const db = await getDb();
  const roles = await db.role.findMany({
    include: { permissions: { include: { permission: true } } },
  });

  const map = new Map<string, Set<string>>();
  for (const [key, defaults] of Object.entries(DEFAULT_MATRIX)) {
    map.set(key, new Set(defaults));
  }
  for (const role of roles) {
    const set = map.get(role.key) ?? new Set<string>();
    for (const link of role.permissions) set.add(link.permission.key);
    map.set(role.key, set);
  }

  globalForPermissions.openHubPermissions = { loadedAt: Date.now(), map };
  return map;
}

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

export async function roleHasPermission(role: string, permission: PermissionKey): Promise<boolean> {
  const map = await loadPermissionMap();
  return map.get(role)?.has(permission) ?? false;
}

export async function permissionsForRole(role: string): Promise<string[]> {
  const map = await loadPermissionMap();
  return Array.from(map.get(role) ?? []);
}

/** Invalidate the cache after an admin edits roles. */
export function resetPermissionCache() {
  globalForPermissions.openHubPermissions = undefined;
}

export function describeRole(role: string): string {
  const labels: Record<UserRole, string> = {
    user: 'Member',
    student: 'Student',
    volunteer: 'Volunteer',
    organizer: 'Community organizer',
    business: 'Small business',
    moderator: 'Moderator',
    admin: 'Administrator',
  };
  return labels[role as UserRole] ?? 'Member';
}
