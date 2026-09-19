import type { Metadata } from 'next';
import { HandHeart } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listCampaigns, listMySignups, listOpportunities } from '@/features/volunteer/service';
import { VOLUNTEER_PAGE_SIZE, campaignFilters, volunteerFilters } from '@/features/volunteer/schemas';
import {
  CampaignCard,
  CampaignForm,
  MySignupRow,
  OpportunityCard,
  OpportunityForm,
  VolunteerWarning,
} from '@/features/volunteer/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { CAMPAIGN_KINDS, VOLUNTEER_CAUSES } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Volunteer and donate' };

const TABS = [
  { key: 'opportunities', label: 'Volunteer' },
  { key: 'campaigns', label: 'Donate' },
  { key: 'signups', label: 'My signups' },
  { key: 'post-opportunity', label: 'Post an opportunity' },
  { key: 'start-campaign', label: 'Start a campaign' },
];

export default async function VolunteerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'opportunities';

  const opportunityQuery = volunteerFilters.parse({
    q: params.q,
    cause: params.cause,
    city: params.city,
    verified: params.verified,
    upcoming: params.upcoming,
    page: params.page,
  });
  const campaignQuery = campaignFilters.parse({
    q: params.q,
    cause: params.cause,
    kind: params.kind,
    city: params.city,
    verified: params.verified,
    page: params.page,
  });

  const [opportunityResult, campaignResult, signups] = await Promise.all([
    listOpportunities(user.id, opportunityQuery),
    listCampaigns(campaignQuery),
    listMySignups(user.id),
  ]);

  const sharedParams: Record<string, string | undefined> = {
    q: params.q,
    cause: params.cause,
    city: params.city,
    verified: params.verified,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Volunteer and donation centre"
        description="Find ways to help nearby, or support a campaign. OpenHub never processes payments."
      />

      <VolunteerWarning />

      <Tabs tabs={TABS} current={tab} basePath="/volunteer" searchParams={sharedParams} />

      {tab === 'opportunities' ? (
        <div className="space-y-4">
          <form action="/volunteer" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value="opportunities" />
            <div>
              <label htmlFor="vol-q" className="label">
                Search
              </label>
              <input id="vol-q" name="q" defaultValue={params.q ?? ''} className="input-base max-w-xs" placeholder="Search opportunities" />
            </div>
            <div>
              <label htmlFor="vol-cause" className="label">
                Cause
              </label>
              <select id="vol-cause" name="cause" defaultValue={params.cause ?? ''} className="input-base">
                <option value="">All causes</option>
                {VOLUNTEER_CAUSES.map((cause) => (
                  <option key={cause} value={cause}>
                    {labelize(cause)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vol-city" className="label">
                City
              </label>
              <input id="vol-city" name="city" defaultValue={params.city ?? ''} className="input-base max-w-[10rem]" />
            </div>
            <div>
              <label htmlFor="vol-verified" className="label">
                Verification
              </label>
              <select id="vol-verified" name="verified" defaultValue={params.verified ?? ''} className="input-base">
                <option value="">Any</option>
                <option value="yes">Verified only</option>
                <option value="no">Unverified only</option>
              </select>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm">
              <input type="checkbox" name="upcoming" value="yes" defaultChecked={params.upcoming === 'yes'} />
              Upcoming only
            </label>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply
            </button>
          </form>

          {opportunityResult.opportunities.length === 0 ? (
            <EmptyState
              title="No opportunities match"
              description="Try another cause or city, or post the first opportunity for your area."
              icon={<HandHeart className="h-8 w-8" aria-hidden="true" />}
            />
          ) : (
            <ul className="space-y-2">
              {opportunityResult.opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </ul>
          )}

          <Pagination
            page={opportunityQuery.page}
            pageSize={VOLUNTEER_PAGE_SIZE}
            total={opportunityResult.total}
            basePath="/volunteer"
            searchParams={{ ...sharedParams, tab: 'opportunities', upcoming: params.upcoming }}
          />
        </div>
      ) : null}

      {tab === 'campaigns' ? (
        <div className="space-y-4">
          <form action="/volunteer" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value="campaigns" />
            <div>
              <label htmlFor="cam-q" className="label">
                Search
              </label>
              <input id="cam-q" name="q" defaultValue={params.q ?? ''} className="input-base max-w-xs" placeholder="Search campaigns" />
            </div>
            <div>
              <label htmlFor="cam-cause" className="label">
                Cause
              </label>
              <select id="cam-cause" name="cause" defaultValue={params.cause ?? ''} className="input-base">
                <option value="">All causes</option>
                {VOLUNTEER_CAUSES.map((cause) => (
                  <option key={cause} value={cause}>
                    {labelize(cause)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cam-kind" className="label">
                Collecting
              </label>
              <select id="cam-kind" name="kind" defaultValue={params.kind ?? ''} className="input-base">
                <option value="">Anything</option>
                {CAMPAIGN_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {labelize(kind)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cam-city" className="label">
                City
              </label>
              <input id="cam-city" name="city" defaultValue={params.city ?? ''} className="input-base max-w-[10rem]" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply
            </button>
          </form>

          {campaignResult.campaigns.length === 0 ? (
            <EmptyState title="No campaigns match" description="Try another cause, or start a campaign for a cause you care about." icon={<HandHeart className="h-8 w-8" aria-hidden="true" />} />
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2">
              {campaignResult.campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </ul>
          )}

          <Pagination
            page={campaignQuery.page}
            pageSize={VOLUNTEER_PAGE_SIZE}
            total={campaignResult.total}
            basePath="/volunteer"
            searchParams={{ ...sharedParams, tab: 'campaigns', kind: params.kind }}
          />
        </div>
      ) : null}

      {tab === 'signups' ? (
        signups.length === 0 ? (
          <EmptyState title="You have not signed up yet" description="Find an opportunity and sign up - the organiser confirms your spot." icon={<HandHeart className="h-8 w-8" aria-hidden="true" />} />
        ) : (
          <ul className="space-y-2">
            {signups.map((signup) => (
              <MySignupRow key={signup.id} signup={signup} />
            ))}
          </ul>
        )
      ) : null}

      {tab === 'post-opportunity' ? (
        <Card>
          <CardHeader title="Post a volunteering opportunity" description="Be specific about the date, place and what volunteers will do." />
          <CardContent>
            <OpportunityForm />
          </CardContent>
        </Card>
      ) : null}

      {tab === 'start-campaign' ? (
        <div className="space-y-4">
          <Alert tone="warning" title="No payment processing">
            OpenHub does not take money, store card details or charge fees. Your campaign shows a goal, a contact address and your
            updates - donors contact you directly.
          </Alert>
          <Card>
            <CardHeader title="Start a campaign" description="Verified campaigns get a badge after a moderator checks the organisation." />
            <CardContent>
              <CampaignForm />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
