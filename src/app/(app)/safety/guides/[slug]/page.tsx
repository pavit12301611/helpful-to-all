import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getGuide } from '@/features/safety/service';
import { SafetyBanner } from '@/features/safety/components';
import { Badge, Card, CardContent, SectionHeading, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Safety guide' };

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let guide;
  try {
    guide = await getGuide(slug);
  } catch (error) {
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Guide unavailable">{error.message}</Alert>
          <Link href="/safety?tab=guides" className="link text-sm">
            Back to guides
          </Link>
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-5">
      <Link href="/safety?tab=guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All guides
      </Link>

      <SectionHeading
        title={guide.title}
        action={<Badge tone="primary">{labelize(guide.kind)}</Badge>}
      />

      <SafetyBanner />

      <Card>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{guide.body}</p>
        </CardContent>
      </Card>

      <Alert tone="info" title="Improve this guide">
        Guides are maintained by moderators. If something is missing or wrong, tell an admin - a corrected guide helps the next
        person in an emergency.
      </Alert>
    </div>
  );
}
