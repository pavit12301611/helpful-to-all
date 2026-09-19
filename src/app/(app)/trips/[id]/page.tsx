import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, MapPin } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getTrip, tripBalances } from '@/features/trips/service';
import {
  ItineraryForm,
  ItineraryRow,
  PackingForm,
  PackingList,
  TripActions,
  TripBalances,
  TripExpenseForm,
  TripForm,
  TripMapLinks,
  TripPollCard,
  TripPollForm,
  TravellerForm,
} from '@/features/trips/components';
import { Avatar, Badge, Card, CardContent, CardHeader, SectionHeading, Stat } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';
import { formatMoney } from '@/lib/utils';
import { settleTripSplitAction } from '@/features/trips/actions';
import { ServerForm } from '@/components/forms/server-form';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Trip plan' };

const TABS = [
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'packing', label: 'Packing' },
  { key: 'budget', label: 'Budget & splits' },
  { key: 'polls', label: 'Polls' },
  { key: 'details', label: 'Details & people' },
];

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const { id } = await params;
  const search = await searchParams;
  const tab = TABS.some((entry) => entry.key === search.tab) ? (search.tab as string) : 'itinerary';

  const trip = await getTrip(user.id, id).catch(() => null);
  if (!trip) notFound();

  const isOwner = trip.ownerId === user.id;
  const currency = trip.currency || 'INR';
  const spentCents = trip.expenses.reduce((total, expense) => total + expense.amountCents, 0);
  const remainingCents = trip.budgetCents !== null ? trip.budgetCents - spentCents : null;
  const packedCount = trip.packing.filter((item) => item.packedAt).length;
  const balances = tripBalances(
    trip.expenses.map((expense) => ({
      id: expense.id,
      ownerId: expense.ownerId,
      amountCents: expense.amountCents,
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        shareCents: split.shareCents,
        settledAt: split.settledAt,
      })),
    })),
    trip.members.map((member) => member.userId),
  );

  return (
    <div className="grid gap-6">
      <SectionHeading
        title={trip.title}
        description={trip.destination ?? 'Destination to be decided'}
        icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
        action={<TripActions tripId={trip.id} isOwner={isOwner} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Dates"
          value={trip.startsAt ? `${trip.startsAt.toLocaleDateString()} – ${trip.endsAt ? trip.endsAt.toLocaleDateString() : '…'}` : 'To be decided'}
          hint={trip.startsAt ? undefined : 'Add dates in Details & people'}
        />
        <Stat label="Spent" value={formatMoney(spentCents, currency)} hint={`${trip.expenses.length} shared expenses`} />
        <Stat
          label="Budget left"
          value={remainingCents === null ? 'No budget set' : formatMoney(remainingCents, currency)}
          hint={remainingCents !== null && remainingCents < 0 ? 'Over budget' : undefined}
        />
        <Stat label="Packed" value={`${packedCount}/${trip.packing.length}`} hint={`${trip.members.length} travellers`} />
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Travellers</span>
            {trip.members.map((member) => (
              <span key={member.id} className="flex items-center gap-2">
                <Avatar name={member.user.profile?.displayName ?? member.user.username} src={member.user.profile?.avatarUrl ?? undefined} size={28} />
                <span className="text-sm text-muted-foreground">{member.user.profile?.displayName ?? member.user.username}</span>
                {member.role === 'owner' ? <Badge tone="primary">owner</Badge> : null}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs tabs={TABS} current={tab} basePath={`/trips/${trip.id}`} searchParams={search} />

      {tab === 'itinerary' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Itinerary" description="Everything planned, in time order." />
            <CardContent>
              {trip.itinerary.length === 0 ? (
                <EmptyState title="Nothing planned yet" description="Add the first thing you want to do on this trip." />
              ) : (
                <ul>
                  {trip.itinerary.map((item) => (
                    <ItineraryRow key={item.id} tripId={trip.id} item={item} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <ItineraryForm tripId={trip.id} />
            <Card>
              <CardHeader title="Maps" description="Opens the destination in your map provider. No API key needed." />
              <CardContent>
                <TripMapLinks destination={trip.destination} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'packing' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title={`Packing list (${packedCount}/${trip.packing.length} packed)`} description="Shared with everyone on the trip." />
            <CardContent>
              {trip.packing.length === 0 ? (
                <EmptyState title="Empty packing list" description="Add passports, chargers, medicine — whatever this trip needs." />
              ) : (
                <PackingList tripId={trip.id} items={trip.packing} />
              )}
            </CardContent>
          </Card>
          <PackingForm tripId={trip.id} />
        </div>
      ) : null}

      {tab === 'budget' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Shared expenses" description="Each expense is split evenly across the travellers." />
            <CardContent>
              {trip.expenses.length === 0 ? (
                <EmptyState title="No shared expenses yet" description="Add what someone paid and everyone's share is calculated." />
              ) : (
                <ul className="divide-y divide-border">
                  {trip.expenses.map((expense) => (
                    <li key={expense.id} className="grid gap-2 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.owner.profile?.displayName ?? expense.owner.username} · {expense.occurredOn.toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-foreground">{formatMoney(expense.amountCents, currency)}</span>
                      </div>
                      <ul className="grid gap-1">
                        {expense.splits.map((split) => (
                          <li key={split.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">
                              {split.user.profile?.displayName ?? split.user.username} · {formatMoney(split.shareCents ?? 0, currency)}
                            </span>
                            {split.userId === user.id ? (
                              <ServerForm action={settleTripSplitAction}>
                                {({ pending }) => (
                                  <span className="flex items-center gap-2">
                                    <input type="hidden" name="tripId" value={trip.id} />
                                    <input type="hidden" name="splitId" value={split.id} />
                                    <input type="hidden" name="settled" value={split.settledAt ? 'false' : 'true'} />
                                    <Button type="submit" variant="ghost" size="sm" loading={pending}>
                                      {split.settledAt ? 'Mark unpaid' : 'Mark settled'}
                                    </Button>
                                  </span>
                                )}
                              </ServerForm>
                            ) : (
                              <span className="text-xs text-muted-foreground">{split.settledAt ? 'settled' : 'outstanding'}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <TripExpenseForm tripId={trip.id} memberCount={trip.members.length} />
            <Card>
              <CardHeader title="Who owes whom" description="Positive means the group owes that person." />
              <CardContent>
                <TripBalances
                  balances={balances}
                  currency={currency}
                  members={trip.members.map((member) => ({
                    userId: member.userId,
                    username: member.user.username,
                    displayName: member.user.profile?.displayName ?? null,
                    avatarUrl: member.user.profile?.avatarUrl ?? null,
                  }))}
                />
              </CardContent>
            </Card>
            {trip.accommodationNotes || trip.transportNotes || trip.importantContacts ? (
              <Card>
                <CardHeader title="Trip notes" description="Only visible to people on this trip." />
                <CardContent className="grid gap-3 text-sm">
                  {trip.accommodationNotes ? (
                    <p>
                      <span className="font-medium text-foreground">Accommodation: </span>
                      {trip.accommodationNotes}
                    </p>
                  ) : null}
                  {trip.transportNotes ? (
                    <p>
                      <span className="font-medium text-foreground">Transport: </span>
                      {trip.transportNotes}
                    </p>
                  ) : null}
                  {trip.importantContacts ? (
                    <p>
                      <span className="font-medium text-foreground">Important contacts: </span>
                      {trip.importantContacts}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'polls' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            {trip.polls.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState title="No polls yet" description="Ask the group to pick a date, place or activity." />
                </CardContent>
              </Card>
            ) : (
              trip.polls.map((poll) => <TripPollCard key={poll.id} tripId={trip.id} poll={poll} />)
            )}
          </div>
          <TripPollForm tripId={trip.id} />
        </div>
      ) : null}

      {tab === 'details' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {isOwner ? (
            <div className="grid gap-4">
              <TripForm trip={trip} />
              <TravellerForm tripId={trip.id} />
            </div>
          ) : (
            <Card>
              <CardContent>
                <Alert tone="info">
                  Only {trip.owner.profile?.displayName ?? trip.owner.username} can change the trip details or add travellers.
                </Alert>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4">
            <Card>
              <CardHeader title="Who is coming" description="Travellers see the itinerary, packing list and shared budget." />
              <CardContent>
                <ul className="divide-y divide-border">
                  {trip.members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2">
                        <Avatar name={member.user.profile?.displayName ?? member.user.username} src={member.user.profile?.avatarUrl ?? undefined} size={28} />
                        <span className="text-sm text-foreground">{member.user.profile?.displayName ?? member.user.username}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {member.role}
                        {member.userId === user.id ? <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Leaving or deleting" description="Deleting removes the trip page for everyone. Shared expenses stay in your expense history." />
              <CardContent>
                <TripActions tripId={trip.id} isOwner={isOwner} />
              </CardContent>
            </Card>
            {trip.visibility === 'members' ? (
              <Card>
                <CardContent>
                  <Alert tone="info">
                    This trip is visible to all OpenHub members. Contact details you added are still only shown to travellers.
                  </Alert>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
