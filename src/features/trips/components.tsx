'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Circle, Map, Plus, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardContent, CardHeader, Stat } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { formatMoney } from '@/lib/utils';
import {
  addItineraryItemAction,
  addPackingItemAction,
  addTripExpenseAction,
  addTripMemberAction,
  createTripAction,
  createTripPollAction,
  deleteItineraryItemAction,
  deletePackingItemAction,
  deleteTripAction,
  leaveTripAction,
  settleTripSplitAction,
  togglePackedAction,
  updateTripAction,
  voteTripPollAction,
} from './actions';
import { PACKING_CATEGORIES } from './schemas';

export type TripRecord = {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  budgetCents: number | null;
  currency: string;
  visibility: string;
  accommodationNotes: string | null;
  transportNotes: string | null;
  importantContacts: string | null;
};

function formDataOf(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function TripForm({ trip }: { trip?: TripRecord }) {
  return (
    <Card>
      <CardHeader
        title={trip ? 'Edit trip' : 'Plan a new trip'}
        description="Itinerary, packing list, shared budget and polls live on the trip page."
      />
      <CardContent>
        <ServerForm action={trip ? updateTripAction : createTripAction} className="space-y-3" ariaLabel={trip ? 'Edit trip' : 'Create trip'}>
          {({ errors, pending }) => (
            <>
              {trip ? <input type="hidden" name="tripId" defaultValue={trip.id} /> : null}
              <Field label="Trip name" name="title" error={errors.title} required>
                {(props) => (
                  <Input
                    {...props}
                    name="title"
                    required
                    maxLength={100}
                    defaultValue={trip?.title}
                    placeholder="Goa with friends"
                  />
                )}
              </Field>
              <Field label="Destination" name="destination" error={errors.destination} hint="Used for the map and directions links.">
                {(props) => <Input {...props} name="destination" maxLength={120} defaultValue={trip?.destination ?? undefined} placeholder="Goa, India" />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Starts" name="startsAt" error={errors.startsAt}>
                  {(props) => (
                    <Input
                      {...props}
                      name="startsAt"
                      type="date"
                      defaultValue={trip?.startsAt ? trip.startsAt.toISOString().slice(0, 10) : undefined}
                    />
                  )}
                </Field>
                <Field label="Ends" name="endsAt" error={errors.endsAt}>
                  {(props) => (
                    <Input {...props} name="endsAt" type="date" defaultValue={trip?.endsAt ? trip.endsAt.toISOString().slice(0, 10) : undefined} />
                  )}
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Total budget (minor units)" name="budgetCents" error={errors.budgetCents} hint="100 = 1.00 of the currency below.">
                  {(props) => (
                    <Input {...props} name="budgetCents" type="number" min={0} step={100} defaultValue={trip?.budgetCents ?? undefined} />
                  )}
                </Field>
                <Field label="Currency" name="currency" error={errors.currency}>
                  {(props) => <Input {...props} name="currency" maxLength={3} defaultValue={trip?.currency ?? 'INR'} />}
                </Field>
              </div>
              <Field label="Notes" name="description" error={errors.description}>
                {(props) => <Textarea {...props} name="description" rows={3} defaultValue={trip?.description ?? undefined} placeholder="Flights booked. Beach days planned." />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Accommodation" name="accommodationNotes" error={errors.accommodationNotes}>
                  {(props) => <Textarea {...props} name="accommodationNotes" rows={2} defaultValue={trip?.accommodationNotes ?? undefined} />}
                </Field>
                <Field label="Transport" name="transportNotes" error={errors.transportNotes}>
                  {(props) => <Textarea {...props} name="transportNotes" rows={2} defaultValue={trip?.transportNotes ?? undefined} />}
                </Field>
              </div>
              <Field
                label="Important contacts"
                name="importantContacts"
                error={errors.importantContacts}
                hint="Only travellers see these. Do not add them to a public post."
              >
                {(props) => (
                  <Textarea {...props} name="importantContacts" rows={2} defaultValue={trip?.importantContacts ?? undefined} placeholder="Hotel: +91 …  ·  Local friend: …" />
                )}
              </Field>
              <Field label="Who can see this trip" name="visibility" error={errors.visibility}>
                {(props) => (
                  <Select {...props} name="visibility" defaultValue={trip?.visibility ?? 'private'}>
                    <option value="private">Only invited travellers</option>
                    <option value="members">All OpenHub members</option>
                  </Select>
                )}
              </Field>
              <SubmitButton pending={pending}>{trip ? 'Save trip' : 'Create trip'}</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function TripList({
  trips,
}: {
  trips: (TripRecord & { _count: { members: number; itinerary: number; expenses: number } })[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <Card key={trip.id} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/trips/${trip.id}`} className="font-medium text-foreground hover:text-primary">
                {trip.title}
              </Link>
              <Badge tone="neutral">{trip._count.members} going</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{trip.destination ?? 'Destination to be decided'}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {trip.startsAt ? trip.startsAt.toLocaleDateString() : 'Dates to be decided'}
            </p>
            {trip.budgetCents ? <Stat label="Budget" value={formatMoney(trip.budgetCents, trip.currency)} /> : null}
            <Link href={`/trips/${trip.id}`} className="mt-auto text-sm font-medium text-primary">
              Open trip plan
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TripActions({ tripId, isOwner }: { tripId: string; isOwner: boolean }) {
  if (isOwner) {
    return (
      <ConfirmActionButton
        action={() => deleteTripAction(formDataOf({ tripId }))}
        title="Delete this trip?"
        description="The trip page is removed for everyone. Shared expenses stay in your expense history."
        confirmLabel="Delete trip"
        successMessage="Trip deleted."
        variant="danger"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }
  return (
    <ConfirmActionButton
      action={() => leaveTripAction(formDataOf({ tripId }))}
      title="Leave this trip?"
      description="You will no longer see the plan or the shared budget."
      confirmLabel="Leave trip"
      successMessage="You left the trip."
      variant="outline"
      label="Leave trip"
    />
  );
}

export function TravellerForm({ tripId }: { tripId: string }) {
  return (
    <Card>
      <CardHeader title="Add a traveller" description="Add someone by their OpenHub username. They get a notification." />
      <CardContent>
        <ServerForm action={addTripMemberAction} className="space-y-3" ariaLabel="Add a traveller">
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="tripId" value={tripId} />
              <Field label="Username" name="username" error={errors.username} required>
                {(props) => <Input {...props} name="username" required maxLength={40} placeholder="priya" />}
              </Field>
              <SubmitButton pending={pending}>Add traveller</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function ItineraryForm({ tripId }: { tripId: string }) {
  return (
    <Card>
      <CardHeader title="Add to the itinerary" description="Anything with a time and a place." />
      <CardContent>
        <ServerForm action={addItineraryItemAction} className="space-y-3" resetOnSuccess ariaLabel="Add itinerary item">
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="tripId" value={tripId} />
              <Field label="What" name="title" error={errors.title} required>
                {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Sunset at Anjuna beach" />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Where" name="location" error={errors.location}>
                  {(props) => <Input {...props} name="location" maxLength={160} placeholder="Anjuna, Goa" />}
                </Field>
                <Field label="Cost (minor units)" name="costCents" error={errors.costCents}>
                  {(props) => <Input {...props} name="costCents" type="number" min={0} step={100} />}
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Starts" name="startsAt" error={errors.startsAt}>
                  {(props) => <Input {...props} name="startsAt" type="datetime-local" />}
                </Field>
                <Field label="Ends" name="endsAt" error={errors.endsAt}>
                  {(props) => <Input {...props} name="endsAt" type="datetime-local" />}
                </Field>
              </div>
              <Field label="Notes" name="description" error={errors.description}>
                {(props) => <Textarea {...props} name="description" rows={2} />}
              </Field>
              <SubmitButton pending={pending}>Add item</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type ItineraryRecord = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  costCents: number | null;
};

export function ItineraryRow({ tripId, item }: { tripId: string; item: ItineraryRecord }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{item.title}</p>
        <p className="text-sm text-muted-foreground">
          {[item.startsAt?.toLocaleString(), item.location].filter(Boolean).join(' · ') || 'No time set'}
        </p>
        {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.costCents ? <span className="text-sm tabular-nums text-muted-foreground">{item.costCents / 100}</span> : null}
        <ConfirmActionButton
          action={() => deleteItineraryItemAction(formDataOf({ tripId, itemId: item.id }))}
          title="Remove this itinerary item?"
          description="It cannot be restored."
          confirmLabel="Remove"
          successMessage="Item removed."
          variant="ghost"
          size="icon"
          label="Remove item"
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        />
      </div>
    </li>
  );
}

export function PackingForm({ tripId }: { tripId: string }) {
  return (
    <Card>
      <CardHeader title="Packing list" description="Tick things off as you pack. Everyone on the trip sees the same list." />
      <CardContent>
        <ServerForm action={addPackingItemAction} className="space-y-3" resetOnSuccess ariaLabel="Add packing item">
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="tripId" value={tripId} />
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <Field label="Item" name="label" error={errors.label} required>
                  {(props) => <Input {...props} name="label" required maxLength={100} placeholder="Passport" />}
                </Field>
                <Field label="Category" name="category" error={errors.category}>
                  {(props) => (
                    <Select {...props} name="category" defaultValue="other">
                      {PACKING_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <SubmitButton pending={pending}>Add item</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type PackingRecord = { id: string; label: string; category: string | null; packedAt: Date | null };

export function PackingList({ tripId, items }: { tripId: string; items: PackingRecord[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <ServerForm action={togglePackedAction} ariaLabel={`${item.packedAt ? 'Unpack' : 'Pack'} ${item.label}`}>
            {({ pending }) => (
              <span className="flex items-center gap-2">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="packed" value={item.packedAt ? 'false' : 'true'} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  loading={pending}
                  aria-pressed={Boolean(item.packedAt)}
                  aria-label={item.packedAt ? `Mark ${item.label} as not packed` : `Mark ${item.label} as packed`}
                >
                  {item.packedAt ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </Button>
                <span className={item.packedAt ? 'text-sm text-muted-foreground line-through' : 'text-sm text-foreground'}>{item.label}</span>
                <Badge tone="neutral">{item.category ?? 'other'}</Badge>
              </span>
            )}
          </ServerForm>
          <ConfirmActionButton
            action={() => deletePackingItemAction(formDataOf({ tripId, itemId: item.id }))}
            title="Remove this item?"
            description="It is removed from the shared list."
            confirmLabel="Remove"
            successMessage="Item removed."
            variant="ghost"
            size="icon"
            label="Remove item"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          />
        </li>
      ))}
    </ul>
  );
}

export function TripExpenseForm({ tripId, memberCount }: { tripId: string; memberCount: number }) {
  return (
    <Card>
      <CardHeader
        title="Add a shared expense"
        description={`Split evenly across the ${memberCount} traveller${memberCount === 1 ? '' : 's'} on this trip.`}
      />
      <CardContent>
        <ServerForm action={addTripExpenseAction} className="space-y-3" resetOnSuccess ariaLabel="Add shared trip expense">
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="tripId" value={tripId} />
              <Field label="What for" name="description" error={errors.description} required>
                {(props) => <Input {...props} name="description" required maxLength={160} placeholder="Dinner at the beach shack" />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Amount (minor units)" name="amountCents" error={errors.amountCents} required>
                  {(props) => <Input {...props} name="amountCents" type="number" min={1} step={100} required />}
                </Field>
                <Field label="Date" name="occurredOn" error={errors.occurredOn}>
                  {(props) => <Input {...props} name="occurredOn" type="date" />}
                </Field>
              </div>
              <SubmitButton pending={pending}>Add expense</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type TripBalance = { userId: string; paidCents: number; owedCents: number; balanceCents: number };

export function TripBalances({
  balances,
  members,
  currency,
}: {
  balances: TripBalance[];
  members: { userId: string; username: string; displayName: string | null; avatarUrl?: string | null }[];
  currency: string;
}) {
  return (
    <ul className="divide-y divide-border">
      {balances.map((balance) => {
        const member = members.find((person) => person.userId === balance.userId);
        return (
          <li key={balance.userId} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={member?.displayName ?? member?.username ?? '?'} src={member?.avatarUrl} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{member?.displayName ?? member?.username ?? 'Member'}</span>
                <span className="block text-xs text-muted-foreground">
                  paid {formatMoney(balance.paidCents, currency)} · share {formatMoney(balance.owedCents, currency)}
                </span>
              </span>
            </span>
            <Badge tone={balance.balanceCents >= 0 ? 'success' : 'danger'}>
              {balance.balanceCents >= 0
                ? `gets back ${formatMoney(balance.balanceCents, currency)}`
                : `owes ${formatMoney(-balance.balanceCents, currency)}`}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export function SplitSettleButton({ tripId, splitId, settled }: { tripId: string; splitId: string; settled: boolean }) {
  return (
    <ServerForm action={settleTripSplitAction} ariaLabel={settled ? 'Mark share unpaid' : 'Mark share settled'}>
      {({ pending }) => (
        <span className="flex items-center gap-2">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="splitId" value={splitId} />
          <input type="hidden" name="settled" value={settled ? 'false' : 'true'} />
          <Button type="submit" variant="ghost" size="sm" loading={pending}>
            {settled ? 'Mark unpaid' : 'Mark settled'}
          </Button>
        </span>
      )}
    </ServerForm>
  );
}

export function TripPollForm({ tripId }: { tripId: string }) {
  const [options, setOptions] = React.useState<string[]>(['', '']);
  return (
    <Card>
      <CardHeader title="Ask the group" description="Pick a restaurant, a date or an activity. One vote per person." />
      <CardContent>
        <ServerForm
          action={createTripPollAction}
          className="space-y-3"
          ariaLabel="Create trip poll"
          onSuccess={() => setOptions(['', ''])}
        >
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="tripId" value={tripId} />
              <Field label="Question" name="question" error={errors.question} required>
                {(props) => <Input {...props} name="question" required maxLength={200} placeholder="Which day do we do the boat trip?" />}
              </Field>
              <fieldset className="grid gap-2">
                <legend className="label">Options</legend>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      name={`option-${index}`}
                      value={option}
                      onChange={(event) =>
                        setOptions((current) => current.map((value, i) => (i === index ? event.target.value : value)))
                      }
                      aria-label={`Option ${index + 1}`}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 2 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove option ${index + 1}`}
                        onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {options.length < 8 ? (
                  <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setOptions((current) => [...current, ''])}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add option
                  </Button>
                ) : null}
                {errors.options ? (
                  <p role="alert" className="text-xs font-medium text-danger">
                    {errors.options}
                  </p>
                ) : null}
              </fieldset>
              <Field label="Closes (optional)" name="closesAt" error={errors.closesAt}>
                {(props) => <Input {...props} name="closesAt" type="datetime-local" />}
              </Field>
              <SubmitButton pending={pending}>Create poll</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type TripPollRecord = {
  id: string;
  question: string;
  closesAt: Date | null;
  options: { id: string; label: string; votes: { userId: string }[] }[];
};

export function TripPollCard({ tripId, poll }: { tripId: string; poll: TripPollRecord }) {
  const closed = Boolean(poll.closesAt && poll.closesAt < new Date());
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
  return (
    <Card>
      <CardHeader
        title={poll.question}
        description={closed ? 'Closed' : `${totalVotes} vote${totalVotes === 1 ? '' : 's'} so far`}
        action={closed ? <Badge tone="neutral">closed</Badge> : undefined}
      />
      <CardContent className="grid gap-2">
        {poll.options.map((option) => {
          const pct = totalVotes ? Math.round((option.votes.length / totalVotes) * 100) : 0;
          return (
            <ServerForm key={option.id} action={voteTripPollAction} ariaLabel={`Vote for ${option.label}`}>
              {({ pending }) => (
                <span className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="pollId" value={poll.id} />
                  <input type="hidden" name="optionIds" value={option.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.votes.length} vote{option.votes.length === 1 ? '' : 's'} · {pct}%
                    </span>
                  </span>
                  <Button type="submit" variant="outline" size="sm" loading={pending} disabled={closed || pending}>
                    Vote
                  </Button>
                </span>
              )}
            </ServerForm>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function TripMapLinks({ destination }: { destination: string | null }) {
  if (!destination) {
    return <Alert tone="info">Add a destination in the trip details to get map and directions links.</Alert>;
  }
  const query = encodeURIComponent(destination);
  const links = [
    { label: 'Open in OpenStreetMap', href: `https://www.openstreetmap.org/search?query=${query}` },
    { label: 'Open in Google Maps', href: `https://www.google.com/maps/search/?api=1&query=${query}` },
    { label: 'Get directions', href: `https://www.openstreetmap.org/directions?to=${query}` },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary"
        >
          <Map className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function TripEmpty() {
  return (
    <EmptyState
      title="No trips yet"
      description="Plan a trip with an itinerary, a shared packing list and a budget that splits fairly."
      icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
    />
  );
}
