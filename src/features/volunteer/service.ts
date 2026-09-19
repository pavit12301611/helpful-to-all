import { getDb } from '@/server/db/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { isStaffRole } from '@/server/core/permissions';
import { notify, notifyMany } from '@/server/services/notifications';
import { paymentProvider } from '@/server/services/payments';
import { VOLUNTEER_PAGE_SIZE, type CampaignFilters, type CampaignInput, type CampaignUpdateInput, type OpportunityInput, type SignupInput, type VolunteerFilters } from './schemas';

/**
 * Volunteer and donation centre.
 *
 * OpenHub never touches money: campaigns record a goal and an organiser contact,
 * and every page shows the "verify before you send" warning. A payment provider
 * interface exists in `src/server/services/payments.ts` for self-hosters who want
 * to plug one in later - it is never enabled by default.
 */

export async function listOpportunities(userId: string | null, filters: VolunteerFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { deletedAt: null, hiddenAt: null, status: { not: 'cancelled' } };

  if (filters.q) where.OR = [{ title: contains(filters.q) }, { description: contains(filters.q) }, { organizationName: contains(filters.q) }];
  if (filters.cause) where.cause = filters.cause;
  if (filters.city) where.city = contains(filters.city);
  if (filters.verified === 'yes') where.verified = true;
  if (filters.verified === 'no') where.verified = false;
  if (filters.upcoming === 'yes') where.startsAt = { gte: new Date() };

  const [opportunities, total] = await Promise.all([
    db.volunteerOpportunity.findMany({
      where,
      include: {
        _count: { select: { signups: true } },
        organizer: { select: { username: true, profile: { select: { displayName: true } } } },
      },
      orderBy: [{ verified: 'desc' }, { startsAt: 'asc' }],
      take: VOLUNTEER_PAGE_SIZE,
      skip: (filters.page - 1) * VOLUNTEER_PAGE_SIZE,
    }),
    db.volunteerOpportunity.count({ where }),
  ]);

  void userId;
  return { opportunities, total };
}

export async function getOpportunity(userId: string | null, id: string, role = 'user') {
  const db = await getDb();
  const opportunity = await db.volunteerOpportunity.findFirst({
    where: { id, deletedAt: null },
    include: {
      signups: { include: { user: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } }, orderBy: { createdAt: 'asc' } },
      organizer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, city: true } } } },
    },
  });
  if (!opportunity) throw new NotFoundError('That opportunity does not exist.');
  if (opportunity.hiddenAt && !isStaffRole(role)) throw new ForbiddenError('This opportunity was hidden by a moderator.');

  const mySignup = userId ? opportunity.signups.find((signup) => signup.userId === userId) ?? null : null;
  void userId;
  return { ...opportunity, mySignup };
}

export async function createOpportunity(userId: string, input: OpportunityInput) {
  const db = await getDb();
  const opportunity = await db.volunteerOpportunity.create({
    data: {
      organizerId: userId,
      title: input.title,
      description: input.description,
      cause: input.cause,
      organizationName: input.organizationName || null,
      skillsNeeded: input.skillsNeeded ?? '',
      itemsNeeded: input.itemsNeeded ?? '',
      city: input.city || null,
      country: input.country || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      volunteersNeeded: input.volunteersNeeded ?? 1,
      status: 'open',
    },
  });
  await logActivity({ userId, type: 'volunteer', description: `Posted volunteering opportunity “${input.title}”`, targetType: 'opportunity', targetId: opportunity.id });
  return opportunity;
}

export async function updateOpportunity(userId: string, id: string, input: OpportunityInput, role = 'user') {
  const db = await getDb();
  const existing = await db.volunteerOpportunity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That opportunity does not exist.');
  if (existing.organizerId !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the organiser can edit it.');
  return db.volunteerOpportunity.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      cause: input.cause,
      organizationName: input.organizationName || null,
      skillsNeeded: input.skillsNeeded ?? '',
      itemsNeeded: input.itemsNeeded ?? '',
      city: input.city || null,
      country: input.country || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      volunteersNeeded: input.volunteersNeeded ?? 1,
    },
  });
}

export async function deleteOpportunity(userId: string, id: string, role = 'user') {
  const db = await getDb();
  const existing = await db.volunteerOpportunity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That opportunity does not exist.');
  if (existing.organizerId !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the organiser can remove it.');
  await db.volunteerOpportunity.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function signUp(userId: string, input: SignupInput) {
  const db = await getDb();
  const opportunity = await db.volunteerOpportunity.findUnique({ where: { id: input.opportunityId } });
  if (!opportunity) throw new NotFoundError('That opportunity does not exist.');
  if (opportunity.status !== 'open') throw new ForbiddenError('This opportunity is not accepting volunteers.');
  if (opportunity.organizerId === userId) throw new ForbiddenError('You organised this one.');

  const existing = await db.volunteerSignup.findUnique({
    where: { opportunityId_userId: { opportunityId: input.opportunityId, userId } },
  });
  if (existing) throw new ConflictError('You already signed up for this.');

  const signup = await db.volunteerSignup.create({
    data: { opportunityId: input.opportunityId, userId, message: input.message || null, status: 'pending' },
  });

  await notify({
    userId: opportunity.organizerId,
    type: 'volunteer_signup',
    title: 'New volunteer signed up',
    body: opportunity.title,
    targetType: 'opportunity',
    targetId: opportunity.id,
    link: `/volunteer/${opportunity.id}`,
    actorId: userId,
  });

  return signup;
}

export async function cancelSignup(userId: string, signupId: string) {
  const db = await getDb();
  const signup = await db.volunteerSignup.findUnique({ where: { id: signupId } });
  if (!signup) throw new NotFoundError('That signup does not exist.');
  if (signup.userId !== userId) throw new ForbiddenError('You can only cancel your own signup.');
  await db.volunteerSignup.update({ where: { id: signupId }, data: { status: 'cancelled' } });
  return { cancelled: true };
}

export async function setSignupStatus(organizerId: string, signupId: string, status: 'confirmed' | 'declined') {
  const db = await getDb();
  const signup = await db.volunteerSignup.findUnique({ where: { id: signupId }, include: { opportunity: true } });
  if (!signup) throw new NotFoundError('That signup does not exist.');
  if (signup.opportunity.organizerId !== organizerId) throw new ForbiddenError('Only the organiser can change signups.');

  await db.volunteerSignup.update({ where: { id: signupId }, data: { status } });
  await notify({
    userId: signup.userId,
    type: 'volunteer_signup',
    title: status === 'confirmed' ? 'Your volunteer spot is confirmed' : 'Your volunteer signup was declined',
    body: signup.opportunity.title,
    targetType: 'opportunity',
    targetId: signup.opportunityId,
    link: `/volunteer/${signup.opportunityId}`,
    actorId: organizerId,
  });
  return { status };
}

export async function listMySignups(userId: string) {
  const db = await getDb();
  return db.volunteerSignup.findMany({
    where: { userId },
    include: { opportunity: { include: { organizer: { select: { username: true, profile: { select: { displayName: true } } } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

/* --------------------------------------------------------------- campaigns */

export async function listCampaigns(filters: CampaignFilters) {
  const db = await getDb();
  const where: Record<string, unknown> = { deletedAt: null, hiddenAt: null, status: { not: 'cancelled' } };
  if (filters.q) where.OR = [{ title: contains(filters.q) }, { description: contains(filters.q) }];
  if (filters.cause) where.cause = filters.cause;
  if (filters.kind) where.kind = filters.kind;
  if (filters.city) where.city = contains(filters.city);
  if (filters.verified === 'yes') where.verified = true;
  if (filters.verified === 'no') where.verified = false;

  const [campaigns, total] = await Promise.all([
    db.donationCampaign.findMany({
      where,
      include: { organizer: { select: { username: true, profile: { select: { displayName: true } } } } },
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
      take: VOLUNTEER_PAGE_SIZE,
      skip: (filters.page - 1) * VOLUNTEER_PAGE_SIZE,
    }),
    db.donationCampaign.count({ where }),
  ]);
  return { campaigns, total };
}

export async function getCampaign(userId: string | null, id: string, role = 'user') {
  const db = await getDb();
  const campaign = await db.donationCampaign.findFirst({
    where: { id, deletedAt: null },
    include: {
      updates: { include: { author: { select: { username: true, profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'desc' } },
      organizer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, city: true } } } },
    },
  });
  if (!campaign) throw new NotFoundError('That campaign does not exist.');
  if (campaign.hiddenAt && !isStaffRole(role)) throw new ForbiddenError('This campaign was hidden by a moderator.');

  const provider = paymentProvider(campaign.paymentProvider);
  void userId;
  return { ...campaign, payments: { configured: provider.isConfigured(), label: provider.label } };
}

export async function createCampaign(userId: string, input: CampaignInput) {
  const db = await getDb();
  const campaign = await db.donationCampaign.create({
    data: {
      organizerId: userId,
      title: input.title,
      description: input.description,
      cause: input.cause,
      kind: input.kind ?? 'goods',
      goalCents: input.goalCents ?? null,
      itemsNeeded: input.itemsNeeded ?? '',
      city: input.city || null,
      country: input.country || null,
      contactEmail: input.contactEmail || null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      status: 'open',
    },
  });
  await logActivity({ userId, type: 'volunteer', description: `Started donation campaign “${input.title}”`, targetType: 'campaign', targetId: campaign.id });
  return campaign;
}

export async function deleteCampaign(userId: string, id: string, role = 'user') {
  const db = await getDb();
  const existing = await db.donationCampaign.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('That campaign does not exist.');
  if (existing.organizerId !== userId && !isStaffRole(role)) throw new ForbiddenError('Only the organiser can remove it.');
  await db.donationCampaign.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function addCampaignUpdate(userId: string, input: CampaignUpdateInput) {
  const db = await getDb();
  const campaign = await db.donationCampaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new NotFoundError('That campaign does not exist.');
  if (campaign.organizerId !== userId) throw new ForbiddenError('Only the organiser can post updates.');

  const update = await db.campaignUpdate.create({
    data: { campaignId: input.campaignId, authorId: userId, title: input.title, body: input.body },
  });

  const followers = await db.savedItem.findMany({ where: { targetType: 'campaign', targetId: input.campaignId }, select: { userId: true } });
  await notifyMany(
    followers.map((follower) => follower.userId),
    {
      type: 'system',
      title: `Update: ${input.title}`,
      body: input.body.slice(0, 140),
      targetType: 'campaign',
      targetId: input.campaignId,
      link: `/volunteer/campaigns/${input.campaignId}`,
      actorId: userId,
    },
  );

  return update;
}

/**
 * Records progress without moving money. OpenHub has no payment processing in v1;
 * organisers update the raised total themselves and donors are told to verify.
 */
export async function recordProgress(userId: string, campaignId: string, raisedCents: number) {
  const db = await getDb();
  const campaign = await db.donationCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError('That campaign does not exist.');
  if (campaign.organizerId !== userId) throw new ForbiddenError('Only the organiser can update the total.');
  await db.donationCampaign.update({ where: { id: campaignId }, data: { raisedCents } });
  await logActivity({ userId, type: 'volunteer', description: `Updated raised total for “${campaign.title}”`, targetType: 'campaign', targetId: campaignId });
  return { raisedCents };
}
