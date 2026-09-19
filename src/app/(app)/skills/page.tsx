import type { Metadata } from 'next';
import { Handshake } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { averageSkillRating, listConnections, listOffers, listRequests, listSkills, myListingCounts, suggestMatches } from '@/features/skills/service';
import { SKILL_PAGE_SIZE, skillFilters } from '@/features/skills/schemas';
import {
  ConnectionCard,
  MatchList,
  MyListingRow,
  OfferCard,
  RequestCard,
  SkillOfferForm,
  SkillRequestForm,
} from '@/features/skills/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';
import { SKILL_FORMATS } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Skill exchange' };

const TABS = [
  { key: 'teach', label: 'People who teach' },
  { key: 'learn', label: 'People who want to learn' },
  { key: 'connections', label: 'My connections' },
  { key: 'matches', label: 'Suggested matches' },
  { key: 'mine', label: 'My listings' },
];

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'teach';
  const db = await getDb();

  const filters = skillFilters.parse({
    q: params.q,
    skill: params.skill,
    format: params.format,
    city: params.city,
    priceMode: params.priceMode,
    kind: tab === 'learn' ? 'learn' : 'teach',
    page: params.page,
  });

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const viewerPoint =
    profile?.latitude !== null && profile?.latitude !== undefined && profile?.longitude !== null && profile?.longitude !== undefined
      ? { lat: profile.latitude, lng: profile.longitude }
      : null;

  const [skills, offerResult, requestResult, connections, mine, matches, rating] = await Promise.all([
    listSkills(),
    listOffers(user.id, filters),
    listRequests(user.id, filters),
    listConnections(user.id),
    myListingCounts(user.id),
    suggestMatches(user.id, viewerPoint),
    averageSkillRating(user.id),
  ]);

  const filterParams: Record<string, string | undefined> = {
    q: filters.q,
    skill: filters.skill,
    format: filters.format,
    city: filters.city,
    priceMode: filters.priceMode,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Skill exchange"
        description="Teach what you know, learn what you need. Meet in public places or online - never share home addresses."
        action={rating.average !== null ? <span className="text-sm text-muted-foreground">Your rating: {rating.average}/5 ({rating.count})</span> : null}
      />

      <Alert tone="info" title="Stay safe">
        Arrange first meetings in a public place or on a call. OpenHub never asks for payment details and does not handle money -
        agree any exchange directly with the other person.
      </Alert>

      <Tabs tabs={TABS} current={tab} basePath="/skills" searchParams={filterParams} />

      {tab === 'teach' || tab === 'learn' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={tab === 'teach' ? 'Offer to teach something' : 'Ask to learn something'}
              description={tab === 'teach' ? 'Free, skill exchange or paid - your choice.' : 'Say what you want to achieve so people can help.'}
            />
            <CardContent>
              {tab === 'teach' ? (
                <SkillOfferForm skills={skills} defaultCity={profile?.city ?? ''} />
              ) : (
                <SkillRequestForm skills={skills} defaultCity={profile?.city ?? ''} />
              )}
            </CardContent>
          </Card>

          <form action="/skills" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value={tab} />
            <div>
              <label htmlFor="skill-q" className="label">
                Search skill
              </label>
              <input id="skill-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="python, english, repair" />
            </div>
            <div>
              <label htmlFor="skill-skill" className="label">
                Skill
              </label>
              <select id="skill-skill" name="skill" defaultValue={filters.skill ?? ''} className="input-base">
                <option value="">All skills</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="skill-format" className="label">
                Format
              </label>
              <select id="skill-format" name="format" defaultValue={filters.format ?? ''} className="input-base">
                <option value="">Any format</option>
                {SKILL_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {labelize(format)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="skill-city" className="label">
                City
              </label>
              <input id="skill-city" name="city" defaultValue={filters.city ?? ''} className="input-base max-w-[10rem]" />
            </div>
            {tab === 'teach' ? (
              <div>
                <label htmlFor="skill-priceMode" className="label">
                  Payment
                </label>
                <select id="skill-priceMode" name="priceMode" defaultValue={filters.priceMode ?? ''} className="input-base">
                  <option value="">Any</option>
                  <option value="free">Free</option>
                  <option value="exchange">Skill exchange</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            ) : null}
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Apply</button>
          </form>

          {tab === 'teach' ? (
            offerResult.offers.length === 0 ? (
              <EmptyState title="No teaching offers match" description="Try another skill or city, or publish the first offer." icon={<Handshake className="h-8 w-8" aria-hidden="true" />} />
            ) : (
              <ul className="space-y-2">
                {offerResult.offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </ul>
            )
          ) : requestResult.requests.length === 0 ? (
            <EmptyState title="No learning requests match" description="Try another skill or city, or publish what you want to learn." icon={<Handshake className="h-8 w-8" aria-hidden="true" />} />
          ) : (
            <ul className="space-y-2">
              {requestResult.requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </ul>
          )}

          <Pagination
            page={filters.page}
            pageSize={SKILL_PAGE_SIZE}
            total={tab === 'teach' ? offerResult.total : requestResult.total}
            basePath="/skills"
            searchParams={{ ...filterParams, tab }}
          />
        </div>
      ) : null}

      {tab === 'connections' ? (
        connections.length === 0 ? (
          <EmptyState title="No connections yet" description="Send a connect request from any teaching offer or learning request." icon={<Handshake className="h-8 w-8" aria-hidden="true" />} />
        ) : (
          <ul className="space-y-2">
            {connections.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} currentUserId={user.id} />
            ))}
          </ul>
        )
      ) : null}

      {tab === 'matches' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="People who can teach what you want to learn" description="Ordered by distance when both of you shared a city." />
            <CardContent>
              <MatchList title="Teachers for your requests" rows={matches.teachers} kind="offer" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="People who want to learn what you teach" />
            <CardContent>
              <MatchList title="Learners for your offers" rows={matches.learners} kind="request" />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'mine' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={`Your teaching offers (${mine.offers.length})`} />
            <CardContent>
              {mine.offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have not published an offer yet.</p>
              ) : (
                <ul className="space-y-2">
                  {mine.offers.map((offer) => (
                    <MyListingRow key={offer.id} kind="offer" id={offer.id} title={`${offer.skill.name} · teach`} isActive={offer.isActive} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Your learning requests (${mine.requests.length})`} />
            <CardContent>
              {mine.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have not published a request yet.</p>
              ) : (
                <ul className="space-y-2">
                  {mine.requests.map((request) => (
                    <MyListingRow key={request.id} kind="request" id={request.id} title={`${request.skill.name} · learn`} isActive={request.isActive} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
