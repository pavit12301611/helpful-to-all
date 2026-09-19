import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { GroupForm } from '@/features/groups/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Create group' };

export default async function NewGroupPage() {
  await requireUserPage();

  return (
    <div className="space-y-5">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to groups
      </Link>

      <SectionHeading title="Create a group" description="You become the owner. You can hand admin and moderator roles to members later." />

      <Alert tone="info" title="Who can see it?">
        Private groups cannot be found in search. Invite people with a link that expires in 14 days.
      </Alert>

      <Card>
        <CardHeader title="Group details" />
        <CardContent>
          <GroupForm defaultValues={{ name: '', description: '', kind: 'friends', visibility: 'private' }} />
        </CardContent>
      </Card>
    </div>
  );
}
