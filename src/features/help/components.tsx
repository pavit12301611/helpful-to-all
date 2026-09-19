'use client';

import Link from 'next/link';
import { Check, MessageCircle, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Avatar, Badge, PrivacyBadge, StatusBadge, labelize } from '@/components/ui/card';
import { VoteControl, SaveButton, ReportButton } from '@/features/social/components';
import { DISCLAIMER_CATEGORIES, HELP_CATEGORIES, HELP_KINDS, HELP_URGENCY } from '@/lib/enums';
import { formatRelative } from '@/lib/utils';
import {
  acceptResponseAction,
  createHelpRequestAction,
  createResponseAction,
  deleteHelpRequestAction,
  notifyHelpersAction,
  setHelpStatusAction,
  updateHelpRequestAction,
} from './actions';

export function HelpRequestForm({
  requestId,
  defaultValues,
}: {
  requestId?: string;
  defaultValues?: {
    title: string;
    body: string;
    category: string;
    kind: string;
    urgency: string;
    visibility: string;
    tags: string;
    city: string | null;
    country: string | null;
  };
}) {
  const action = requestId
    ? (formData: FormData) => updateHelpRequestAction(requestId, formData)
    : createHelpRequestAction;

  return (
    <ServerForm action={action} successMessage={requestId ? 'Request updated.' : 'Posted to the community.'} ariaLabel="Help request" className="space-y-4">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} hint="One clear sentence, e.g. “Need a ride to the clinic on Thursday”." required>
            {(props) => <Input {...props} name="title" defaultValue={defaultValues?.title} required maxLength={140} />}
          </Field>

          <Field label="Explain what you need (or can offer)" name="body" error={errors.body} required>
            {(props) => (
              <Textarea {...props} name="body" rows={6} defaultValue={defaultValues?.body} placeholder="Add timing, location and anything people should know." />
            )}
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category" name="category" error={errors.category} required>
              {(props) => (
                <Select {...props} name="category" defaultValue={defaultValues?.category ?? 'local_information'}>
                  {HELP_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {labelize(category)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Type" name="kind" error={errors.kind}>
              {(props) => (
                <Select {...props} name="kind" defaultValue={defaultValues?.kind ?? 'question'}>
                  {HELP_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind === 'question' ? 'I have a question' : kind === 'request' ? 'I need help' : 'I can help'}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Urgency" name="urgency" error={errors.urgency}>
              {(props) => (
                <Select {...props} name="urgency" defaultValue={defaultValues?.urgency ?? 'normal'}>
                  {HELP_URGENCY.map((urgency) => (
                    <option key={urgency} value={urgency}>
                      {labelize(urgency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City" name="city" error={errors.city} hint="Only the city is shown, never your address.">
              {(props) => <Input {...props} name="city" defaultValue={defaultValues?.city ?? ''} />}
            </Field>
            <Field label="Country" name="country" error={errors.country}>
              {(props) => <Input {...props} name="country" defaultValue={defaultValues?.country ?? ''} />}
            </Field>
            <Field label="Visibility" name="visibility" error={errors.visibility}>
              {(props) => (
                <Select {...props} name="visibility" defaultValue={defaultValues?.visibility ?? 'public'}>
                  <option value="public">Public - visible to everyone</option>
                  <option value="private">Private - only I can see it</option>
                </Select>
              )}
            </Field>
          </div>

          <Field label="Tags" name="tags" error={errors.tags} hint="Comma separated, up to 8.">
            {(props) => <Input {...props} name="tags" defaultValue={defaultValues?.tags} placeholder="rides, clinic" />}
          </Field>

          <SubmitButton pending={pending}>{requestId ? 'Save changes' : 'Post to the community'}</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function HelpRequestCard({
  request,
  score = 0,
  saved = false,
}: {
  request: {
    id: string;
    title: string;
    body: string;
    category: string;
    kind: string;
    urgency: string;
    status: string;
    visibility: string;
    city: string | null;
    createdAt: Date;
    author: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
    _count: { responses: number };
  };
  score?: number;
  saved?: boolean;
}) {
  const author = request.author.profile?.displayName ?? request.author.username;
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-4">
      <div className="hidden sm:block">
        <VoteControl targetType="help_request" targetId={request.id} score={score} userValue={0} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/help/${request.id}`} className="text-sm font-semibold text-foreground hover:underline">
          {request.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <Badge tone="neutral">{labelize(request.category)}</Badge>
          {request.urgency === 'urgent' || request.urgency === 'high' ? (
            <Badge tone="danger">{labelize(request.urgency)}</Badge>
          ) : null}
          {request.visibility !== 'public' ? <PrivacyBadge visibility={request.visibility} /> : null}
          <span className="text-xs text-muted-foreground">
            {author}
            {request.city ? ` · ${request.city}` : ''} · {formatRelative(request.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {request._count.responses}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <SaveButton targetType="help_request" targetId={request.id} saved={saved} />
      </div>
    </li>
  );
}

export function ResponseForm({ requestId }: { requestId: string }) {
  return (
    <ServerForm
      action={createResponseAction}
      successMessage="Answer posted."
      resetOnSuccess
      ariaLabel="Post an answer"
      className="space-y-3"
    >
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="requestId" value={requestId} />
          <Field label="Your answer" name="body" error={errors.body} hint="Share what you know. If you are not sure, say so.">
            {(props) => <Textarea {...props} name="body" rows={4} placeholder="Write a helpful, honest answer." />}
          </Field>
          <SubmitButton pending={pending}>Post answer</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ResponseCard({
  requestId,
  response,
  isAuthor,
  isOwner,
  score = 0,
}: {
  requestId: string;
  response: {
    id: string;
    body: string;
    isAccepted: boolean;
    createdAt: Date;
    author: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  };
  isAuthor: boolean;
  isOwner: boolean;
  score?: number;
}) {
  const name = response.author.profile?.displayName ?? response.author.username;
  return (
    <li className={`rounded-lg border p-4 ${response.isAccepted ? 'border-success bg-success/5' : 'border-border bg-card'}`}>
      <div className="flex gap-3">
        <div className="hidden sm:block">
          <VoteControl targetType="help_response" targetId={response.id} score={score} userValue={0} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar name={name} src={response.author.profile?.avatarUrl} size={24} />
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{formatRelative(response.createdAt)}</span>
            {response.isAccepted ? <Badge tone="success">Accepted answer</Badge> : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{response.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isOwner && !response.isAccepted ? (
              <ConfirmActionButton
                action={() => acceptResponseAction(requestId, response.id)}
                title="Accept this answer?"
                description="The request will be marked as solved and the person thanked."
                confirmLabel="Accept answer"
                label="Accept answer"
                variant="success"
                size="sm"
                icon={<Check className="h-4 w-4" aria-hidden="true" />}
              />
            ) : null}
            {isAuthor || isOwner ? (
              <ConfirmActionButton
                action={async () => {
                  const { deleteResponseAction } = await import('./actions');
                  return deleteResponseAction(response.id);
                }}
                title="Remove this answer?"
                description="It will no longer be visible to the community."
                confirmLabel="Remove answer"
                label="Remove"
                variant="outline"
                size="sm"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              />
            ) : null}
            <ReportButton targetType="help_response" targetId={response.id} />
          </div>
        </div>
      </div>
    </li>
  );
}

export function AuthorControls({
  requestId,
  status,
  canDelete,
}: {
  requestId: string;
  status: string;
  canDelete: boolean;
}) {
  if (!canDelete) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'solved' ? (
        <ConfirmActionButton
          action={() => setHelpStatusAction(requestId, 'solved')}
          title="Mark this request as solved?"
          description="People will see that your request no longer needs help."
          confirmLabel="Mark solved"
          label="Mark as solved"
          variant="success"
        />
      ) : (
        <ConfirmActionButton
          action={() => setHelpStatusAction(requestId, 'open')}
          title="Reopen this request?"
          description="It will appear in the open list again."
          confirmLabel="Reopen"
          label="Reopen"
          variant="outline"
        />
      )}
      <ConfirmActionButton
        action={() => notifyHelpersAction(requestId)}
        title="Notify nearby helpers?"
        description="Members who offered help in this category and city will get a notification."
        confirmLabel="Notify helpers"
        label="Notify nearby helpers"
        variant="outline"
      />
      <Link href={`/help/${requestId}/edit`} className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted">
        Edit
      </Link>
      <ConfirmActionButton
        action={() => deleteHelpRequestAction(requestId)}
        title="Delete this request?"
        description="Answers and comments will also be removed."
        confirmLabel="Delete request"
        label="Delete"
        variant="outline"
      />
    </div>
  );
}

export function DisclaimerNotice({ category }: { category: string }) {
  if (!DISCLAIMER_CATEGORIES.includes(category as (typeof DISCLAIMER_CATEGORIES)[number])) return null;
  return (
    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      Members share information in good faith. This is not professional medical, legal or financial advice - please
      confirm details with a qualified professional or an official source.
    </p>
  );
}
