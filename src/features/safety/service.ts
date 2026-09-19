import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { isStaffRole } from '@/server/core/permissions';
import { notifyMany } from '@/server/services/notifications';
import type { BloodDonorInput, EmergencyContactInput, EmergencyNumberInput, GuideInput, MissingPersonInput, SafetyFilters } from './schemas';

/**
 * Safety hub.
 *
 * Emergency numbers, first aid and disaster guides, blood donors, missing person
 * reports and a personal emergency card.
 *
 * Two rules drive every decision here: OpenHub never contacts emergency services
 * automatically, and personal data (blood group, emergency contacts) is only ever
 * shown to the owner unless they explicitly opted in to being listed.
 */

export async function listEmergencyNumbers(filters: Pick<SafetyFilters, 'country' | 'service' | 'q'>) {
  const db = await getDb();
  const where: Record<string, unknown> = {};
  if (filters.country) where.country = contains(filters.country);
  if (filters.service) where.service = filters.service;
  if (filters.q) where.OR = [{ country: contains(filters.q) }, { notes: contains(filters.q) }, { number: contains(filters.q) }];

  const [numbers, countries] = await Promise.all([
    db.emergencyNumber.findMany({ where, orderBy: [{ country: 'asc' }, { service: 'asc' }] }),
    db.emergencyNumber.findMany({ distinct: ['country'], select: { country: true }, orderBy: { country: 'asc' } }),
  ]);

  return { numbers, countries: countries.map((row) => row.country) };
}

export async function createEmergencyNumber(userId: string, input: EmergencyNumberInput, role = 'user') {
  if (!isStaffRole(role)) throw new ForbiddenError('Only moderators can add emergency numbers.');
  const db = await getDb();
  const row = await db.emergencyNumber.create({
    data: {
      country: input.country,
      region: input.region || null,
      service: input.service,
      number: input.number,
      notes: input.notes || null,
      source: input.source || null,
      verified: false,
    },
  });
  await logActivity({ userId, type: 'safety', description: `Added emergency number ${input.number} (${input.country})`, targetType: 'emergency_number', targetId: row.id });
  return row;
}

export async function deleteEmergencyNumber(userId: string, id: string, role = 'user') {
  if (!isStaffRole(role)) throw new ForbiddenError('Only moderators can remove emergency numbers.');
  const db = await getDb();
  await db.emergencyNumber.delete({ where: { id } });
  await logActivity({ userId, type: 'safety', description: 'Removed an emergency number', targetType: 'emergency_number', targetId: id });
  return { deleted: true };
}

/* ----------------------------------------------------------------- guides */

export async function listGuides(filters: Pick<SafetyFilters, 'kind' | 'q'>) {
  const db = await getDb();
  const where: Record<string, unknown> = { published: true };
  if (filters.kind) where.kind = filters.kind;
  if (filters.q) where.OR = [{ title: contains(filters.q) }, { body: contains(filters.q) }];
  return db.guide.findMany({ where, orderBy: [{ kind: 'asc' }, { position: 'asc' }, { title: 'asc' }] });
}

export async function getGuide(slug: string) {
  const db = await getDb();
  const guide = await db.guide.findFirst({ where: { slug, published: true } });
  if (!guide) throw new NotFoundError('That guide does not exist.');
  return guide;
}

export async function createGuide(userId: string, input: GuideInput, role = 'user') {
  if (!isStaffRole(role)) throw new ForbiddenError('Only moderators can publish safety guides.');
  const db = await getDb();
  const guide = await db.guide.create({
    data: {
      slug: input.slug,
      kind: input.kind ?? 'safety',
      title: input.title,
      body: input.body,
      locale: input.locale || 'en',
      published: input.published !== 'off',
    },
  });
  await logActivity({ userId, type: 'safety', description: `Published guide “${input.title}”`, targetType: 'guide', targetId: guide.id });
  return guide;
}

/* ----------------------------------------------------------- blood donors */

export async function listBloodDonors(filters: Pick<SafetyFilters, 'bloodGroup' | 'city'>) {
  const db = await getDb();
  const where: Record<string, unknown> = { available: true };
  if (filters.bloodGroup) where.bloodGroup = filters.bloodGroup;
  if (filters.city) where.city = contains(filters.city);

  return db.bloodDonorProfile.findMany({
    where,
    include: { user: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true, city: true } } } } },
    orderBy: { lastDonatedAt: 'asc' },
    take: 50,
  });
}

export async function getMyDonorProfile(userId: string) {
  const db = await getDb();
  return db.bloodDonorProfile.findUnique({ where: { userId } });
}

export async function saveDonorProfile(userId: string, input: BloodDonorInput) {
  const db = await getDb();
  return db.bloodDonorProfile.upsert({
    where: { userId },
    create: {
      userId,
      bloodGroup: input.bloodGroup,
      city: input.city,
      country: input.country || null,
      lastDonatedAt: input.lastDonatedAt ? new Date(input.lastDonatedAt) : null,
      contactPreference: input.contactPreference ?? 'message',
      available: input.available !== 'off',
    },
    update: {
      bloodGroup: input.bloodGroup,
      city: input.city,
      country: input.country || null,
      lastDonatedAt: input.lastDonatedAt ? new Date(input.lastDonatedAt) : null,
      contactPreference: input.contactPreference ?? 'message',
      available: input.available !== 'off',
    },
  });
}

export async function deleteDonorProfile(userId: string) {
  const db = await getDb();
  await db.bloodDonorProfile.deleteMany({ where: { userId } });
  return { deleted: true };
}

/* ------------------------------------------------------ emergency contacts */

export async function listEmergencyContacts(userId: string) {
  const db = await getDb();
  return db.emergencyContact.findMany({ where: { userId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
}

export async function addEmergencyContact(userId: string, input: EmergencyContactInput) {
  const db = await getDb();
  if (input.isPrimary === 'on') {
    await db.emergencyContact.updateMany({ where: { userId }, data: { isPrimary: false } });
  }
  return db.emergencyContact.create({
    data: { userId, name: input.name, relation: input.relation || null, phone: input.phone, isPrimary: input.isPrimary === 'on' },
  });
}

export async function deleteEmergencyContact(userId: string, id: string) {
  const db = await getDb();
  const contact = await db.emergencyContact.findUnique({ where: { id } });
  if (!contact) throw new NotFoundError('That contact does not exist.');
  if (contact.userId !== userId) throw new ForbiddenError('You can only delete your own contacts.');
  await db.emergencyContact.delete({ where: { id } });
  return { deleted: true };
}

/* --------------------------------------------------------- missing persons */

export async function listMissingPersons(filters: Pick<SafetyFilters, 'status' | 'q' | 'city'>) {
  const db = await getDb();
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  else where.status = { not: 'closed' };
  if (filters.q) where.OR = [{ name: contains(filters.q) }, { description: contains(filters.q) }, { lastSeenLocation: contains(filters.q) }];
  if (filters.city) where.lastSeenLocation = contains(filters.city);

  return db.missingPerson.findMany({
    where,
    include: { reportedBy: { select: { username: true, profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function reportMissingPerson(userId: string, input: MissingPersonInput) {
  const db = await getDb();
  const report = await db.missingPerson.create({
    data: {
      reportedById: userId,
      name: input.name,
      age: input.age ?? null,
      lastSeenAt: input.lastSeenAt ? new Date(input.lastSeenAt) : null,
      lastSeenLocation: input.lastSeenLocation || null,
      description: input.description,
      contactNote: input.contactNote || null,
      status: 'searching',
      verified: false,
    },
  });

  const staff = await db.user.findMany({ where: { role: { in: ['admin', 'moderator'] } }, select: { id: true } });
  await notifyMany(
    staff.map((member) => member.id),
    {
      type: 'moderation',
      title: 'Missing person report needs review',
      body: input.name,
      targetType: 'missing_person',
      targetId: report.id,
      link: '/admin/moderation',
      actorId: userId,
    },
  );

  await logActivity({ userId, type: 'safety', description: `Reported missing person “${input.name}”`, targetType: 'missing_person', targetId: report.id });
  return report;
}

export async function setMissingStatus(userId: string, id: string, status: 'searching' | 'found' | 'closed', role = 'user') {
  const db = await getDb();
  const report = await db.missingPerson.findUnique({ where: { id } });
  if (!report) throw new NotFoundError('That report does not exist.');
  if (report.reportedById !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the reporter or a moderator can change the status.');
  await db.missingPerson.update({ where: { id }, data: { status } });
  await logActivity({ userId, type: 'safety', description: `Set missing person report to ${status}`, targetType: 'missing_person', targetId: id });
  return { status };
}
