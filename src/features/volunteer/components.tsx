'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, Check, HandHeart, MapPin, Trash2, Users, X } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, Progress, StatusBadge, labelize } from '@/components/ui/card';
import { CAMPAIGN_KINDS, VOLUNTEER_CAUSES } from '@/lib/enums';
import { formatDate, formatDateTime, formatMoney, formatRelative } from '@/lib/utils';
import {
  addCampaignUpdateAction,
  cancelSignupAction,
  createCampaignAction,
  createOpportunityAction,
  deleteCampaignAction,
  deleteOpportunityAction,
  recordProgressAction,
  setSignupStatusAction,
  signUpAction,
} from './actions';

export function OpportunityForm() {
  return (
    <ServerForm action={createOpportunityAction} successMessage="Opportunity published." resetOnSuccess ariaLabel="Post a volunteering opportunity" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Weekend clean-up at the river bank" />}
          </Field>
          <Field label="What will volunteers do?" name="description" error={errors.description} required>
            {(props) => <Textarea {...props} name="description" rows={4} required maxLength={2000} placeholder="Meet at 9am, collect plastic waste for three hours. Gloves and bags provided." />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Cause" name="cause" error={errors.cause} required>
              {(props) => (
                <Select {...props} name="cause" required defaultValue="community">
                  {VOLUNTEER_CAUSES.map((cause) => (
                    <option key={cause} value={cause}>
                      {labelize(cause)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Organisation" name="organizationName" error={errors.organizationName}>
              {(props) => <Input {...props} name="organizationName" maxLength={120} placeholder="Optional" />}
            </Field>
            <Field label="Volunteers needed" name="volunteersNeeded" error={errors.volunteersNeeded}>
              {(props) => <Input {...props} name="volunteersNeeded" type="number" min={1} max={1000} defaultValue="5" />}
            </Field>
            <Field label="City" name="city" error={errors.city}>
              {(props) => <Input {...props} name="city" maxLength={80} />}
            </Field>
            <Field label="Country" name="country" error={errors.country}>
              {(props) => <Input {...props} name="country" maxLength={80} />}
            </Field>
            <Field label="Starts" name="startsAt" error={errors.startsAt}>
              {(props) => <Input {...props} name="startsAt" type="datetime-local" />}
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Skills needed" name="skillsNeeded" error={errors.skillsNeeded}>
              {(props) => <Input {...props} name="skillsNeeded" maxLength={300} placeholder="none - just bring gloves" />}
            </Field>
            <Field label="Items needed" name="itemsNeeded" error={errors.itemsNeeded}>
              {(props) => <Input {...props} name="itemsNeeded" maxLength={300} placeholder="gloves, water bottle" />}
            </Field>
          </div>
          <Field label="Apply by" name="deadline" error={errors.deadline}>
            {(props) => <Input {...props} name="deadline" type="date" />}
          </Field>
          <SubmitButton pending={pending}>Publish opportunity</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function OpportunityCard({
  opportunity,
}: {
  opportunity: {
    id: string;
    title: string;
    description: string;
    cause: string;
    city: string | null;
    startsAt: Date | null;
    volunteersNeeded: number;
    verified: boolean;
    status: string;
    _count: { signups: number };
    organizer: { username: string; profile: { displayName: string | null } | null };
  };
}) {
  const spotsLeft = Math.max(0, opportunity.volunteersNeeded - opportunity._count.signups);
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/volunteer/${opportunity.id}`} className="text-sm font-semibold hover:underline">
            {opportunity.title}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p>
        </div>
        {opportunity.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="primary">{labelize(opportunity.cause)}</Badge>
        {opportunity.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {opportunity.city}
          </span>
        ) : null}
        {opportunity.startsAt ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(opportunity.startsAt)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {opportunity._count.signups}/{opportunity.volunteersNeeded} signed up
          {spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : ' · full'}
        </span>
        <span>by {opportunity.organizer.profile?.displayName ?? opportunity.organizer.username}</span>
      </div>
    </li>
  );
}

export function SignupForm({ opportunityId }: { opportunityId: string }) {
  return (
    <ServerForm action={signUpAction} successMessage="You signed up." resetOnSuccess ariaLabel="Sign up to volunteer" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <Field label="Message to the organiser" name="message" error={errors.message} hint="Share anything useful - availability, skills, accessibility needs.">
            {(props) => <Textarea {...props} name="message" rows={3} maxLength={400} />}
          </Field>
          <p className="text-xs text-muted-foreground">Your email and phone number are never shown. The organiser replies through OpenHub.</p>
          <SubmitButton pending={pending}>Sign up</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function SignupList({
  signups,
  isOrganizer,
  currentUserId,
}: {
  signups: {
    id: string;
    userId: string;
    message: string | null;
    status: string;
    createdAt: Date;
    user: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  }[];
  isOrganizer: boolean;
  currentUserId: string | null;
}) {
  if (signups.length === 0) return <p className="text-sm text-muted-foreground">No volunteers yet. Be the first.</p>;
  return (
    <ul className="space-y-2">
      {signups.map((signup) => (
        <li key={signup.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <Link href={`/members/${signup.user.username}`} className="text-sm font-medium hover:underline">
              {signup.user.profile?.displayName ?? signup.user.username}
            </Link>
            {signup.message ? <p className="text-xs text-muted-foreground">{signup.message}</p> : null}
            <p className="text-xs text-muted-foreground">{formatRelative(signup.createdAt)}</p>
          </div>
          <StatusBadge status={signup.status} />
          {isOrganizer && signup.status === 'pending' ? (
            <div className="flex gap-1">
              <button type="button" onClick={() => setSignupStatusAction(signup.id, 'confirmed')} aria-label="Confirm volunteer" className="rounded-lg border border-success/40 p-1.5 text-success hover:bg-success/10">
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setSignupStatusAction(signup.id, 'declined')} aria-label="Decline volunteer" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {currentUserId === signup.userId && signup.status !== 'cancelled' ? (
            <ConfirmActionButton
              action={() => cancelSignupAction(signup.id)}
              title="Cancel your signup?"
              description="The organiser will see the spot free up."
              confirmLabel="Cancel signup"
              label="Cancel signup"
              variant="outline"
              size="sm"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function MySignupRow({ signup }: { signup: { id: string; status: string; createdAt: Date; opportunity: { id: string; title: string; startsAt: Date | null; city: string | null } } }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <Link href={`/volunteer/${signup.opportunity.id}`} className="block truncate text-sm font-medium hover:underline">
          {signup.opportunity.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {signup.opportunity.city ?? 'Location not shared'}
          {signup.opportunity.startsAt ? ` · ${formatDate(signup.opportunity.startsAt)}` : ''} · signed up {formatRelative(signup.createdAt)}
        </p>
      </div>
      <StatusBadge status={signup.status} />
      {signup.status === 'pending' || signup.status === 'confirmed' ? (
        <ConfirmActionButton
          action={() => cancelSignupAction(signup.id)}
          title="Cancel your signup?"
          description="You can sign up again later if plans change."
          confirmLabel="Cancel signup"
          label="Cancel"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        />
      ) : null}
    </li>
  );
}

export function CampaignForm() {
  return (
    <ServerForm action={createCampaignAction} successMessage="Campaign published." resetOnSuccess ariaLabel="Start a donation campaign" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="Winter blankets for the night shelter" />}
          </Field>
          <Field label="What is the money or goods for?" name="description" error={errors.description} required hint="Say exactly how donations will be used and who receives them.">
            {(props) => <Textarea {...props} name="description" rows={4} required maxLength={2000} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Cause" name="cause" error={errors.cause} required>
              {(props) => (
                <Select {...props} name="cause" required defaultValue="community">
                  {VOLUNTEER_CAUSES.map((cause) => (
                    <option key={cause} value={cause}>
                      {labelize(cause)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="What are you collecting?" name="kind" error={errors.kind}>
              {(props) => (
                <Select {...props} name="kind" defaultValue="goods">
                  {CAMPAIGN_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {labelize(kind)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Goal amount" name="goalCents" error={errors.goalCents} hint="In paise/cents: 100000 = 1000.00.">
              {(props) => <Input {...props} name="goalCents" type="number" min={0} step={100} placeholder="100000" />}
            </Field>
            <Field label="Items needed" name="itemsNeeded" error={errors.itemsNeeded}>
              {(props) => <Input {...props} name="itemsNeeded" maxLength={400} placeholder="100 wool blankets" />}
            </Field>
            <Field label="City" name="city" error={errors.city}>
              {(props) => <Input {...props} name="city" maxLength={80} />}
            </Field>
            <Field label="Contact email" name="contactEmail" error={errors.contactEmail} hint="Shown publicly so donors can verify you.">
              {(props) => <Input {...props} name="contactEmail" type="email" maxLength={160} />}
            </Field>
          </div>
          <Field label="Campaign ends" name="deadline" error={errors.deadline}>
            {(props) => <Input {...props} name="deadline" type="date" />}
          </Field>
          <p className="text-xs text-muted-foreground">
            OpenHub does not process payments. Donors contact you directly, so make verification easy: add your registration
            number, website or a photo of the organisation.
          </p>
          <SubmitButton pending={pending}>Publish campaign</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function CampaignCard({
  campaign,
}: {
  campaign: {
    id: string;
    title: string;
    description: string;
    cause: string;
    kind: string;
    goalCents: number | null;
    raisedCents: number;
    city: string | null;
    verified: boolean;
    status: string;
    deadline: Date | null;
    organizer: { username: string; profile: { displayName: string | null } | null };
  };
}) {
  const pct = campaign.goalCents ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100)) : 0;
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/volunteer/campaigns/${campaign.id}`} className="text-sm font-semibold hover:underline">
            {campaign.title}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>
        </div>
        {campaign.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge tone="primary">{labelize(campaign.cause)}</Badge>
        <Badge tone="neutral">{labelize(campaign.kind)}</Badge>
        {campaign.city ? <span>{campaign.city}</span> : null}
        {campaign.deadline ? <span>ends {formatDate(campaign.deadline)}</span> : null}
      </div>
      {campaign.goalCents ? (
        <div className="mt-3">
          <Progress value={pct} label={`${formatMoney(campaign.raisedCents)} of ${formatMoney(campaign.goalCents)}`} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {campaign.kind === 'money' ? `Raised so far: ${formatMoney(campaign.raisedCents)}` : campaign.description.slice(0, 0) || `Collecting: ${labelize(campaign.kind)}`}
        </p>
      )}
    </li>
  );
}

export function CampaignProgressPanel({
  campaignId,
  raisedCents,
  goalCents,
  isOrganizer,
}: {
  campaignId: string;
  raisedCents: number;
  goalCents: number | null;
  isOrganizer: boolean;
}) {
  const [value, setValue] = React.useState(String(raisedCents));
  const pct = goalCents ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0;

  return (
    <div className="space-y-3">
      {goalCents ? <Progress value={pct} label={`${formatMoney(raisedCents)} of ${formatMoney(goalCents)}`} /> : <p className="text-sm text-muted-foreground">Raised so far: {formatMoney(raisedCents)}</p>}
      {isOrganizer ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="raisedCents" className="label">
              Update total raised (in cents)
            </label>
            <Input id="raisedCents" type="number" min={0} step={100} value={value} onChange={(event) => setValue(event.target.value)} />
          </div>
          <button type="button" onClick={() => recordProgressAction(campaignId, Number(value) || 0)} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Save total
          </button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        OpenHub records progress but never handles money. There is no checkout, no card storage and no fee.
      </p>
    </div>
  );
}

export function CampaignUpdateForm({ campaignId }: { campaignId: string }) {
  return (
    <ServerForm action={addCampaignUpdateAction} successMessage="Update posted." resetOnSuccess ariaLabel="Post a campaign update" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="campaignId" value={campaignId} />
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={140} placeholder="40 blankets collected" />}
          </Field>
          <Field label="What happened?" name="body" error={errors.body} required>
            {(props) => <Textarea {...props} name="body" rows={3} required maxLength={2000} placeholder="Where the donations went, who received them, what is still needed." />}
          </Field>
          <SubmitButton pending={pending}>Post update</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function CampaignUpdateList({
  updates,
}: {
  updates: { id: string; title: string; body: string; createdAt: Date; author: { username: string; profile: { displayName: string | null } | null } }[];
}) {
  if (updates.length === 0) return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ul className="space-y-2">
      {updates.map((update) => (
        <li key={update.id} className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">{update.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{update.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {update.author.profile?.displayName ?? update.author.username} · {formatDateTime(update.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function DeleteOpportunityButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmActionButton
      action={() => deleteOpportunityAction(id)}
      title="Remove this opportunity?"
      description={`“${title}” and its volunteer signups will be deleted.`}
      confirmLabel="Remove opportunity"
      label="Remove opportunity"
      variant="danger"
      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
    />
  );
}

export function DeleteCampaignButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmActionButton
      action={() => deleteCampaignAction(id)}
      title="Remove this campaign?"
      description={`“${title}” and its updates will be deleted.`}
      confirmLabel="Remove campaign"
      label="Remove campaign"
      variant="danger"
      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
    />
  );
}

export function VolunteerWarning() {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
      <p className="inline-flex items-center gap-1 font-medium text-foreground">
        <HandHeart className="h-4 w-4" aria-hidden="true" />
        Verify before you send money or goods
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
        <li>Check the organisation&apos;s registration number and official website.</li>
        <li>Prefer giving goods directly, or paying a registered account in the organisation&apos;s name.</li>
        <li>Never send cash to a personal number for an unverified campaign.</li>
        <li>OpenHub does not process payments and cannot refund anything.</li>
      </ul>
    </div>
  );
}
