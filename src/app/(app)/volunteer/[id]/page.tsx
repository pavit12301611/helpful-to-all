import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getOpportunity } from '@/features/volunteer/service';
import { DeleteOpportunityButton, SignupForm, SignupList, VolunteerWarning } from '@/features/volunteer/components';
import { CommentThread, ReportButton, SaveButton, VoteControl } from '@/features/social/components';
import { listComments, savedTargetTypes, scoreFor } from '@/features/social/service';
import { Badge, Card, CardContent, CardHeader, DefinitionList, SectionHeading, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatDate, formatRelative } from '@/lib/utils';
import { isAppError, NotFoundError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Volunteering opportunity' };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let opportunity;
  try {
    opportunity = await getOpportunity(user?.id ?? null, id, user?.role ?? 'user');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Opportunity unavailable">It may have been removed by the organiser or hidden by a moderator.</Alert>
          <Link href="/volunteer" className="link text-sm">
            Back to volunteering
          </Link>
        </div>
      );
    }
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="You cannot see this opportunity">
            {error.message}
          </Alert>
          <Link href="/volunteer" className="link text-sm">
            Back to volunteering
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [comments, score, saved] = await Promise.all([
    listComments(user?.id ?? null, 'opportunity', id),
    scoreFor('opportunity', id),
    user ? savedTargetTypes(user.id, 'opportunity') : Promise.resolve(new Set<string>()),
  ]);

  const isOrganizer = user?.id === opportunity.organizerId;
  const spotsLeft = Math.max(0, opportunity.volunteersNeeded - opportunity.signups.length);

  return (
    <div className="space-y-5">
      <Link href="/volunteer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to volunteering
      </Link>

      <SectionHeading
        title={opportunity.title}
        description={opportunity.organizationName ?? labelize(opportunity.cause)}
        action={
          <div className="flex items-center gap-1">
            {opportunity.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
            <Badge tone="neutral">{labelize(opportunity.status)}</Badge>
          </div>
        }
      />

      {!opportunity.verified ? (
        <Alert tone="warning" title="This opportunity is not verified">
          A moderator has not checked the organiser yet. Meet in a public place and tell someone where you are going.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="What you will do" />
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{opportunity.description}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" aria-hidden="true" />
                {opportunity.signups.length}/{opportunity.volunteersNeeded} signed up
                {spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : ' · full'}
              </span>
              {opportunity.startsAt ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {formatDate(opportunity.startsAt)}
                </span>
              ) : null}
              {opportunity.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {opportunity.city}
                </span>
              ) : null}
            </div>
            <DefinitionList
              items={[
                { label: 'Cause', value: labelize(opportunity.cause) },
                { label: 'Skills needed', value: opportunity.skillsNeeded || 'None listed' },
                { label: 'Bring', value: opportunity.itemsNeeded || 'Nothing listed' },
                { label: 'Apply by', value: opportunity.deadline ? formatDate(opportunity.deadline) : 'No deadline' },
                { label: 'Posted', value: formatRelative(opportunity.createdAt) },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <VoteControl targetType="opportunity" targetId={opportunity.id} score={score} vertical={false} />
              {user ? <SaveButton targetType="opportunity" targetId={opportunity.id} saved={saved.has(opportunity.id)} /> : null}
              {user && !isOrganizer ? <ReportButton targetType="opportunity" targetId={opportunity.id} /> : null}
            </div>
            {isOrganizer ? <DeleteOpportunityButton id={opportunity.id} title={opportunity.title} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Volunteer" description={isOrganizer ? 'Confirm or decline the people who signed up.' : 'The organiser confirms your spot and messages you here.'} />
          <CardContent className="space-y-4">
            {user && !isOrganizer && !opportunity.mySignup && opportunity.status === 'open' ? <SignupForm opportunityId={opportunity.id} /> : null}
            {opportunity.mySignup ? (
              <Alert tone={opportunity.mySignup.status === 'confirmed' ? 'success' : 'info'} title={`Your signup is ${opportunity.mySignup.status}`}>
                You can cancel any time before the event from “My signups”.
              </Alert>
            ) : null}
            <SignupList signups={opportunity.signups} isOrganizer={isOrganizer} currentUserId={user?.id ?? null} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Questions" description="Ask the organiser anything before you commit." />
            <CardContent>
              {user ? (
                <CommentThread targetType="opportunity" targetId={opportunity.id} comments={comments} currentUserId={user.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="link">
                    Sign in
                  </Link>{' '}
                  to ask a question or sign up.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <VolunteerWarning />
    </div>
  );
}
