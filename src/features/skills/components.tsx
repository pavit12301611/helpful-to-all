'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, Check, Star, Trash2, X } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Avatar, Badge, StatusBadge, labelize } from '@/components/ui/card';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/utils';
import { PRICE_MODE_LABELS } from './schemas';
import {
  completeConnectionAction,
  connectAction,
  createSkillOfferAction,
  createSkillRequestAction,
  deleteListingAction,
  respondConnectionAction,
  reviewSkillAction,
  scheduleMeetingAction,
  setListingActiveAction,
} from './actions';

type Skill = { id: string; name: string };

export function SkillOfferForm({ skills, defaultCity }: { skills: Skill[]; defaultCity: string }) {
  const [priceMode, setPriceMode] = React.useState('free');
  return (
    <ServerForm action={createSkillOfferAction} successMessage="Offer published." resetOnSuccess ariaLabel="Offer to teach a skill" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Skill you can teach" name="skillId" error={errors.skillId} required>
              {(props) => (
                <Select {...props} name="skillId" required defaultValue="">
                  <option value="">Choose a skill</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Your level" name="level" error={errors.level}>
              {(props) => (
                <Select {...props} name="level" defaultValue="intermediate">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </Select>
              )}
            </Field>
            <Field label="Format" name="format" error={errors.format}>
              {(props) => (
                <Select {...props} name="format" defaultValue="both">
                  <option value="online">Online</option>
                  <option value="inperson">In person</option>
                  <option value="both">Either</option>
                </Select>
              )}
            </Field>
            <Field label="Language" name="language" error={errors.language}>
              {(props) => <Input {...props} name="language" defaultValue="en" maxLength={40} />}
            </Field>
            <Field label="City" name="city" error={errors.city} hint="City only - never your street address.">
              {(props) => <Input {...props} name="city" maxLength={80} defaultValue={defaultCity} />}
            </Field>
            <Field label="Payment" name="priceMode" error={errors.priceMode}>
              {(props) => (
                <Select {...props} name="priceMode" defaultValue="free" onChange={(event) => setPriceMode(event.target.value)}>
                  <option value="free">Free</option>
                  <option value="exchange">Skill exchange</option>
                  <option value="paid">Paid</option>
                </Select>
              )}
            </Field>
            {priceMode === 'paid' ? (
              <Field label="Price per session" name="priceCents" error={errors.priceCents}>
                {(props) => <Input {...props} name="priceCents" type="number" min={0} step={100} placeholder="50000 = 500.00" />}
              </Field>
            ) : null}
            <Field label="Travel radius (km)" name="radiusKm" error={errors.radiusKm} hint="Only used to suggest nearby matches.">
              {(props) => <Input {...props} name="radiusKm" type="number" min={0} max={200} placeholder="10" />}
            </Field>
          </div>
          <Field label="What will you teach, and how?" name="description" error={errors.description} required>
            {(props) => <Textarea {...props} name="description" rows={3} required maxLength={800} placeholder="Two hour beginner session on soldering and multimeter use." />}
          </Field>
          <Field label="Availability" name="availability" error={errors.availability}>
            {(props) => <Input {...props} name="availability" maxLength={200} placeholder="Saturdays 10:00-13:00" />}
          </Field>
          <SubmitButton pending={pending}>Publish offer</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function SkillRequestForm({ skills, defaultCity }: { skills: Skill[]; defaultCity: string }) {
  return (
    <ServerForm action={createSkillRequestAction} successMessage="Request published." resetOnSuccess ariaLabel="Ask to learn a skill" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Skill you want to learn" name="skillId" error={errors.skillId} required>
              {(props) => (
                <Select {...props} name="skillId" required defaultValue="">
                  <option value="">Choose a skill</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Your level" name="level" error={errors.level}>
              {(props) => (
                <Select {...props} name="level" defaultValue="beginner">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              )}
            </Field>
            <Field label="Preferred format" name="format" error={errors.format}>
              {(props) => (
                <Select {...props} name="format" defaultValue="both">
                  <option value="online">Online</option>
                  <option value="inperson">In person</option>
                  <option value="both">Either</option>
                </Select>
              )}
            </Field>
            <Field label="City" name="city" error={errors.city}>
              {(props) => <Input {...props} name="city" maxLength={80} defaultValue={defaultCity} />}
            </Field>
          </div>
          <Field label="What do you want to achieve?" name="description" error={errors.description} required>
            {(props) => <Textarea {...props} name="description" rows={3} required maxLength={800} placeholder="I want to hold a basic conversation in English at work." />}
          </Field>
          <Field label="When are you free?" name="availability" error={errors.availability}>
            {(props) => <Input {...props} name="availability" maxLength={200} placeholder="Weekday evenings" />}
          </Field>
          <SubmitButton pending={pending}>Publish request</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function OfferCard({
  offer,
}: {
  offer: {
    id: string;
    description: string | null;
    level: string;
    format: string;
    availability: string | null;
    city: string | null;
    priceMode: string;
    priceCents: number | null;
    isActive: boolean;
    createdAt: Date;
    skill: { id: string; name: string };
    user: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null; city: string | null } | null };
  };
}) {
  const name = offer.user.profile?.displayName ?? offer.user.username;
  return (
    <li className="card-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} src={offer.user.profile?.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/skills/${offer.id}`} className="text-sm font-semibold hover:underline">
              {offer.skill.name}
            </Link>
            <Badge tone="primary">{labelize(offer.level)}</Badge>
            <Badge tone="neutral">{offer.format === 'inperson' ? 'In person' : offer.format === 'online' ? 'Online' : 'Online or in person'}</Badge>
            <Badge tone={offer.priceMode === 'free' ? 'success' : 'neutral'}>
              {PRICE_MODE_LABELS[offer.priceMode] ?? offer.priceMode}
              {offer.priceMode === 'paid' && offer.priceCents ? ` · ${formatMoney(offer.priceCents)}` : ''}
            </Badge>
            {!offer.isActive ? <Badge tone="neutral">Paused</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{offer.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {name}
            {offer.user.profile?.city || offer.city ? ` · ${offer.user.profile?.city ?? offer.city}` : ''}
            {offer.availability ? ` · ${offer.availability}` : ''} · {formatRelative(offer.createdAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

export function RequestCard({
  request,
}: {
  request: {
    id: string;
    description: string | null;
    level: string;
    format: string;
    availability: string | null;
    city: string | null;
    createdAt: Date;
    skill: { id: string; name: string };
    user: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null; city: string | null } | null };
  };
}) {
  const name = request.user.profile?.displayName ?? request.user.username;
  return (
    <li className="card-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} src={request.user.profile?.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{request.skill.name}</span>
            <Badge tone="neutral">wants to learn</Badge>
            <Badge tone="primary">{labelize(request.level)}</Badge>
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{request.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {name}
            {request.city ? ` · ${request.city}` : ''}
            {request.availability ? ` · ${request.availability}` : ''} · {formatRelative(request.createdAt)}
          </p>
          <ConnectForm requestId={request.id} />
        </div>
      </div>
    </li>
  );
}

export function ConnectForm({ offerId, requestId }: { offerId?: string; requestId?: string }) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
        Send connect request
      </button>
    );
  }
  return (
    <ServerForm
      action={connectAction}
      successMessage="Request sent."
      resetOnSuccess
      ariaLabel="Send a connect request"
      className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 p-3"
    >
      {({ errors, pending }) => (
        <>
          {offerId ? <input type="hidden" name="offerId" value={offerId} /> : null}
          {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
          <Field label="Say hello and say when you are free" name="message" error={errors.message} required>
            {(props) => <Textarea {...props} name="message" rows={3} required maxLength={500} placeholder="Hi! I am free on Saturday mornings - could we start with the basics?" />}
          </Field>
          <p className="text-xs text-muted-foreground">Your message goes through OpenHub. Never send your home address or payment details here.</p>
          <div className="flex gap-2">
            <SubmitButton pending={pending}>Send request</SubmitButton>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-border px-3 text-sm">
              Cancel
            </button>
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function ConnectionCard({
  connection,
  currentUserId,
}: {
  connection: {
    id: string;
    status: string;
    message: string | null;
    meetingAt: Date | null;
    meetingNote: string | null;
    createdAt: Date;
    fromUserId: string;
    toUserId: string;
    fromUser: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
    toUser: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
    offer: { id: string; skill: { name: string } } | null;
    request: { id: string; skill: { name: string } } | null;
  };
  currentUserId: string;
}) {
  const other = connection.fromUserId === currentUserId ? connection.toUser : connection.fromUser;
  const otherName = other.profile?.displayName ?? other.username;
  const skillName = connection.offer?.skill.name ?? connection.request?.skill.name ?? 'Skill session';
  const isReceiver = connection.toUserId === currentUserId;

  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Avatar name={otherName} src={other.profile?.avatarUrl} size={36} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {skillName} · {isReceiver ? 'they asked you' : 'you asked them'}
            </p>
            <Link href={`/members/${other.username}`} className="text-xs text-primary hover:underline">
              {otherName}
            </Link>
            {connection.message ? <p className="mt-1 max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">{connection.message}</p> : null}
            {connection.meetingAt ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDateTime(connection.meetingAt)}
                {connection.meetingNote ? ` · ${connection.meetingNote}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <StatusBadge status={connection.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isReceiver && connection.status === 'pending' ? (
          <>
            <button type="button" onClick={() => respondConnectionAction(connection.id, 'accepted')} className="inline-flex h-9 items-center gap-1 rounded-lg bg-success px-3 text-sm font-medium text-success-foreground">
              <Check className="h-4 w-4" aria-hidden="true" />
              Accept
            </button>
            <button type="button" onClick={() => respondConnectionAction(connection.id, 'declined')} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm">
              <X className="h-4 w-4" aria-hidden="true" />
              Decline
            </button>
          </>
        ) : null}
        {connection.status === 'accepted' || connection.status === 'pending' ? <ScheduleForm connectionId={connection.id} /> : null}
        {connection.status === 'accepted' ? (
          <button type="button" onClick={() => completeConnectionAction(connection.id)} className="h-9 rounded-lg border border-border px-3 text-sm">
            Mark finished
          </button>
        ) : null}
        {connection.status === 'completed' ? <ReviewForm connectionId={connection.id} revieweeId={other.id} /> : null}
      </div>
    </li>
  );
}

export function ScheduleForm({ connectionId }: { connectionId: string }) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-9 rounded-lg border border-border px-3 text-sm">
        Schedule a session
      </button>
    );
  }
  return (
    <ServerForm action={scheduleMeetingAction} successMessage="Session scheduled." resetOnSuccess ariaLabel="Schedule a session" className="w-full space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="connectionId" value={connectionId} />
          <input type="hidden" name="status" value="accepted" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="When" name="meetingAt" error={errors.meetingAt} required>
              {(props) => <Input {...props} name="meetingAt" type="datetime-local" required />}
            </Field>
            <Field label="Where or how" name="meetingNote" error={errors.meetingNote} hint="A public place or a call link - never a home address.">
              {(props) => <Input {...props} name="meetingNote" maxLength={400} placeholder="Community hall, or video call" />}
            </Field>
          </div>
          <div className="flex gap-2">
            <SubmitButton pending={pending}>Save time</SubmitButton>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-border px-3 text-sm">
              Cancel
            </button>
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function ReviewForm({ connectionId, revieweeId }: { connectionId?: string; revieweeId: string }) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-9 rounded-lg border border-border px-3 text-sm">
        Leave a review
      </button>
    );
  }
  return (
    <ServerForm action={reviewSkillAction} successMessage="Review published." resetOnSuccess ariaLabel="Leave a review" className="w-full space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      {({ errors, pending }) => (
        <>
          {connectionId ? <input type="hidden" name="connectionId" value={connectionId} /> : null}
          <input type="hidden" name="revieweeId" value={revieweeId} />
          <Field label="Rating" name="rating" error={errors.rating} required>
            {(props) => (
              <Select {...props} name="rating" required defaultValue="5">
                <option value="5">5 - excellent</option>
                <option value="4">4 - good</option>
                <option value="3">3 - okay</option>
                <option value="2">2 - poor</option>
                <option value="1">1 - avoid</option>
              </Select>
            )}
          </Field>
          <Field label="How did it go?" name="comment" error={errors.comment}>
            {(props) => <Textarea {...props} name="comment" rows={2} maxLength={600} />}
          </Field>
          <div className="flex gap-2">
            <SubmitButton pending={pending}>Publish review</SubmitButton>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-border px-3 text-sm">
              Cancel
            </button>
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function ReviewList({
  reviews,
}: {
  reviews: { id: string; rating: number; comment: string | null; createdAt: Date; reviewer: { username: string; profile: { displayName: string | null } | null } }[];
}) {
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  return (
    <ul className="space-y-2">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-border p-3">
          <p className="flex items-center gap-1 text-sm font-medium text-foreground">
            <Star className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
            {review.rating}/5 · {review.reviewer.profile?.displayName ?? review.reviewer.username}
          </p>
          {review.comment ? <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{formatRelative(review.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

export function MyListingRow({
  kind,
  id,
  title,
  isActive,
}: {
  kind: 'offer' | 'request';
  id: string;
  title: string;
  isActive: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <span className="flex-1 truncate text-sm text-foreground">{title}</span>
      <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Live' : 'Paused'}</Badge>
      <button
        type="button"
        onClick={() => setListingActiveAction(kind, id, !isActive)}
        className="h-8 rounded-lg border border-border px-2 text-xs"
        aria-pressed={isActive}
      >
        {isActive ? 'Pause' : 'Resume'}
      </button>
      <ConfirmActionButton
        action={() => deleteListingAction(kind, id)}
        title="Delete this listing?"
        description="Connect requests tied to it are removed too."
        confirmLabel="Delete listing"
        label={`Delete ${title}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function MatchList({
  title,
  rows,
  kind,
}: {
  title: string;
  rows: { row: { id: string; skill: { name: string }; user: { username: string; profile: { displayName: string | null; city: string | null } | null } }; distance: number | null }[];
  kind: 'offer' | 'request';
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing matched yet. Add a {kind === 'offer' ? 'request for what you want to learn' : 'listing for what you can teach'} and matches appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ row, distance }) => (
            <li key={row.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{row.skill.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.user.profile?.displayName ?? row.user.username}
                  {row.user.profile?.city ? ` · ${row.user.profile.city}` : ''}
                </p>
              </div>
              {distance !== null ? <Badge tone="primary">{distance} km</Badge> : null}
              {kind === 'offer' ? (
                <Link href={`/skills/${row.id}`} className="h-8 rounded-lg border border-border px-3 text-xs leading-8">
                  View
                </Link>
              ) : (
                <ConnectForm requestId={row.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
