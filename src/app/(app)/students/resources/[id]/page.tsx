import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getResource, registerDownload } from '@/features/students/service';
import { CommentThread, ReportButton, SaveButton, VoteControl } from '@/features/social/components';
import { listComments, savedTargetTypes, scoreFor } from '@/features/social/service';
import { Badge, Card, CardContent, CardHeader, DefinitionList, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatDateTime } from '@/lib/utils';
import { isAppError, NotFoundError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Study resource' };

export default async function StudentResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let resource;
  try {
    resource = await getResource(user?.id ?? null, id, user?.role ?? 'user');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Resource unavailable">It may have been removed by its author or by a moderator.</Alert>
          <Link href="/students" className="link text-sm">
            Back to the student centre
          </Link>
        </div>
      );
    }
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="You cannot see this resource">
            {error.message}
          </Alert>
          <Link href="/students" className="link text-sm">
            Back to the student centre
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [comments, score, saved] = await Promise.all([
    listComments(user?.id ?? null, 'student_resource', id),
    scoreFor('student_resource', id),
    user ? savedTargetTypes(user.id, 'student_resource') : Promise.resolve(new Set<string>()),
  ]);

  const uploaderName = resource.uploader.profile?.displayName ?? resource.uploader.username;

  return (
    <div className="space-y-5">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to resources
      </Link>

      <Card>
        <CardHeader title={resource.title} action={resource.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>} />
        <CardContent className="space-y-4">
          <Alert tone="info" title="Copyright and accuracy">
            Resources are shared by community members. Check the licence before reusing material, and verify facts against your
            course notes.
          </Alert>

          {resource.description ? <p className="whitespace-pre-wrap text-sm text-foreground">{resource.description}</p> : null}

          <div className="flex flex-wrap gap-1.5">
            {resource.subject ? <Badge tone="primary">{resource.subject.name}</Badge> : null}
            <Badge tone="neutral">{labelize(resource.level)}</Badge>
            <Badge tone="neutral">{labelize(resource.difficulty)}</Badge>
            <Badge tone="neutral">{labelize(resource.fileType)}</Badge>
            <Badge tone="neutral">{resource.language}</Badge>
            {resource.tags
              ? resource.tags
                  .split(',')
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag.trim()}
                    </Badge>
                  ))
              : null}
          </div>

          <DefinitionList
            items={[
              { label: 'Shared by', value: uploaderName },
              { label: 'Institution', value: resource.institution ?? 'Not specified' },
              { label: 'Shared on', value: formatDateTime(resource.createdAt) },
              { label: 'Times opened', value: String(resource.downloads) },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => registerDownload(id)}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Open resource
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">No external link - this entry is information only.</span>
            )}
            <VoteControl targetType="student_resource" targetId={resource.id} score={score} vertical={false} />
            {user ? <SaveButton targetType="student_resource" targetId={resource.id} saved={saved.has(resource.id)} /> : null}
            {user && resource.uploaderId !== user.id ? <ReportButton targetType="student_resource" targetId={resource.id} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Discussion" description="Ask questions about this resource. Keep it kind and on topic." />
        <CardContent>
          {user ? (
            <CommentThread targetType="student_resource" targetId={resource.id} comments={comments} currentUserId={user.id} />
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
  );
}
