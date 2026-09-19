'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Droplet, Phone, PhoneCall, Printer, ShieldAlert, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, StatusBadge, labelize } from '@/components/ui/card';
import { useToast } from '@/components/ui/feedback';
import { BLOOD_GROUPS, EMERGENCY_SERVICES } from '@/lib/enums';
import { formatDate, formatRelative } from '@/lib/utils';
import {
  addEmergencyContactAction,
  createEmergencyNumberAction,
  createGuideAction,
  deleteDonorProfileAction,
  deleteEmergencyContactAction,
  deleteEmergencyNumberAction,
  reportMissingPersonAction,
  saveDonorProfileAction,
  setMissingStatusAction,
} from './actions';
import { SAFETY_DISCLAIMER } from './schemas';

export function SafetyBanner() {
  return (
    <div role="note" className="rounded-lg border border-danger/40 bg-danger/5 p-4">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
        {SAFETY_DISCLAIMER}
      </p>
    </div>
  );
}

export function EmergencyNumbersTable({
  numbers,
  canManage,
}: {
  numbers: { id: string; country: string; region: string | null; service: string; number: string; notes: string | null; source: string | null; verified: boolean }[];
  canManage: boolean;
}) {
  if (numbers.length === 0) {
    return <p className="text-sm text-muted-foreground">No numbers for this country yet. Add the first one and cite an official source.</p>;
  }
  return (
    <ul className="space-y-2">
      {numbers.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger" aria-hidden="true">
            <PhoneCall className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <a href={`tel:${row.number}`} className="text-base font-semibold text-foreground hover:underline">
              {row.number}
            </a>
            <p className="text-xs text-muted-foreground">
              {labelize(row.service)} · {row.country}
              {row.region ? ` · ${row.region}` : ''}
              {row.notes ? ` · ${row.notes}` : ''}
            </p>
          </div>
          {row.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
          {canManage ? (
            <ConfirmActionButton
              action={() => deleteEmergencyNumberAction(row.id)}
              title="Remove this number?"
              description="Only remove it if it is wrong or no longer official."
              confirmLabel="Remove number"
              label={`Remove ${row.number}`}
              variant="ghost"
              size="icon"
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              className="text-muted-foreground"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function EmergencyNumberForm() {
  return (
    <ServerForm action={createEmergencyNumberAction} successMessage="Number added." resetOnSuccess ariaLabel="Add an emergency number" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Country" name="country" error={errors.country} required>
              {(props) => <Input {...props} name="country" required maxLength={80} placeholder="India" />}
            </Field>
            <Field label="Region or state" name="region" error={errors.region}>
              {(props) => <Input {...props} name="region" maxLength={80} placeholder="Optional" />}
            </Field>
            <Field label="Service" name="service" error={errors.service} required>
              {(props) => (
                <Select {...props} name="service" required defaultValue="general">
                  {EMERGENCY_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {labelize(service)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Number" name="number" error={errors.number} required>
              {(props) => <Input {...props} name="number" required maxLength={30} placeholder="112" />}
            </Field>
            <Field label="Notes" name="notes" error={errors.notes}>
              {(props) => <Input {...props} name="notes" maxLength={300} placeholder="Works from any phone, even without a SIM" />}
            </Field>
            <Field label="Official source" name="source" error={errors.source} hint="Where did you confirm this?">
              {(props) => <Input {...props} name="source" maxLength={200} placeholder="Government website" />}
            </Field>
          </div>
          <SubmitButton pending={pending}>Add number</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function GuideList({ guides }: { guides: { slug: string; kind: string; title: string }[] }) {
  if (guides.length === 0) return <p className="text-sm text-muted-foreground">No guides yet.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link href={`/safety/guides/${guide.slug}`} className="card-surface flex h-full flex-col p-3 hover:border-primary/40">
            <Badge tone="primary">{labelize(guide.kind)}</Badge>
            <span className="mt-1 text-sm font-medium text-foreground">{guide.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GuideForm() {
  return (
    <ServerForm action={createGuideAction} successMessage="Guide published." resetOnSuccess ariaLabel="Publish a safety guide" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Title" name="title" error={errors.title} required>
              {(props) => <Input {...props} name="title" required maxLength={140} />}
            </Field>
            <Field label="Slug" name="slug" error={errors.slug} required hint="Used in the URL, e.g. heat-stroke.">
              {(props) => <Input {...props} name="slug" required maxLength={80} pattern="[a-z0-9-]+" />}
            </Field>
            <Field label="Type" name="kind" error={errors.kind}>
              {(props) => (
                <Select {...props} name="kind" defaultValue="safety">
                  <option value="first_aid">First aid</option>
                  <option value="disaster">Disaster</option>
                  <option value="health">Health</option>
                  <option value="safety">Safety</option>
                  <option value="other">Other</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Guide" name="body" error={errors.body} required hint="Write short steps. Add a line saying it is not medical advice.">
            {(props) => <Textarea {...props} name="body" rows={10} required maxLength={8000} />}
          </Field>
          <Field label="Language" name="locale" error={errors.locale}>
            {(props) => <Input {...props} name="locale" defaultValue="en" maxLength={8} />}
          </Field>
          <Checkbox name="published" label="Publish immediately" defaultChecked />
          <SubmitButton pending={pending}>Publish guide</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function DonorForm({
  profile,
  defaultCity,
}: {
  profile: { bloodGroup: string; city: string | null; country: string | null; lastDonatedAt: Date | null; contactPreference: string; available: boolean } | null;
  defaultCity: string;
}) {
  return (
    <ServerForm action={saveDonorProfileAction} successMessage="Donor details saved." ariaLabel="Save donor details" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Blood group" name="bloodGroup" error={errors.bloodGroup} required>
              {(props) => (
                <Select {...props} name="bloodGroup" required defaultValue={profile?.bloodGroup ?? 'O+'}>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="City" name="city" error={errors.city} required>
              {(props) => <Input {...props} name="city" required maxLength={80} defaultValue={profile?.city ?? defaultCity} />}
            </Field>
            <Field label="Country" name="country" error={errors.country}>
              {(props) => <Input {...props} name="country" maxLength={80} defaultValue={profile?.country ?? ''} />}
            </Field>
            <Field label="Last donated" name="lastDonatedAt" error={errors.lastDonatedAt} hint="Helps people see if you are eligible again.">
              {(props) => <Input {...props} name="lastDonatedAt" type="date" defaultValue={profile?.lastDonatedAt ? new Date(profile.lastDonatedAt).toISOString().slice(0, 10) : ''} />}
            </Field>
            <Field label="How should people reach you?" name="contactPreference" error={errors.contactPreference}>
              {(props) => (
                <Select {...props} name="contactPreference" defaultValue={profile?.contactPreference ?? 'message'}>
                  <option value="message">OpenHub message (recommended)</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </Select>
              )}
            </Field>
            <Field label="Available to donate?" name="available" error={errors.available}>
              {(props) => (
                <Select {...props} name="available" defaultValue={profile?.available === false ? 'off' : 'on'}>
                  <option value="on">Yes, list me</option>
                  <option value="off">No, hide my listing</option>
                </Select>
              )}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Your phone number and email are never shown in the donor list - people contact you through OpenHub first.
          </p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pending={pending}>Save donor details</SubmitButton>
            {profile ? (
              <ConfirmActionButton
                action={deleteDonorProfileAction}
                title="Remove your donor listing?"
                description="You will no longer appear in blood donor searches."
                confirmLabel="Remove listing"
                label="Remove my listing"
                variant="outline"
              />
            ) : null}
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function DonorList({
  donors,
}: {
  donors: { id: string; bloodGroup: string; city: string | null; lastDonatedAt: Date | null; contactPreference: string; user: { username: string; profile: { displayName: string | null } | null } }[];
}) {
  if (donors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No donors listed for this filter. Call your nearest blood bank - the directory has blood banks too.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {donors.map((donor) => (
        <li key={donor.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger" aria-hidden="true">
            <Droplet className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {donor.bloodGroup} · {donor.user.profile?.displayName ?? donor.user.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {donor.city ?? 'City not shared'}
              {donor.lastDonatedAt ? ` · last donated ${formatDate(donor.lastDonatedAt)}` : ''} · contact by {donor.contactPreference}
            </p>
          </div>
          <Link href={`/members/${donor.user.username}`} className="h-9 rounded-lg border border-border px-3 text-sm leading-9">
            Message
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function EmergencyContactForm() {
  return (
    <ServerForm action={addEmergencyContactAction} successMessage="Contact added." resetOnSuccess ariaLabel="Add an emergency contact" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={80} />}
            </Field>
            <Field label="Relationship" name="relation" error={errors.relation}>
              {(props) => <Input {...props} name="relation" maxLength={40} placeholder="family, friend, doctor" />}
            </Field>
            <Field label="Phone" name="phone" error={errors.phone} required>
              {(props) => <Input {...props} name="phone" required maxLength={30} placeholder="+91 00000 00000" />}
            </Field>
          </div>
          <Checkbox name="isPrimary" label="Make this my primary contact" />
          <SubmitButton pending={pending}>Add contact</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function EmergencyContactList({
  contacts,
}: {
  contacts: { id: string; name: string; relation: string | null; phone: string; isPrimary: boolean }[];
}) {
  if (contacts.length === 0) return <p className="text-sm text-muted-foreground">No emergency contacts yet.</p>;
  return (
    <ul className="space-y-2">
      {contacts.map((contact) => (
        <li key={contact.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {contact.name}
              {contact.relation ? <span className="text-muted-foreground"> · {contact.relation}</span> : null}
            </p>
            <a href={`tel:${contact.phone}`} className="text-sm text-primary hover:underline">
              {contact.phone}
            </a>
          </div>
          {contact.isPrimary ? <Badge tone="primary">Primary</Badge> : null}
          <ConfirmActionButton
            action={() => deleteEmergencyContactAction(contact.id)}
            title="Remove this contact?"
            description="It will disappear from your emergency card."
            confirmLabel="Remove contact"
            label={`Remove ${contact.name}`}
            variant="ghost"
            size="icon"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            className="text-muted-foreground"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Printable emergency card. Rendered from the user's own data and printed by the
 * browser - nothing is uploaded, and no third party sees it.
 */
export function EmergencyCard({
  displayName,
  bloodGroup,
  contacts,
}: {
  displayName: string;
  bloodGroup: string | null;
  contacts: { id: string; name: string; relation: string | null; phone: string; isPrimary: boolean }[];
}) {
  const [extra, setExtra] = React.useState({ allergies: '', medication: '', conditions: '', notes: '' });
  const toast = useToast();

  const text = [
    `EMERGENCY CARD - ${displayName}`,
    bloodGroup ? `Blood group: ${bloodGroup}` : 'Blood group: not recorded',
    extra.allergies ? `Allergies: ${extra.allergies}` : '',
    extra.medication ? `Medication: ${extra.medication}` : '',
    extra.conditions ? `Conditions: ${extra.conditions}` : '',
    '',
    'EMERGENCY CONTACTS',
    ...contacts.map((contact) => `${contact.isPrimary ? '* ' : ''}${contact.name}${contact.relation ? ` (${contact.relation})` : ''}: ${contact.phone}`),
    extra.notes ? `\n${extra.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Allergies" name="card-allergies">
          {(props) => <Input {...props} value={extra.allergies} onChange={(event) => setExtra((current) => ({ ...current, allergies: event.target.value }))} />}
        </Field>
        <Field label="Current medication" name="card-medication">
          {(props) => <Input {...props} value={extra.medication} onChange={(event) => setExtra((current) => ({ ...current, medication: event.target.value }))} />}
        </Field>
        <Field label="Conditions" name="card-conditions">
          {(props) => <Input {...props} value={extra.conditions} onChange={(event) => setExtra((current) => ({ ...current, conditions: event.target.value }))} />}
        </Field>
        <Field label="Anything else responders should know" name="card-notes">
          {(props) => <Input {...props} value={extra.notes} onChange={(event) => setExtra((current) => ({ ...current, notes: event.target.value }))} />}
        </Field>
      </div>

      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{text}</pre>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print or save as PDF
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.push({ tone: 'success', title: 'Card copied.' });
            } catch {
              toast.push({ tone: 'warning', title: 'Copy failed', description: 'Select the text and copy it manually.' });
            }
          }}
        >
          Copy text
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        This card is built in your browser from your own profile. OpenHub does not store the medical details you type here.
      </p>
    </div>
  );
}

export function MissingPersonForm() {
  return (
    <ServerForm action={reportMissingPersonAction} successMessage="Report submitted." resetOnSuccess ariaLabel="Report a missing person" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-foreground">
            <p className="inline-flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Contact the police first
            </p>
            <p className="mt-1 text-muted-foreground">
              An OpenHub post does not replace an official report. In India dial 112. Only post with the family&apos;s permission.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={100} />}
            </Field>
            <Field label="Age" name="age" error={errors.age}>
              {(props) => <Input {...props} name="age" type="number" min={0} max={130} />}
            </Field>
            <Field label="Last seen" name="lastSeenAt" error={errors.lastSeenAt}>
              {(props) => <Input {...props} name="lastSeenAt" type="datetime-local" />}
            </Field>
            <Field label="Last seen where" name="lastSeenLocation" error={errors.lastSeenLocation}>
              {(props) => <Input {...props} name="lastSeenLocation" maxLength={200} placeholder="Near the market, Pune" />}
            </Field>
            <Field label="How should people contact you?" name="contactNote" error={errors.contactNote} hint="A family phone number is more useful than an address.">
              {(props) => <Input {...props} name="contactNote" maxLength={300} />}
            </Field>
          </div>
          <Field label="Description" name="description" error={errors.description} required hint="What they were wearing, height, language spoken, anything that helps identification.">
            {(props) => <Textarea {...props} name="description" rows={4} required maxLength={1500} />}
          </Field>
          <SubmitButton pending={pending}>Submit report</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function MissingPersonList({
  reports,
  currentUserId,
  isStaff,
}: {
  reports: {
    id: string;
    name: string;
    age: number | null;
    lastSeenAt: Date | null;
    lastSeenLocation: string | null;
    description: string;
    contactNote: string | null;
    status: string;
    verified: boolean;
    createdAt: Date;
    reportedById: string;
    reportedBy: { username: string; profile: { displayName: string | null } | null };
  }[];
  currentUserId: string | null;
  isStaff: boolean;
}) {
  if (reports.length === 0) return <p className="text-sm text-muted-foreground">No open reports.</p>;
  return (
    <ul className="space-y-2">
      {reports.map((report) => (
        <li key={report.id} className="card-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {report.name}
                {report.age !== null ? <span className="text-muted-foreground">, {report.age}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.lastSeenLocation ?? 'Location not shared'}
                {report.lastSeenAt ? ` · last seen ${formatDate(report.lastSeenAt)}` : ''} · posted {formatRelative(report.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={report.status} />
              {report.verified ? <Badge tone="success">Verified</Badge> : null}
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{report.description}</p>
          {report.contactNote ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-foreground">
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {report.contactNote}
            </p>
          ) : null}
          {currentUserId === report.reportedById || isStaff ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.status !== 'found' ? (
                <button type="button" onClick={() => setMissingStatusAction(report.id, 'found')} className="h-9 rounded-lg bg-success px-3 text-sm font-medium text-success-foreground">
                  Mark as found
                </button>
              ) : null}
              {report.status !== 'closed' ? (
                <ConfirmActionButton
                  action={() => setMissingStatusAction(report.id, 'closed')}
                  title="Close this report?"
                  description="It will no longer appear in the open list."
                  confirmLabel="Close report"
                  label="Close report"
                  variant="outline"
                  size="sm"
                />
              ) : null}
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Reported by {report.reportedBy.profile?.displayName ?? report.reportedBy.username}. Verify with the family or the police
            before sharing further.
          </p>
        </li>
      ))}
    </ul>
  );
}
