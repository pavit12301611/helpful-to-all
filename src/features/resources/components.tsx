'use client';

import * as React from 'react';
import Link from 'next/link';
import { Clock, ExternalLink, MapPin, Phone, Star, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, PrivacyBadge, VerifiedBadge, labelize } from '@/components/ui/card';
import { ACCESSIBILITY_LABELS, parseOpeningHours } from './schemas';
import {
  confirmResourceAction,
  createResourceEntryAction,
  deleteResourceEntryAction,
  deleteResourceReviewAction,
  reviewResourceAction,
  suggestEditAction,
} from './actions';

const EDIT_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'address', label: 'Address' },
  { value: 'phone', label: 'Phone' },
  { value: 'openingHours', label: 'Opening hours' },
  { value: 'website', label: 'Website' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'priceLevel', label: 'Price level' },
  { value: 'category', label: 'Category' },
] as const;

export function ResourceEntryForm({
  resourceId,
  categories,
  defaultValues,
}: {
  resourceId?: string;
  categories: { key: string; label: string }[];
  defaultValues?: {
    name: string;
    category: string;
    description: string | null;
    address: string | null;
    city: string;
    country: string | null;
    phone: string | null;
    website: string | null;
    latitude: number | null;
    longitude: number | null;
    openingHours: string | null;
    accessibility: string | null;
    priceLevel: number;
  };
}) {
  return (
    <ServerForm
      action={resourceId ? (formData) => import('./actions').then((module) => module.updateResourceEntryAction(resourceId, formData)) : createResourceEntryAction}
      successMessage={resourceId ? 'Entry updated.' : 'Added to the directory.'}
      resetOnSuccess={!resourceId}
      ariaLabel={resourceId ? 'Update directory entry' : 'Add a place to the directory'}
      className="space-y-4"
    >
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Place name" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={120} defaultValue={defaultValues?.name} placeholder="Demo Public Library" />}
            </Field>
            <Field label="Category" name="category" error={errors.category} required>
              {(props) => (
                <Select {...props} name="category" required defaultValue={defaultValues?.category ?? categories[0]?.key ?? ''}>
                  {categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="What is it useful for?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} maxLength={600} defaultValue={defaultValues?.description ?? ''} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Address" name="address" error={errors.address} hint="Street level is enough - never add a private home address.">
              {(props) => <Input {...props} name="address" maxLength={200} defaultValue={defaultValues?.address ?? ''} />}
            </Field>
            <Field label="City" name="city" error={errors.city} required>
              {(props) => <Input {...props} name="city" required maxLength={80} defaultValue={defaultValues?.city} />}
            </Field>
            <Field label="Country" name="country" error={errors.country}>
              {(props) => <Input {...props} name="country" maxLength={80} defaultValue={defaultValues?.country ?? ''} />}
            </Field>
            <Field label="Phone" name="phone" error={errors.phone} hint="Only a public number for this place.">
              {(props) => <Input {...props} name="phone" maxLength={40} defaultValue={defaultValues?.phone ?? ''} />}
            </Field>
          </div>
          <Field label="Website" name="website" error={errors.website}>
            {(props) => <Input {...props} name="website" type="url" maxLength={300} defaultValue={defaultValues?.website ?? ''} placeholder="https://" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitude" name="latitude" error={errors.latitude} hint="Optional. Leave empty if you are not sure.">
              {(props) => <Input {...props} name="latitude" type="number" step="0.0001" min={-90} max={90} defaultValue={defaultValues?.latitude ?? ''} />}
            </Field>
            <Field label="Longitude" name="longitude" error={errors.longitude}>
              {(props) => <Input {...props} name="longitude" type="number" step="0.0001" min={-180} max={180} defaultValue={defaultValues?.longitude ?? ''} />}
            </Field>
          </div>
          <Field label="Opening hours" name="openingHours" error={errors.openingHours} hint="Plain text is fine, e.g. Mon-Sat 10:00-19:00.">
            {(props) => <Textarea {...props} name="openingHours" rows={2} maxLength={400} defaultValue={defaultValues?.openingHours ?? ''} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Accessibility" name="accessibility" error={errors.accessibility}>
              {(props) => (
                <Select {...props} name="accessibility" defaultValue={defaultValues?.accessibility ?? 'unknown'}>
                  {Object.entries(ACCESSIBILITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Price level" name="priceLevel" error={errors.priceLevel} hint="0 = free, 4 = expensive.">
              {(props) => (
                <Select {...props} name="priceLevel" defaultValue={String(defaultValues?.priceLevel ?? 0)}>
                  <option value="0">Free</option>
                  <option value="1">Cheap</option>
                  <option value="2">Moderate</option>
                  <option value="3">Expensive</option>
                  <option value="4">Very expensive</option>
                </Select>
              )}
            </Field>
          </div>
          <SubmitButton pending={pending}>{resourceId ? 'Save changes' : 'Add to directory'}</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function DirectoryCard({
  resource,
  rating,
}: {
  resource: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    address: string | null;
    city: string | null;
    accessibility: string | null;
    priceLevel: number;
    verified: boolean;
    lastConfirmedAt: Date | null;
    _count: { reviews: number };
  };
  rating: number | null;
}) {
  return (
    <li className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/resources/${resource.id}`} className="text-sm font-semibold hover:underline">
            {resource.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{resource.description || 'No description yet.'}</p>
        </div>
        {resource.verified ? <VerifiedBadge /> : <Badge tone="warning">Unverified</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge tone="primary">{labelize(resource.category)}</Badge>
        {resource.address ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {resource.address}
            {resource.city ? `, ${resource.city}` : ''}
          </span>
        ) : resource.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {resource.city}
          </span>
        ) : null}
        <span>{(resource.accessibility && ACCESSIBILITY_LABELS[resource.accessibility]) || 'Accessibility unknown'}</span>
        {resource.priceLevel > 0 ? <span>{'₹'.repeat(resource.priceLevel)}</span> : <span>Free</span>}
        {rating !== null ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {rating} ({resource._count.reviews})
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function HoursPanel({ raw }: { raw: string | null }) {
  const hours = parseOpeningHours(raw);
  if (hours.length === 0) return <p className="text-sm text-muted-foreground">Opening hours not shared.</p>;
  return (
    <ul className="space-y-1">
      {hours.map((entry) => (
        <li key={entry.day} className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="w-24 capitalize text-muted-foreground">{entry.day}</span>
          <span className="text-foreground">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function MapPanel({
  embed,
  link,
  search,
  name,
}: {
  embed: string | null;
  link: string | null;
  search: string;
  name: string;
}) {
  return (
    <div className="space-y-2">
      {embed ? (
        <iframe
          title={`Map showing ${name}`}
          src={embed}
          className="h-64 w-full rounded-lg border border-border"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          No coordinates for this entry, so no map is shown. Add latitude and longitude to enable it.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Directions
          </a>
        ) : null}
        <a href={search} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Search on map
        </a>
      </div>
      <p className="text-xs text-muted-foreground">Maps are provided by OpenStreetMap and need no API key. Set MAP_PROVIDER=none to disable them.</p>
    </div>
  );
}

export function ReviewForm({ resourceId }: { resourceId: string }) {
  return (
    <ServerForm action={reviewResourceAction} successMessage="Review saved." resetOnSuccess ariaLabel="Review this place" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="resourceId" value={resourceId} />
          <Field label="Rating" name="rating" error={errors.rating} required>
            {(props) => (
              <Select {...props} name="rating" required defaultValue="4">
                <option value="5">5 - excellent</option>
                <option value="4">4 - good</option>
                <option value="3">3 - okay</option>
                <option value="2">2 - poor</option>
                <option value="1">1 - avoid</option>
              </Select>
            )}
          </Field>
          <Field label="What should people know?" name="comment" error={errors.comment}>
            {(props) => <Textarea {...props} name="comment" rows={3} maxLength={1000} placeholder="Waiting time, accessibility, whether the phone number worked..." />}
          </Field>
          <SubmitButton pending={pending}>Save review</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ReviewList({
  reviews,
  currentUserId,
  isStaff,
}: {
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    authorId: string;
    author: { username: string; profile: { displayName: string | null } | null };
  }[];
  currentUserId: string | null;
  isStaff: boolean;
}) {
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet. Yours helps the next person.</p>;
  return (
    <ul className="space-y-2">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              <span aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>{' '}
              <span className="text-muted-foreground">{review.author.profile?.displayName ?? review.author.username}</span>
            </p>
            {currentUserId === review.authorId || isStaff ? (
              <ConfirmActionButton
                action={() => deleteResourceReviewAction(review.id)}
                title="Remove this review?"
                description="It will no longer be shown."
                confirmLabel="Remove review"
                label="Remove review"
                variant="ghost"
                size="icon"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                className="text-muted-foreground"
              />
            ) : null}
          </div>
          {review.comment ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{review.comment}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
        </li>
      ))}
    </ul>
  );
}

export function SuggestEditForm({ resourceId }: { resourceId: string }) {
  return (
    <ServerForm action={suggestEditAction} successMessage="Suggestion sent." resetOnSuccess ariaLabel="Suggest an edit" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="resourceId" value={resourceId} />
          <Field label="What needs correcting?" name="field" error={errors.field} required>
            {(props) => (
              <Select {...props} name="field" required defaultValue="openingHours">
                {EDIT_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Correct value" name="proposedValue" error={errors.proposedValue} required>
            {(props) => <Input {...props} name="proposedValue" required maxLength={300} />}
          </Field>
          <Field label="Why? (optional)" name="note" error={errors.note}>
            {(props) => <Textarea {...props} name="note" rows={2} maxLength={300} />}
          </Field>
          <SubmitButton pending={pending}>Send suggestion</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ConfirmStillOpenButton({ resourceId }: { resourceId: string }) {
  return (
    <button
      type="button"
      onClick={() => confirmResourceAction(resourceId)}
      className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted"
    >
      I confirm this is still correct
    </button>
  );
}

export function OwnerControls({ resourceId, visibility }: { resourceId: string; visibility: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrivacyBadge visibility={visibility} />
      <ConfirmActionButton
        action={() => deleteResourceEntryAction(resourceId)}
        title="Remove this entry from the directory?"
        description="Reviews and suggestions for it are removed too."
        confirmLabel="Remove entry"
        label="Remove entry"
        variant="danger"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      />
    </div>
  );
}

export function ResourceContact({ phone, website }: { phone: string | null; website: string | null }) {
  if (!phone && !website) return <p className="text-sm text-muted-foreground">No public contact details shared.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <a href={`tel:${phone}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted">
          <Phone className="h-4 w-4" aria-hidden="true" />
          {phone}
        </a>
      ) : null}
      {website ? (
        <a href={website} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Website
        </a>
      ) : null}
    </div>
  );
}

export function ResourceOwnerPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-muted/40 p-3">{children}</div>;
}
