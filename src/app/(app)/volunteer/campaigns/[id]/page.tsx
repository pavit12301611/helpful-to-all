import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getCampaign } from '@/features/volunteer/service';
import {
  CampaignProgressPanel,
  CampaignUpdateForm,
  CampaignUpdateList,
  DeleteCampaignButton,
  VolunteerWarning,
} from '@/features/volunteer/components';
import { ReportButton, SaveButton, VoteControl } from '@/features/social/components';
import { savedTargetTypes, scoreFor } from '@/features/social/service';
import { Badge, Card, CardContent, CardHeader, DefinitionList, SectionHeading, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatDate, formatMoney, formatRelative } from '@/lib/utils';
import { isAppError, NotFoundError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Donation campaign' };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaign(user?.id ?? null, id, user?.role ?? 'user');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Campaign unavailable">It may have been removed by the organiser or hidden by a moderator.</Alert>
          <Link href="/volunteer?tab=campaigns" className="link text-sm">
            Back to campaigns
          </Link>
        </div>
      );
    }
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="You cannot see this campaign">
            {error.message}
          </Alert>
          <Link href="/volunteer?tab=campaigns" className="link text-sm">
            Back to campaigns
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [score, saved] = await Promise.all([
    scoreFor('campaign', id),
    user ? savedTargetTypes(user.id, 'campaign') : Promise.resolve(new Set<string>()),
  ]);

  const isOrganizer = user?.id === campaign.organizerId;
  const organizerName = campaign.organizer.profile?.displayName ?? campaign.organizer.username;

  return (
    <div className="space-y-5">
      <Link href="/volunteer?tab=campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to campaigns
      </Link>

      <SectionHeading
        title={campaign.title}
        description={`Organised by ${organizerName}`}
        action={
          <div className="flex items-center gap-1">
            {campaign.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
            <Badge tone="neutral">{labelize(campaign.kind)}</Badge>
          </div>
        }
      />

      <VolunteerWarning />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="About this campaign" />
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{campaign.description}</p>
            <DefinitionList
              items={[
                { label: 'Cause', value: labelize(campaign.cause) },
                { label: 'Collecting', value: labelize(campaign.kind) },
                { label: 'Items needed', value: campaign.itemsNeeded || 'Not specified' },
                { label: 'Location', value: [campaign.city, campaign.country].filter(Boolean).join(', ') || 'Not shared' },
                { label: 'Ends', value: campaign.deadline ? formatDate(campaign.deadline) : 'No end date' },
                { label: 'Started', value: formatRelative(campaign.createdAt) },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <VoteControl targetType="campaign" targetId={campaign.id} score={score} vertical={false} />
              {user ? <SaveButton targetType="campaign" targetId={campaign.id} saved={saved.has(campaign.id)} label="Follow campaign" /> : null}
              {user && !isOrganizer ? <ReportButton targetType="campaign" targetId={campaign.id} /> : null}
            </div>
            {isOrganizer ? <DeleteCampaignButton id={campaign.id} title={campaign.title} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Progress and how to help" description="OpenHub records progress but never handles money." />
          <CardContent className="space-y-4">
            <CampaignProgressPanel
              campaignId={campaign.id}
              raisedCents={campaign.raisedCents}
              goalCents={campaign.goalCents}
              isOrganizer={isOrganizer}
            />
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">How to donate</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Verify the organiser: {campaign.verified ? 'this campaign was checked by a moderator.' : 'this campaign has not been verified yet.'}</li>
                <li>
                  Contact them{campaign.contactEmail ? ` at ${campaign.contactEmail}` : ' through OpenHub messages'} and ask how they
                  accept donations.
                </li>
                <li>
                  {campaign.kind === 'goods' || campaign.kind === 'food' || campaign.kind === 'clothing'
                    ? 'Prefer handing goods over in person at a public place.'
                    : `Typical goal: ${campaign.goalCents ? formatMoney(campaign.goalCents) : 'set by the organiser'}.`}
                </li>
                <li>Keep a receipt or screenshot of anything you send.</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">Payment provider: {campaign.payments.label}. No card details are stored by OpenHub.</p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={`Updates (${campaign.updates.length})`}
              description={isOrganizer ? 'Tell donors where the money or goods went.' : 'Updates from the organiser.'}
            />
            <CardContent className="space-y-4">
              {isOrganizer ? <CampaignUpdateForm campaignId={campaign.id} /> : null}
              <CampaignUpdateList updates={campaign.updates} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
