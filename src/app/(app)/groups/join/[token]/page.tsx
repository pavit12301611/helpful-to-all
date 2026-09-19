import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/server/core/guards';
import { acceptInvite } from '@/features/groups/service';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const user = await currentUser();
  const { token } = await params;

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader title="You were invited to a group" />
        <CardContent>
          <p className="text-sm text-muted-foreground">Sign in or create an account to accept the invite.</p>
          <div className="mt-4 flex gap-2">
            <Link href={`/login?next=/groups/join/${token}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
              Sign in
            </Link>
            <Link href="/register" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  try {
    const { slug } = await acceptInvite(user.id, token);
    redirect(`/groups/${slug}`);
  } catch (error) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader title="Invite not accepted" />
        <CardContent className="space-y-3">
          <Alert tone="warning" title="That invite could not be used">
            {error instanceof Error ? error.message : 'The link may be invalid, revoked or expired.'}
          </Alert>
          <Link href="/groups" className="link text-sm">
            Browse public groups
          </Link>
        </CardContent>
      </Card>
    );
  }
}
