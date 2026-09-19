'use client';

import * as React from 'react';
import Link from 'next/link';
import { BadgeCheck, Gavel, RotateCcw, ShieldCheck, UserCog } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { USER_ROLES } from '@/lib/enums';
import {
  hideContentAction,
  lockDiscussionAction,
  restoreContentAction,
  reviewReportAction,
  setMemberRoleAction,
  suspendUserAction,
  verifyAction,
  warnUserAction,
} from './actions';

function formDataOf(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

/* ------------------------------------------------------------- report queue */

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reporter: { username: string; profile: { displayName: string | null } | null };
  reviewedBy: { username: string; profile: { displayName: string | null } | null } | null;
  target: { title: string; href: string };
};

export function ReportCard({ report }: { report: ReportRow }) {
  const [resolution, setResolution] = React.useState(report.resolution ?? '');
  const hideable = [
    'help_request',
    'help_response',
    'comment',
    'group_post',
    'resource',
    'opportunity',
    'campaign',
    'student_resource',
    'message',
  ].includes(report.targetType);
  const lockable = report.targetType === 'help_request' || report.targetType === 'group_post';

  return (
    <Card>
      <CardHeader
        title={report.target.title}
        description={`${report.reason.replace(/_/g, ' ')} · reported by @${report.reporter.username} · ${report.createdAt.toLocaleString()}`}
        action={<Badge tone={report.status === 'open' ? 'warning' : 'neutral'}>{report.status}</Badge>}
      />
      <CardContent className="grid gap-3">
        {report.details ? <p className="text-sm text-muted-foreground">{report.details}</p> : null}
        <Link href={report.target.href} className="text-sm font-medium text-primary">
          Open the reported item
        </Link>

        {report.reviewedBy ? (
          <p className="text-xs text-muted-foreground">
            Reviewed by {report.reviewedBy.profile?.displayName ?? report.reviewedBy.username}
            {report.reviewedAt ? ` on ${report.reviewedAt.toLocaleString()}` : ''}
          </p>
        ) : null}

        <ServerForm action={reviewReportAction} className="grid gap-3" ariaLabel="Update report">
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="reportId" value={report.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Outcome" name="status" error={errors.status}>
                  {(props) => (
                    <Select {...props} name="status" defaultValue={report.status === 'open' ? 'reviewed' : report.status}>
                      <option value="reviewed">Reviewed — no action needed</option>
                      <option value="actioned">Actioned — content dealt with</option>
                      <option value="dismissed">Dismissed — not a violation</option>
                    </Select>
                  )}
                </Field>
                <Field label="Note for the reporter" name="resolution" error={errors.resolution}>
                  {(props) => (
                    <Textarea
                      {...props}
                      name="resolution"
                      rows={2}
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      maxLength={600}
                      placeholder="What you found and what you did."
                    />
                  )}
                </Field>
              </div>
              <SubmitButton pending={pending} variant="secondary">
                Save outcome
              </SubmitButton>
            </>
          )}
        </ServerForm>

        <div className="flex flex-wrap gap-2">
          {hideable ? (
            <ConfirmActionButton
              action={() => hideContentAction(formDataOf({ targetType: report.targetType, targetId: report.targetId, note: resolution }))}
              title="Hide this content?"
              description="It disappears for everyone. The author is notified and you can restore it later."
              confirmLabel="Hide content"
              successMessage="Content hidden and logged."
              variant="danger"
              icon={<Gavel className="h-4 w-4" aria-hidden="true" />}
            />
          ) : null}
          {hideable ? (
            <ConfirmActionButton
              action={() => restoreContentAction(formDataOf({ targetType: report.targetType, targetId: report.targetId }))}
              title="Restore this content?"
              description="It becomes visible again for everyone."
              confirmLabel="Restore"
              successMessage="Content restored."
              variant="outline"
              label="Restore"
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            />
          ) : null}
          {lockable ? (
            <ServerForm action={lockDiscussionAction} ariaLabel="Lock discussion">
              {({ pending }) => (
                <span className="flex items-center gap-2">
                  <input type="hidden" name="targetType" value={report.targetType} />
                  <input type="hidden" name="targetId" value={report.targetId} />
                  <input type="hidden" name="locked" value="true" />
                  <Button type="submit" variant="outline" size="sm" loading={pending}>
                    Lock discussion
                  </Button>
                </span>
              )}
            </ServerForm>
          ) : null}
        </div>

        <Alert tone="info">Every moderation action here writes a ModerationAction and an AuditLog entry.</Alert>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ members */

export type MemberRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  isSuspended: boolean;
  suspendedReason: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: { displayName: string | null; city: string | null; verificationStatus: string } | null;
};

export function MemberCard({ member, isAdmin, isSelf }: { member: MemberRow; isAdmin: boolean; isSelf: boolean }) {
  const [note, setNote] = React.useState('');

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Avatar name={member.profile?.displayName ?? member.username} size={28} />
            {member.profile?.displayName ?? member.username}
            <span className="text-sm font-normal text-muted-foreground">@{member.username}</span>
          </span>
        }
        description={`${member.email} · joined ${member.createdAt.toLocaleDateString()}`}
        action={
          <span className="flex flex-wrap items-center gap-1">
            <Badge tone="primary">{member.role}</Badge>
            {member.isSuspended ? <Badge tone="danger">suspended</Badge> : null}
            {member.profile?.verificationStatus === 'verified' ? <Badge tone="success">verified</Badge> : null}
          </span>
        }
      />
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <ServerForm action={setMemberRoleAction} className="grid gap-2" ariaLabel={`Change role for ${member.username}`}>
            {({ errors, pending }) => (
              <>
                <input type="hidden" name="userId" value={member.id} />
                <Field label="Role" name="role" error={errors.role} hint={isSelf ? 'You cannot change your own role.' : undefined}>
                  {(props) => (
                    <Select {...props} name="role" defaultValue={member.role} disabled={isSelf || pending || (!isAdmin && ['moderator', 'admin'].includes(member.role))}>
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <SubmitButton pending={pending} variant="outline" className="justify-self-start">
                  <UserCog className="h-4 w-4" aria-hidden="true" /> Update role
                </SubmitButton>
              </>
            )}
          </ServerForm>

          <ServerForm action={warnUserAction} className="grid gap-2" ariaLabel={`Warn ${member.username}`}>
            {({ errors, pending }) => (
              <>
                <input type="hidden" name="userId" value={member.id} />
                <Field label="Warning" name="note" error={errors.note} required>
                  {(props) => (
                    <Textarea
                      {...props}
                      name="note"
                      rows={2}
                      required
                      maxLength={600}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="What needs to change, and which rule applies."
                    />
                  )}
                </Field>
                <SubmitButton pending={pending} variant="outline" className="justify-self-start">
                  Send warning
                </SubmitButton>
              </>
            )}
          </ServerForm>
        </div>

        {member.isSuspended && member.suspendedReason ? (
          <p className="text-sm text-muted-foreground">Suspended because: {member.suspendedReason}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {member.isSuspended ? (
            <ConfirmActionButton
              action={() => suspendUserAction(formDataOf({ userId: member.id, suspended: 'false' }))}
              title="Reinstate this member?"
              description="They can sign in and post again immediately."
              confirmLabel="Reinstate"
              successMessage="Member reinstated."
              variant="success"
              label="Reinstate"
            />
          ) : isSelf ? (
            <Button type="button" variant="danger" size="sm" disabled title="You cannot suspend yourself">
              Suspend
            </Button>
          ) : (
            <ConfirmActionButton
              action={() => suspendUserAction(formDataOf({ userId: member.id, suspended: 'true', reason: note }))}
              title="Suspend this member?"
              description="They lose access until a moderator reinstates them. The reason is stored and logged."
              confirmLabel="Suspend member"
              successMessage="Member suspended and logged."
              variant="danger"
            />
          )}
          <Link href={`/members/${member.username}`} className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted">
            View public profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------- verification queue */

export type VerificationRow = { id: string; title: string; subtitle: string; createdAt: Date };

export function VerificationList({
  rows,
  kind,
  linkBase,
}: {
  rows: VerificationRow[];
  kind: 'resource' | 'opportunity' | 'campaign';
  linkBase: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing waiting" description="Everything submitted has been reviewed." icon={<BadgeCheck className="h-8 w-8" aria-hidden="true" />} />;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link href={`${linkBase}${row.id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">
              {row.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {row.subtitle || 'No extra details'} · submitted {row.createdAt.toLocaleDateString()}
            </p>
          </div>
          <ConfirmActionButton
            action={() => verifyAction(formDataOf({ kind, id: row.id }))}
            title="Mark this as verified?"
            description="A verified badge appears publicly and the submitter is notified. Only verify what you have actually checked."
            confirmLabel="Verify"
            successMessage="Marked as verified."
            variant="outline"
            label="Verify"
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- audit trail */

export type AuditRow = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  createdAt: Date;
  actor: { username: string; profile: { displayName: string | null } | null } | null;
};

export function AuditList({ entries }: { entries: AuditRow[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No entries yet" description="Moderation and admin actions are recorded here automatically." />;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="grid gap-1 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{entry.action}</Badge>
            <span className="text-sm text-foreground">
              {entry.actor?.profile?.displayName ?? entry.actor?.username ?? 'system'}
            </span>
            {entry.targetType ? (
              <span className="text-xs text-muted-foreground">
                {entry.targetType.replace(/_/g, ' ')} · {entry.targetId?.slice(0, 12)}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</span>
          </div>
          {entry.metadata ? <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{entry.metadata}</pre> : null}
        </li>
      ))}
    </ul>
  );
}

export type ModerationRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string | null;
  createdAt: Date;
  moderator: { username: string; profile: { displayName: string | null } | null };
};

export function ModerationHistoryList({ actions }: { actions: ModerationRow[] }) {
  if (actions.length === 0) {
    return <EmptyState title="No moderation actions yet" description="Hide, restore, warn, suspend and verify actions land here." />;
  }

  return (
    <ul className="divide-y divide-border">
      {actions.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-center gap-2 py-3">
          <Badge tone={entry.action === 'hide' || entry.action === 'suspend' ? 'danger' : entry.action === 'restore' || entry.action === 'reinstate' ? 'success' : 'neutral'}>
            {entry.action}
          </Badge>
          <span className="text-sm text-foreground">
            {entry.moderator.profile?.displayName ?? entry.moderator.username} → {entry.targetType.replace(/_/g, ' ')}
          </span>
          {entry.note ? <span className="text-xs text-muted-foreground">{entry.note}</span> : null}
          <span className="ml-auto text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

export function HiddenContentList({
  items,
}: {
  items: { id: string; title: string; type: string; hiddenAt: Date | null }[];
}) {
  if (items.length === 0) {
    return <EmptyState title="Nothing hidden" description="Content hidden by moderators appears here so it can be restored." />;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.type.replace(/_/g, ' ')} · hidden {item.hiddenAt?.toLocaleString() ?? 'recently'}
            </p>
          </div>
          <ConfirmActionButton
            action={() => restoreContentAction(formDataOf({ targetType: item.type, targetId: item.id }))}
            title="Restore this content?"
            description="It becomes visible again for everyone."
            confirmLabel="Restore"
            successMessage="Content restored."
            variant="outline"
            label="Restore"
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          />
        </li>
      ))}
    </ul>
  );
}

export function MemberFilters({ current }: { current: { q: string; role: string; suspended: string } }) {
  return (
    <form method="get" action="/admin" className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]" aria-label="Filter members">
      <input type="hidden" name="tab" value="members" />
      <Input name="q" defaultValue={current.q} placeholder="Search by name, username or email" aria-label="Search members" />
      <Select name="role" defaultValue={current.role} aria-label="Filter by role">
        <option value="all">All roles</option>
        {USER_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </Select>
      <Select name="suspended" defaultValue={current.suspended} aria-label="Filter by status">
        <option value="all">All statuses</option>
        <option value="suspended">Suspended</option>
        <option value="active">Active</option>
      </Select>
      <Button type="submit">Filter</Button>
    </form>
  );
}
