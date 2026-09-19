import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getDb } from '@/server/db/client';
import { getDirectoryResource } from '@/features/resources/service';
import {
  ConfirmStillOpenButton,
  HoursPanel,
  MapPanel,
  OwnerControls,
  ResourceContact,
  ResourceEntryForm,
  ReviewForm,
  ReviewList,
  SuggestEditForm,
} from '@/features/resources/components';
import { ReportButton, SaveButton, VoteControl, CommentThread } from '@/features/social/components';
import { listComments, savedTargetTypes, scoreFor } from '@/features/social/service';
import { Badge, Card, CardContent, CardHeader, DefinitionList, SectionHeading, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { ACCESSIBILITY_LABELS } from '@/features/resources/schemas';
import { formatRelative } from '@/lib/utils';
import { isAppError, NotFoundError } from '@/lib/errors';
import { LOCAL_RESOURCE_CATEGORIES } from '@/lib/enums';

export const metadata: Metadata = { title: 'Local resource' };

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let resource;
  try {
    resource = await getDirectoryResource(user?.id ?? null, id, user?.role ?? 'user');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Entry unavailable">It may have been removed by its submitter or hidden by a moderator.</Alert>
          <Link href="/resources" className="link text-sm">
            Back to the directory
          </Link>
        </div>
      );
    }
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="You cannot see this entry">
            {error.message}
          </Alert>
          <Link href="/resources" className="link text-sm">
            Back to the directory
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [comments, score, saved] = await Promise.all([
    listComments(user?.id ?? null, 'resource', id),
    scoreFor('resource', id),
    user ? savedTargetTypes(user.id, 'resource') : Promise.resolve(new Set<string>()),
  ]);

  const isOwner = user?.id === resource.submittedById;
  const isStaff = user?.role === 'admin' || user?.role === 'moderator';
  const db = await getDb();
  void db;

  const categories = LOCAL_RESOURCE_CATEGORIES.map((key) => ({ key, label: labelize(key) }));

  return (
    <div className="space-y-5">
      <Link href="/resources" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to the directory
      </Link>

      <SectionHeading
        title={resource.name}
        description={resource.description || labelize(resource.category)}
        action={
          <div className="flex items-center gap-1">
            {resource.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
            {resource.rating !== null ? <Badge tone="primary">{resource.rating} / 5</Badge> : null}
          </div>
        }
      />

      <Alert tone="warning" title="Check before you travel">
        Details come from community members. For urgent needs - blood, beds, emergency care - call the official number first.
        OpenHub is not a replacement for official emergency services.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <CardContent className="space-y-4">
            <DefinitionList
              items={[
                { label: 'Category', value: labelize(resource.category) },
                { label: 'Address', value: [resource.address, resource.city, resource.country].filter(Boolean).join(', ') || 'Not shared' },
                { label: 'Accessibility', value: (resource.accessibility && ACCESSIBILITY_LABELS[resource.accessibility]) || 'Unknown' },
                { label: 'Price level', value: resource.priceLevel > 0 ? '₹'.repeat(resource.priceLevel) : 'Free' },
                { label: 'Added by', value: resource.submittedBy.profile?.displayName ?? resource.submittedBy.username },
                {
                  label: 'Last confirmed',
                  value: resource.lastConfirmedAt ? formatRelative(resource.lastConfirmedAt) : 'Not confirmed yet',
                },
              ]}
            />
            <ResourceContact phone={resource.phone} website={resource.website} />
            <ConfirmStillOpenButton resourceId={resource.id} />
            <div className="flex flex-wrap items-center gap-2">
              <VoteControl targetType="resource" targetId={resource.id} score={score} vertical={false} />
              {user ? <SaveButton targetType="resource" targetId={resource.id} saved={saved.has(resource.id)} /> : null}
              {user && !isOwner ? <ReportButton targetType="resource" targetId={resource.id} /> : null}
            </div>
            {isOwner ? <OwnerControls resourceId={resource.id} visibility="public" /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Opening hours" />
          <CardContent>
            <HoursPanel raw={resource.openingHours} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Location" description="Maps come from OpenStreetMap and need no API key." />
            <CardContent>
              <MapPanel embed={resource.mapEmbed} link={resource.mapLink} search={resource.mapSearch} name={resource.name} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader title={`Reviews (${resource.reviews.length})`} description="Share what actually happened - waiting time, staff, accessibility." />
          <CardContent className="space-y-4">
            {user && !isOwner ? <ReviewForm resourceId={resource.id} /> : null}
            <ReviewList reviews={resource.reviews} currentUserId={user?.id ?? null} isStaff={isStaff} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Suggest an edit" description="Wrong hours or a closed place? Tell moderators and they will check." />
          <CardContent className="space-y-4">
            {resource.suggestions.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-info/30 bg-info/5 p-3 text-sm">
                {resource.suggestions.map((suggestion) => (
                  <li key={suggestion.id} className="text-muted-foreground">
                    Pending: {labelize(suggestion.field)} → {suggestion.proposedValue}
                  </li>
                ))}
              </ul>
            ) : null}
            {user ? <SuggestEditForm resourceId={resource.id} /> : <p className="text-sm text-muted-foreground">Sign in to suggest an edit.</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Discussion" />
            <CardContent>
              {user ? (
                <CommentThread targetType="resource" targetId={resource.id} comments={comments} currentUserId={user.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link href="/login" className="link">
                    Sign in
                  </Link>{' '}
                  to join the discussion.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {isOwner ? (
          <div className="lg:col-span-2">
            <details className="card-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Edit this entry</summary>
              <div className="mt-4">
                <ResourceEntryForm
                  resourceId={resource.id}
                  categories={categories}
                  defaultValues={{
                    name: resource.name,
                    category: resource.category,
                    description: resource.description,
                    address: resource.address,
                    city: resource.city ?? '',
                    country: resource.country,
                    phone: resource.phone,
                    website: resource.website,
                    latitude: resource.latitude,
                    longitude: resource.longitude,
                    openingHours: resource.openingHours,
                    accessibility: resource.accessibility,
                    priceLevel: resource.priceLevel,
                  }}
                />
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
