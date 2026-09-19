'use client';

import * as React from 'react';
import { ArrowBigDown, ArrowBigUp, Bookmark, Flag, UserX, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Avatar } from '@/components/ui/card';
import { REPORT_REASONS } from '@/lib/enums';
import { formatRelative, labelize } from '@/lib/utils';
import {
  blockUserAction,
  createCommentAction,
  deleteCommentAction,
  reportAction,
  toggleSavedAction,
  voteAction,
} from './actions';

/**
 * Reusable social controls: comments, votes, save, report and block.
 * Every module uses these so behaviour and moderation are consistent.
 */

export function CommentThread({
  targetType,
  targetId,
  comments,
  currentUserId,
  locked = false,
  lockReason,
}: {
  targetType: string;
  targetId: string;
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    parentId: string | null;
    author: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  }[];
  currentUserId: string;
  locked?: boolean;
  lockReason?: string;
}) {
  const roots = comments.filter((comment) => !comment.parentId);
  const replies = (parentId: string) => comments.filter((comment) => comment.parentId === parentId);

  return (
    <section aria-label="Comments" className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        Discussion <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
      </h2>

      {locked ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {lockReason ?? 'This discussion was locked by a moderator.'}
        </p>
      ) : (
        <ServerForm
          action={async (formData) =>
            createCommentAction({
              targetType,
              targetId,
              body: formData.get('body'),
              parentId: formData.get('parentId') ?? '',
            })
          }
          successMessage="Comment posted."
          resetOnSuccess
          ariaLabel="Write a comment"
        >
          {({ errors, pending }) => (
            <div className="space-y-2">
              <Field label="Add to the discussion" name="body" error={errors.body}>
                {(props) => (
                  <Textarea
                    {...props}
                    name="body"
                    rows={3}
                    placeholder="Be kind and specific. Never share someone's private information."
                  />
                )}
              </Field>
              <SubmitButton pending={pending}>Post comment</SubmitButton>
            </div>
          )}
        </ServerForm>
      )}

      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {roots.map((comment) => (
            <li key={comment.id}>
              <CommentBody comment={comment} currentUserId={currentUserId} />
              {replies(comment.id).length ? (
                <ul className="mt-2 space-y-2 border-l-2 border-border pl-4">
                  {replies(comment.id).map((reply) => (
                    <li key={reply.id}>
                      <CommentBody comment={reply} currentUserId={currentUserId} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentBody({
  comment,
  currentUserId,
}: {
  comment: {
    id: string;
    body: string;
    createdAt: Date;
    targetType?: string;
    author: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  };
  currentUserId: string;
}) {
  const name = comment.author.profile?.displayName ?? comment.author.username;
  return (
    <div className="flex gap-2">
      <Avatar name={name} src={comment.author.profile?.avatarUrl} size={32} />
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{formatRelative(comment.createdAt)}</span>
            {comment.author.id === currentUserId ? (
              <ConfirmActionButton
                action={() => deleteCommentAction(comment.id)}
                title="Delete this comment?"
                description="Your comment will be removed from the discussion."
                confirmLabel="Delete comment"
                label="Delete comment"
                variant="ghost"
                size="icon"
                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                className="text-muted-foreground"
              />
            ) : null}
          </div>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{comment.body}</p>
      </div>
    </div>
  );
}

export function VoteControl({
  targetType,
  targetId,
  score,
  userValue = 0,
  vertical = true,
}: {
  targetType: string;
  targetId: string;
  score: number;
  userValue?: number;
  vertical?: boolean;
}) {
  const [currentScore, setCurrentScore] = React.useState(score);
  const [currentValue, setCurrentValue] = React.useState(userValue);

  async function vote(value: 1 | -1) {
    const result = await voteAction(targetType, targetId, value);
    if (result.ok && typeof result.data === 'object' && result.data) {
      const data = result.data as { score: number; userValue: number };
      setCurrentScore(data.score);
      setCurrentValue(data.userValue);
    }
  }

  return (
    <div className={vertical ? 'flex flex-col items-center gap-0.5' : 'flex items-center gap-1'}>
      <button
        type="button"
        onClick={() => vote(1)}
        aria-pressed={currentValue === 1}
        aria-label="Mark as helpful"
        className={`rounded p-1 ${currentValue === 1 ? 'text-success' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <ArrowBigUp className="h-5 w-5" fill={currentValue === 1 ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <span className="text-sm font-medium text-foreground" aria-live="polite">
        {currentScore}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-pressed={currentValue === -1}
        aria-label="Mark as not helpful"
        className={`rounded p-1 ${currentValue === -1 ? 'text-danger' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <ArrowBigDown className="h-5 w-5" fill={currentValue === -1 ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>
  );
}

export function SaveButton({
  targetType,
  targetId,
  saved,
  label,
}: {
  targetType: string;
  targetId: string;
  saved: boolean;
  /** Optional wording for things that are "followed" rather than "saved". */
  label?: string;
}) {
  const [isSaved, setIsSaved] = React.useState(saved);
  return (
    <button
      type="button"
      onClick={async () => {
        const result = await toggleSavedAction(targetType, targetId);
        if (result.ok && typeof result.data === 'object' && result.data) {
          setIsSaved((result.data as { saved: boolean }).saved);
        }
      }}
      aria-pressed={isSaved}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm ${
        isSaved ? 'text-primary' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
      {isSaved ? (label ? label.replace(/^Save|^Follow/, 'Saved').replace('Savedd', 'Saved') : 'Saved') : (label ?? 'Save')}
    </button>
  );
}

export function ReportButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [open, setOpen] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  if (sent) {
    return <span className="text-xs text-muted-foreground">Reported - thank you.</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        Report
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report this content" size="sm" description="A moderator will review it. Please only report genuine problems.">
        <ServerForm
          action={async (formData) => {
            const result = await reportAction({
              targetType,
              targetId,
              reason: formData.get('reason'),
              details: formData.get('details') ?? '',
            });
            if (result.ok) {
              setSent(true);
              setOpen(false);
            }
            return result;
          }}
          successMessage="Report sent."
          ariaLabel="Report content"
          className="space-y-3"
        >
          {({ errors, pending }) => (
            <>
              <Field label="Reason" name="reason" error={errors.reason} required>
                {(props) => (
                  <Select {...props} name="reason" defaultValue="spam">
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {labelize(reason)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="What is wrong?" name="details" error={errors.details}>
                {(props) => <Textarea {...props} name="details" rows={3} placeholder="Add any details that help a moderator decide." />}
              </Field>
              <SubmitButton pending={pending}>Send report</SubmitButton>
            </>
          )}
        </ServerForm>
      </Modal>
    </>
  );
}

export function BlockButton({ blockedId, name }: { blockedId: string; name: string }) {
  return (
    <ConfirmActionButton
      action={() => blockUserAction({ blockedId })}
      title={`Block ${name}?`}
      description="They will not be able to message you or see your private content. You can unblock them in settings."
      confirmLabel="Block member"
      label="Block"
      variant="outline"
      size="sm"
      icon={<UserX className="h-4 w-4" aria-hidden="true" />}
    />
  );
}

export function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" type="button" onClick={onClick}>
      {children}
    </Button>
  );
}
