import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { HelpRequestForm } from '@/features/help/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Ask or offer help' };

export default async function NewHelpRequestPage() {
  const user = await requireUserPage();
  const db = await getDb();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });

  return (
    <div className="space-y-5">
      <Link href="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to community help
      </Link>

      <SectionHeading
        title="Ask a question, request help, or offer help"
        description="Clear requests get answered faster. Never include passwords, ID numbers or home addresses."
      />

      <Alert tone="info" title="Privacy first">
        Only your display name and city are shown. People contact you through OpenHub messages, so your email and
        phone number stay private.
      </Alert>

      <Card>
        <CardHeader title="Your post" />
        <CardContent>
          <HelpRequestForm
            defaultValues={{
              title: '',
              body: '',
              category: 'local_information',
              kind: 'question',
              urgency: 'normal',
              visibility: 'public',
              tags: '',
              city: profile?.city ?? null,
              country: profile?.country ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
