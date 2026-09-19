import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import {
  getMyDonorProfile,
  listBloodDonors,
  listEmergencyContacts,
  listEmergencyNumbers,
  listGuides,
  listMissingPersons,
} from '@/features/safety/service';
import { safetyFilters } from '@/features/safety/schemas';
import {
  DonorForm,
  DonorList,
  EmergencyCard,
  EmergencyContactForm,
  EmergencyContactList,
  EmergencyNumberForm,
  EmergencyNumbersTable,
  GuideForm,
  GuideList,
  MissingPersonForm,
  MissingPersonList,
  SafetyBanner,
} from '@/features/safety/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';
import { BLOOD_GROUPS, EMERGENCY_SERVICES } from '@/lib/enums';
import { isStaffRole } from '@/server/core/permissions';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Safety hub' };

const TABS = [
  { key: 'numbers', label: 'Emergency numbers' },
  { key: 'guides', label: 'First aid and disasters' },
  { key: 'blood', label: 'Blood donors' },
  { key: 'missing', label: 'Missing persons' },
  { key: 'card', label: 'My emergency card' },
];

export default async function SafetyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'numbers';
  const db = await getDb();

  const filters = safetyFilters.parse({
    country: params.country,
    service: params.service,
    q: params.q,
    bloodGroup: params.bloodGroup,
    city: params.city,
    kind: params.kind,
    status: params.status,
  });

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const canModerate = isStaffRole(user.role);

  const [numbers, guides, donors, myDonor, contacts, missing] = await Promise.all([
    listEmergencyNumbers(filters),
    listGuides(filters),
    listBloodDonors(filters),
    getMyDonorProfile(user.id),
    listEmergencyContacts(user.id),
    listMissingPersons(filters),
  ]);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Safety hub"
        description="Emergency numbers, first aid guides, blood donors, missing person reports and your own emergency card."
        icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
      />

      <SafetyBanner />

      <Tabs tabs={TABS} current={tab} basePath="/safety" searchParams={{}} />

      {tab === 'numbers' ? (
        <div className="space-y-4">
          <form action="/safety" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value="numbers" />
            <div>
              <label htmlFor="num-country" className="label">
                Country
              </label>
              <input id="num-country" name="country" defaultValue={filters.country ?? ''} className="input-base max-w-xs" list="country-options" placeholder="India" />
              <datalist id="country-options">
                {numbers.countries.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="num-service" className="label">
                Service
              </label>
              <select id="num-service" name="service" defaultValue={filters.service ?? ''} className="input-base">
                <option value="">All services</option>
                {EMERGENCY_SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {labelize(service)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Show numbers
            </button>
          </form>

          <EmergencyNumbersTable numbers={numbers.numbers} canManage={canModerate} />

          {canModerate ? (
            <Card>
              <CardHeader title="Add an emergency number" description="Only moderators can add or remove numbers. Always cite an official source." />
              <CardContent>
                <EmergencyNumberForm />
              </CardContent>
            </Card>
          ) : (
            <Alert tone="info">Numbers are maintained by moderators. Report a wrong number from the admin contact page.</Alert>
          )}
        </div>
      ) : null}

      {tab === 'guides' ? (
        <div className="space-y-4">
          <form action="/safety" className="flex flex-wrap items-end gap-2" role="search">
            <input type="hidden" name="tab" value="guides" />
            <div>
              <label htmlFor="guide-kind" className="label">
                Type
              </label>
              <select id="guide-kind" name="kind" defaultValue={filters.kind ?? ''} className="input-base">
                <option value="">All guides</option>
                <option value="first_aid">First aid</option>
                <option value="disaster">Disaster</option>
                <option value="health">Health</option>
                <option value="safety">Safety</option>
              </select>
            </div>
            <div>
              <label htmlFor="guide-q" className="label">
                Search
              </label>
              <input id="guide-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="burn, flood, heat" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Search guides
            </button>
          </form>

          {guides.length === 0 ? (
            <EmptyState title="No guides match" description="Try another type, or clear the search." icon={<ShieldAlert className="h-8 w-8" aria-hidden="true" />} />
          ) : (
            <GuideList guides={guides} />
          )}

          {canModerate ? (
            <Card>
              <CardHeader title="Publish a guide" description="Keep steps short and factual. Say clearly that it is not medical advice." />
              <CardContent>
                <GuideForm />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'blood' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Find a donor" description="Contact details stay private - donors are messaged through OpenHub." />
            <CardContent className="space-y-4">
              <form action="/safety" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="tab" value="blood" />
                <div>
                  <label htmlFor="blood-group" className="label">
                    Blood group
                  </label>
                  <select id="blood-group" name="bloodGroup" defaultValue={filters.bloodGroup ?? ''} className="input-base">
                    <option value="">Any group</option>
                    {BLOOD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="blood-city" className="label">
                    City
                  </label>
                  <input id="blood-city" name="city" defaultValue={filters.city ?? ''} className="input-base max-w-[10rem]" />
                </div>
                <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                  Search
                </button>
              </form>
              <DonorList donors={donors} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Register as a donor" description="Only your blood group and city are listed publicly." />
            <CardContent>
              <DonorForm profile={myDonor} defaultCity={profile?.city ?? ''} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'missing' ? (
        <div className="space-y-4">
          <Alert tone="danger" title="OpenHub cannot search for people">
            Always file a police report first, and only post here with the family&apos;s permission. Never share a child&apos;s
            school, routine or home address.
          </Alert>

          <form action="/safety" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tab" value="missing" />
            <div>
              <label htmlFor="missing-status" className="label">
                Status
              </label>
              <select id="missing-status" name="status" defaultValue={filters.status ?? ''} className="input-base">
                <option value="">Open reports</option>
                <option value="searching">Searching</option>
                <option value="found">Found</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="missing-q" className="label">
                Search
              </label>
              <input id="missing-q" name="q" defaultValue={filters.q ?? ''} className="input-base max-w-xs" placeholder="Name or area" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Filter
            </button>
          </form>

          <MissingPersonList reports={missing} currentUserId={user.id} isStaff={canModerate} />

          <Card>
            <CardHeader title="Report a missing person" description="Moderators review every report before it is featured." />
            <CardContent>
              <MissingPersonForm />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'card' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="My emergency card"
              description="Print it and keep it in your wallet or on your phone lock screen."
            />
            <CardContent>
              <EmergencyCard
                displayName={profile?.displayName ?? user.username}
                bloodGroup={myDonor?.bloodGroup ?? null}
                contacts={contacts}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Emergency contacts" description="These people are only visible to you and on your printed card." />
            <CardContent className="space-y-4">
              <EmergencyContactForm />
              <EmergencyContactList contacts={contacts} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
