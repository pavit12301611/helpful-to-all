import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getOffer } from '@/features/skills/service';
import { ConnectForm, ReviewList } from '@/features/skills/components';
import { PRICE_MODE_LABELS } from '@/features/skills/schemas';
import { ReportButton, SaveButton } from '@/features/social/components';
import { savedTargetTypes } from '@/features/social/service';
import { Avatar, Badge, Card, CardContent, CardHeader, DefinitionList, SectionHeading, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatMoney, formatRelative } from '@/lib/utils';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Skill offer' };

export default async function SkillOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let offer;
  try {
    offer = await getOffer(user?.id ?? null, id);
  } catch (error) {
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Offer unavailable">
            {error.message}
          </Alert>
          <Link href="/skills" className="link text-sm">
            Back to skill exchange
          </Link>
        </div>
      );
    }
    throw error;
  }

  const saved = user ? await savedTargetTypes(user.id, 'skill_offer') : new Set<string>();
  const name = offer.user.profile?.displayName ?? offer.user.username;
  const isOwner = user?.id === offer.userId;

  return (
    <div className="space-y-5">
      <Link href="/skills" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to skill exchange
      </Link>

      <SectionHeading
        title={offer.skill.name}
        description={`${name} teaches ${labelize(offer.level)} level · ${offer.format === 'inperson' ? 'in person' : offer.format === 'online' ? 'online' : 'online or in person'}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="About this offer" icon={<Avatar name={name} src={offer.user.profile?.avatarUrl} size={36} />} />
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{offer.description}</p>
            {offer.user.profile?.bio ? <p className="text-sm text-muted-foreground">{offer.user.profile.bio}</p> : null}
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="primary">{labelize(offer.level)}</Badge>
              <Badge tone="neutral">{labelize(offer.format)}</Badge>
              <Badge tone={offer.priceMode === 'free' ? 'success' : 'neutral'}>
                {PRICE_MODE_LABELS[offer.priceMode] ?? offer.priceMode}
                {offer.priceMode === 'paid' && offer.priceCents ? ` · ${formatMoney(offer.priceCents)}` : ''}
              </Badge>
              {offer.language ? <Badge tone="neutral">{offer.language}</Badge> : null}
            </div>
            <DefinitionList
              items={[
                { label: 'Taught by', value: name },
                { label: 'City', value: offer.user.profile?.city ?? offer.city ?? 'Online only' },
                { label: 'Availability', value: offer.availability ?? 'Not specified' },
                { label: 'Listed', value: formatRelative(offer.createdAt) },
              ]}
            />
            {!isOwner && user ? (
              <>
                <ConnectForm offerId={offer.id} />
                <div className="flex flex-wrap gap-2">
                  <SaveButton targetType="skill_offer" targetId={offer.id} saved={saved.has(offer.id)} />
                  <ReportButton targetType="skill_offer" targetId={offer.id} />
                </div>
              </>
            ) : null}
            {isOwner ? (
              <Alert tone="info">This is your own listing. Manage it from the “My listings” tab.</Alert>
            ) : !user ? (
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="link">
                  Sign in
                </Link>{' '}
                to send a connect request.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={`Reviews for ${name} (${offer.reviews.length})`} description="Reviews come from people who actually connected." />
          <CardContent>
            <ReviewList reviews={offer.reviews} />
          </CardContent>
        </Card>
      </div>

      <Alert tone="warning" title="Meet safely">
        Choose a public place or a video call for the first session. Never share your home address, and never send money before you
        have met or spoken.
      </Alert>
    </div>
  );
}
