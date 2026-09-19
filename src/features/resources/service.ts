import { getDb } from '@/server/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { isStaffRole } from '@/server/core/permissions';
import { notify } from '@/server/services/notifications';
import { mapProvider } from '@/server/services/maps';
import { DIRECTORY_PAGE_SIZE, type EditSuggestionInput, type ResourceDirectoryFilters, type ResourceInput, type ResourceReviewInput } from './schemas';

/**
 * Local resource directory.
 *
 * Entries are community submitted, so nothing is presented as official: each
 * listing shows whether a moderator verified it and when it was last confirmed.
 * Addresses are approximate and phone numbers are only shown when the submitter
 * provided them - never scraped or invented.
 */

export async function listDirectoryResources(filters: ResourceDirectoryFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { deletedAt: null, hiddenAt: null, status: 'active' };

  if (filters.q) {
    where.OR = [{ name: contains(filters.q) }, { description: contains(filters.q) }, { address: contains(filters.q) }];
  }
  if (filters.category) where.category = filters.category;
  if (filters.city) where.city = contains(filters.city);
  if (filters.accessibility) where.accessibility = filters.accessibility;
  if (typeof filters.priceLevel === 'number') where.priceLevel = filters.priceLevel;
  if (filters.verified === 'yes') where.verified = true;
  if (filters.verified === 'no') where.verified = false;

  const orderBy =
    filters.sort === 'name'
      ? [{ name: 'asc' as const }]
      : filters.sort === 'rating'
        ? [{ reviews: { _count: 'desc' as const } }, { name: 'asc' as const }]
        : [{ createdAt: 'desc' as const }];

  const [resources, total, byCategory] = await Promise.all([
    db.localResource.findMany({
      where,
      include: {
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true } },
      },
      orderBy,
      take: DIRECTORY_PAGE_SIZE,
      skip: (filters.page - 1) * DIRECTORY_PAGE_SIZE,
    }),
    db.localResource.count({ where }),
    db.localResource.groupBy({ by: ['category'], where: { deletedAt: null, hiddenAt: null }, _count: { _all: true } }),
  ]);

  return { resources, total, byCategory };
}

export function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return null;
  return Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1));
}

export async function getDirectoryResource(userId: string | null, id: string, role = 'user') {
  const db = await getDb();
  const resource = await db.localResource.findFirst({
    where: { id, deletedAt: null },
    include: {
      reviews: { where: { hiddenAt: null }, include: { author: { select: { username: true, profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'desc' } },
      suggestions: { where: { status: 'pending' }, orderBy: { createdAt: 'desc' } },
      submittedBy: { select: { username: true, profile: { select: { displayName: true } } } },
    },
  });
  if (!resource) throw new NotFoundError('That place is not in the directory.');
  if (resource.hiddenAt && !isStaffRole(role)) throw new ForbiddenError('This entry was hidden by a moderator.');

  const point = resource.latitude !== null && resource.longitude !== null ? { lat: resource.latitude, lng: resource.longitude } : null;
  const maps = mapProvider();

  void userId;
  return {
    ...resource,
    rating: averageRating(resource.reviews),
    mapEmbed: point ? maps.embedUrl(point) : null,
    mapLink: point ? maps.directionsUrl(point) : null,
    mapSearch: maps.searchUrl(`${resource.name} ${resource.city}`),
  };
}

export async function createDirectoryResource(userId: string, input: ResourceInput) {
  const db = await getDb();
  const resource = await db.localResource.create({
    data: {
      name: input.name,
      category: input.category,
      description: input.description || null,
      address: input.address || null,
      city: input.city,
      country: input.country || null,
      phone: input.phone || null,
      website: input.website || null,
      latitude: typeof input.latitude === 'number' ? input.latitude : null,
      longitude: typeof input.longitude === 'number' ? input.longitude : null,
      openingHours: input.openingHours || null,
      accessibility: input.accessibility ?? 'unknown',
      priceLevel: typeof input.priceLevel === 'number' ? input.priceLevel : 0,
      submittedById: userId,
      status: 'active',
    },
  });
  await logActivity({ userId, type: 'resource', description: `Added “${input.name}” to the directory`, targetType: 'resource', targetId: resource.id });
  return resource;
}

export async function updateDirectoryResource(userId: string, id: string, input: ResourceInput, role = 'user') {
  const db = await getDb();
  const existing = await db.localResource.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That place is not in the directory.');
  if (existing.submittedById !== userId && !isStaffRole(role)) {
    throw new ForbiddenError('Suggest an edit instead - only the submitter or a moderator can change it directly.');
  }
  return db.localResource.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      description: input.description || null,
      address: input.address || null,
      city: input.city,
      country: input.country || null,
      phone: input.phone || null,
      website: input.website || null,
      latitude: typeof input.latitude === 'number' ? input.latitude : null,
      longitude: typeof input.longitude === 'number' ? input.longitude : null,
      openingHours: input.openingHours || null,
      accessibility: input.accessibility ?? 'unknown',
      priceLevel: typeof input.priceLevel === 'number' ? input.priceLevel : 0,
    },
  });
}

export async function deleteDirectoryResource(userId: string, id: string, role = 'user') {
  const db = await getDb();
  const existing = await db.localResource.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That place is not in the directory.');
  if (existing.submittedById !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the submitter or a moderator can remove it.');
  await db.localResource.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function reviewResource(userId: string, input: ResourceReviewInput) {
  const db = await getDb();
  const resource = await db.localResource.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw new NotFoundError('That place is not in the directory.');
  if (resource.submittedById === userId) throw new ForbiddenError('You cannot review a place you submitted.');

  const existing = await db.resourceReview.findFirst({ where: { resourceId: input.resourceId, authorId: userId } });
  if (existing) {
    return db.resourceReview.update({ where: { id: existing.id }, data: { rating: input.rating, comment: input.comment || null } });
  }
  return db.resourceReview.create({ data: { resourceId: input.resourceId, authorId: userId, rating: input.rating, comment: input.comment || null } });
}

export async function deleteResourceReview(userId: string, id: string, role = 'user') {
  const db = await getDb();
  const review = await db.resourceReview.findUnique({ where: { id } });
  if (!review) throw new NotFoundError('That review does not exist.');
  if (review.authorId !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the author or a moderator can remove a review.');
  await db.resourceReview.update({ where: { id }, data: { hiddenAt: new Date() } });
}

export async function suggestEdit(userId: string, input: EditSuggestionInput) {
  const db = await getDb();
  const resource = await db.localResource.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw new NotFoundError('That place is not in the directory.');

  const current = (resource as unknown as Record<string, unknown>)[input.field];
  await db.resourceEditSuggestion.create({
    data: {
      resourceId: input.resourceId,
      suggestedById: userId,
      field: input.field,
      currentValue: current === null || current === undefined ? null : String(current),
      proposedValue: input.proposedValue,
      note: input.note || null,
      status: 'pending',
    },
  });

  await notify({
    userId: resource.submittedById,
    type: 'system',
    title: 'Someone suggested an edit',
    body: `${resource.name}: ${input.field}`,
    targetType: 'resource',
    targetId: resource.id,
    link: `/resources/${resource.id}`,
    actorId: userId,
  });

  return { suggested: true };
}

export async function confirmResource(userId: string, id: string) {
  const db = await getDb();
  const resource = await db.localResource.findUnique({ where: { id } });
  if (!resource) throw new NotFoundError('That place is not in the directory.');
  await db.localResource.update({ where: { id }, data: { lastConfirmedAt: new Date() } });
  await logActivity({ userId, type: 'resource', description: `Confirmed “${resource.name}” is still correct`, targetType: 'resource', targetId: id });
  return { confirmed: true };
}
