import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireUserPage } from '@/server/core/page-guard';
import { getHelpRequest } from '@/features/help/service';
import { HelpRequestForm } from '@/features/help/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Edit request' };

export default async function EditHelpRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;

  let request;
  try {
    request = await getHelpRequest(user.id, id, user.role);
  } catch {
    request = null;
  }

  if (!request) {
    return (
      <Alert tone="warning" title="Request unavailable">
        It may have been deleted or hidden.
      </Alert>
    );
  }

  if (request.authorId !== user.id) redirect(`/help/${id}`);

  return (
    <div className="space-y-5">
      <Link href={`/help/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to request
      </Link>

      <SectionHeading title="Edit your request" description="Tell people if something changed - timing, place or what you need." />

      <Card>
        <CardHeader title="Request details" />
        <CardContent>
          <HelpRequestForm
            requestId={request.id}
            defaultValues={{
              title: request.title,
              body: request.body,
              category: request.category,
              kind: request.kind,
              urgency: request.urgency,
              visibility: request.visibility,
              tags: request.tags,
              city: request.city,
              country: request.country,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
