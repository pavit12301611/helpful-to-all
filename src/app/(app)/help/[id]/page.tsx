import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getHelpRequest } from '@/features/help/service';
import { AuthorControls, DisclaimerNotice, HelpRequestForm, ResponseCard, ResponseForm } from '@/features/help/components';
import { CommentThread, ReportButton, SaveButton, VoteControl, BlockButton } from '@/features/social/components';
import { listComments, scoreFor, savedTargetTypes } from '@/features/social/service';
import { Avatar, Badge, Card, CardContent, CardHeader, DefinitionList, PrivacyBadge, StatusBadge, labelize } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { formatDateTime, formatRelative } from '@/lib/utils';
import { isAppError, NotFoundError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Community help' };

export default async function HelpRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;

  let request: Awaited<ReturnType<typeof getHelpRequest>> | null = null;
  try {
    request = await getHelpRequest(user?.id ?? null, id, user?.role ?? 'user');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Request unavailable">
            It may have been deleted, hidden by a moderator, or set to private by its author.
          </Alert>
          <Link href="/help" className="link text-sm">
            Back to community help
          </Link>
        </div>
      );
    }
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="You cannot see this request">
            {error.message}
          </Alert>
          <Link href="/help" className="link text-sm">
            Back to community help
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [comments, requestScore, savedSet, responseScores] = await Promise.all([
    listComments(user?.id ?? null, 'help_request', id),
    scoreFor('help_request', id),
    user ? savedTargetTypes(user.id, 'help_request') : Promise.resolve(new Set<string>()),
    Promise.all(request.responses.map(async (response) => [response.id, await scoreFor('help_response', response.id)] as const)),
  ]);

  const scoreMap = new Map(responseScores);
  const authorName = request.author.profile?.displayName ?? request.author.username;
  const isOwner = user?.id === request.authorId;

  return (
    <div className="space-y-5">
      <Link href="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to community help
      </Link>

      <Card>
        <CardHeader
          title={request.title}
          icon={<Avatar name={authorName} src={request.author.profile?.avatarUrl} size={36} />}
          action={<StatusBadge status={request.status} />}
        />
        <CardContent className="space-y-4">
          <DisclaimerNotice category={request.category} />

          <p className="whitespace-pre-wrap text-sm text-foreground">{request.body}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{labelize(request.category)}</Badge>
            <Badge tone={request.urgency === 'urgent' ? 'danger' : 'neutral'}>{labelize(request.urgency)} urgency</Badge>
            <PrivacyBadge visibility={request.visibility} />
            {request.tags
              ? request.tags
                  .split(',')
                  .filter(Boolean)
                  .map((tag) => (
                    <Badge key={tag} tone="primary">
                      {tag}
                    </Badge>
                  ))
              : null}
          </div>

          <DefinitionList
            items={[
              { label: 'Posted by', value: authorName },
              { label: 'Location', value: [request.city, request.country].filter(Boolean).join(', ') || 'Not shared' },
              { label: 'Posted', value: formatDateTime(request.createdAt) },
              { label: 'Answers', value: String(request._count.responses) },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <VoteControl targetType="help_request" targetId={request.id} score={requestScore} userValue={0} vertical={false} />
            {user ? <SaveButton targetType="help_request" targetId={request.id} saved={savedSet.has(request.id)} /> : null}
            {user && !isOwner ? <ReportButton targetType="help_request" targetId={request.id} /> : null}
            {user && !isOwner ? <BlockButton blockedId={request.authorId} name={authorName} /> : null}
          </div>

          {user ? <AuthorControls requestId={request.id} status={request.status} canDelete={isOwner} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`Answers (${request.responses.length})`} description="Accept the answer that helped you so others know it is solved." />
        <CardContent className="space-y-4">
          {request.responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers yet. Be the first to help.</p>
          ) : (
            <ul className="space-y-3">
              {request.responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  requestId={request.id}
                  response={response}
                  isAuthor={user?.id === response.authorId}
                  isOwner={isOwner}
                  score={scoreMap.get(response.id) ?? 0}
                />
              ))}
            </ul>
          )}

          {user ? (
            request.lockedAt ? (
              <Alert tone="warning">This discussion was locked by a moderator.</Alert>
            ) : (
              <ResponseForm requestId={request.id} />
            )
          ) : (
            <Alert tone="info">
              <Link href="/login" className="link">
                Sign in
              </Link>{' '}
              to answer this request.
            </Alert>
          )}
        </CardContent>
      </Card>

      {user ? (
        <Card>
          <CardContent>
            <CommentThread
              targetType="help_request"
              targetId={request.id}
              comments={comments}
              currentUserId={user.id}
              locked={Boolean(request.lockedAt)}
            />
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">Last activity {formatRelative(request.updatedAt)}</p>

      {isOwner ? (
        <details className="card-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Edit this request</summary>
          <div className="mt-4">
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
          </div>
        </details>
      ) : null}
    </div>
  );
}
