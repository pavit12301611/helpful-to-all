'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Pin, Trash2, UserPlus, Users, Copy, LogOut } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Field, Input, Select, Textarea, Checkbox } from '@/components/ui/field';
import { Avatar, Badge, PrivacyBadge, labelize } from '@/components/ui/card';
import { useToast } from '@/components/ui/feedback';
import { GROUP_KINDS, GROUP_VISIBILITY } from '@/lib/enums';
import { formatRelative } from '@/lib/utils';
import {
  addShoppingItemAction,
  createGroupAction,
  createInviteAction,
  createPollAction,
  createPostAction,
  deleteGroupAction,
  deletePostAction,
  joinGroupAction,
  leaveGroupAction,
  pinPostAction,
  removeMemberAction,
  removeShoppingAction,
  requestJoinAction,
  reviewJoinRequestAction,
  setMemberRoleAction,
  toggleShoppingAction,
  updateGroupAction,
  votePollAction,
} from './actions';

export function GroupForm({
  groupId,
  defaultValues,
}: {
  groupId?: string;
  defaultValues?: { name: string; description: string | null; kind: string; visibility: string };
}) {
  return (
    <ServerForm
      action={groupId ? (formData) => updateGroupAction(groupId, formData) : createGroupAction}
      successMessage={groupId ? 'Group updated.' : 'Group created.'}
      ariaLabel={groupId ? 'Update group' : 'Create group'}
      className="space-y-4"
    >
      {({ errors, pending }) => (
        <>
          <Field label="Group name" name="name" error={errors.name} required>
            {(props) => <Input {...props} name="name" defaultValue={defaultValues?.name} required maxLength={60} placeholder="Shivaji Nagar neighbours" />}
          </Field>
          <Field label="What is this group for?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={3} defaultValue={defaultValues?.description ?? ''} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type" name="kind" error={errors.kind}>
              {(props) => (
                <Select {...props} name="kind" defaultValue={defaultValues?.kind ?? 'friends'}>
                  {GROUP_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {labelize(kind)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Who can see it?" name="visibility" error={errors.visibility}>
              {(props) => (
                <Select {...props} name="visibility" defaultValue={defaultValues?.visibility ?? 'private'}>
                  {GROUP_VISIBILITY.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility === 'public'
                        ? 'Public - anyone can find and join'
                        : visibility === 'invite'
                          ? 'Invite only - join with a link'
                          : 'Private - members must be approved'}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <SubmitButton pending={pending}>{groupId ? 'Save group' : 'Create group'}</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function GroupCard({
  group,
  myRole,
}: {
  group: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    kind: string;
    visibility: string;
    _count: { members: number; posts?: number };
  };
  myRole?: string;
}) {
  return (
    <li className="card-surface flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/groups/${group.slug}`} className="text-sm font-semibold hover:underline">
          {group.name}
        </Link>
        <PrivacyBadge visibility={group.visibility} />
      </div>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{group.description || 'No description yet.'}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {group._count.members} member{group._count.members === 1 ? '' : 's'} · {labelize(group.kind)}
        </span>
        {myRole ? <Badge tone="primary">{labelize(myRole)}</Badge> : null}
      </div>
    </li>
  );
}

export function JoinControls({
  group,
  visibility,
}: {
  group: { id: string; name: string };
  visibility: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {visibility === 'public' ? (
        <ConfirmActionButton
          action={() => joinGroupAction(group.id)}
          title={`Join ${group.name}?`}
          description="Members will see your display name in the member list."
          confirmLabel="Join group"
          label="Join group"
          variant="primary"
          icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
        />
      ) : null}
      <ConfirmActionButton
        action={() => requestJoinAction(group.id)}
        title="Send a join request?"
        description="An admin or moderator will review it."
        confirmLabel="Send request"
        label={visibility === 'public' ? 'Request anyway' : 'Request to join'}
        variant="outline"
        icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
      />
    </div>
  );
}

export function PostForm({ groupId, isModerator }: { groupId: string; isModerator: boolean }) {
  return (
    <ServerForm action={createPostAction} successMessage="Posted." resetOnSuccess ariaLabel="Post to group" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="groupId" value={groupId} />
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={120} placeholder="Saturday clean-up at 9am" />}
          </Field>
          <Field label="Message" name="body" error={errors.body}>
            {(props) => <Textarea {...props} name="body" rows={3} />}
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            {isModerator ? (
              <Field label="Post type" name="kind" error={errors.kind} className="max-w-[12rem]">
                {(props) => (
                  <Select {...props} name="kind" defaultValue="post">
                    <option value="post">Normal post</option>
                    <option value="announcement">Announcement (notifies everyone)</option>
                  </Select>
                )}
              </Field>
            ) : (
              <input type="hidden" name="kind" value="post" />
            )}
            <SubmitButton pending={pending}>Post</SubmitButton>
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function PostCard({
  post,
  canModerate,
  isAuthor,
}: {
  post: {
    id: string;
    title: string;
    body: string;
    kind: string;
    pinned: boolean;
    createdAt: Date;
    author: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  };
  canModerate: boolean;
  isAuthor: boolean;
}) {
  const name = post.author.profile?.displayName ?? post.author.username;
  return (
    <li className={`rounded-lg border p-4 ${post.kind === 'announcement' ? 'border-info/40 bg-info/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={name} src={post.author.profile?.avatarUrl} size={28} />
          <div>
            <p className="text-sm font-semibold text-foreground">{post.title}</p>
            <p className="text-xs text-muted-foreground">
              {name} · {formatRelative(post.createdAt)}
              {post.kind === 'announcement' ? ' · Announcement' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canModerate ? (
            <button
              type="button"
              onClick={() => pinPostAction(post.id, !post.pinned)}
              aria-pressed={post.pinned}
              aria-label={post.pinned ? 'Unpin post' : 'Pin post'}
              className={`rounded p-1.5 ${post.pinned ? 'text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Pin className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          {canModerate || isAuthor ? (
            <ConfirmActionButton
              action={() => deletePostAction(post.id)}
              title="Remove this post?"
              description="It will disappear from the group feed."
              confirmLabel="Remove post"
              label="Remove post"
              variant="ghost"
              size="icon"
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              className="text-muted-foreground"
            />
          ) : null}
        </div>
      </div>
      {post.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p> : null}
    </li>
  );
}

export function PollForm({ groupId }: { groupId: string }) {
  const [options, setOptions] = React.useState(['', '']);
  return (
    <ServerForm action={createPollAction} successMessage="Poll created." resetOnSuccess ariaLabel="Create a poll" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <input type="hidden" name="groupId" value={groupId} />
          <Field label="Question" name="question" error={errors.question} required>
            {(props) => <Input {...props} name="question" placeholder="Which day works for the meet-up?" />}
          </Field>
          {options.map((option, index) => (
            <Field key={index} label={`Option ${index + 1}`} name={`option-${index}`} error={errors.options}>
              {(props) => (
                <Input
                  {...props}
                  name="options"
                  value={option}
                  onChange={(event) => {
                    const next = [...options];
                    next[index] = event.target.value;
                    setOptions(next);
                  }}
                  placeholder="Saturday morning"
                />
              )}
            </Field>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setOptions((current) => (current.length >= 8 ? current : [...current, '']))}
            >
              + Add option
            </button>
            <Checkbox name="multi" label="Allow multiple choices" />
            <SubmitButton pending={pending}>Create poll</SubmitButton>
          </div>
        </>
      )}
    </ServerForm>
  );
}

export function PollCard({
  poll,
  userId,
}: {
  poll: {
    id: string;
    question: string;
    multi: boolean;
    closesAt: Date | null;
    options: { id: string; label: string; votes: { userId: string }[] }[];
  };
  userId: string;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const closed = poll.closesAt ? poll.closesAt < new Date() : false;
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);

  function toggle(optionId: string) {
    setSelected((current) =>
      poll.multi ? (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]) : [optionId],
    );
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{poll.question}</p>
      <ul className="mt-2 space-y-2">
        {poll.options.map((option) => {
          const count = option.votes.length;
          const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const mine = option.votes.some((vote) => vote.userId === userId);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => toggle(option.id)}
                disabled={closed}
                aria-pressed={selected.includes(option.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-70"
              >
                <span className={`h-3 w-3 shrink-0 rounded-full border ${mine ? 'border-primary bg-primary' : 'border-input'}`} aria-hidden="true" />
                <span className="flex-1">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {count} · {pct}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        {!closed ? (
          <button
            type="button"
            onClick={() => votePollAction(poll.id, selected)}
            disabled={selected.length === 0}
            className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Vote
          </button>
        ) : (
          <Badge tone="neutral">Poll closed</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {totalVotes} vote{totalVotes === 1 ? '' : 's'}
          {poll.closesAt ? ` · closes ${formatRelative(poll.closesAt)}` : ''}
        </span>
      </div>
    </li>
  );
}

export function ShoppingPanel({
  groupId,
  items,
}: {
  groupId: string;
  items: { id: string; label: string; quantity: string | null; purchasedAt: Date | null }[];
}) {
  return (
    <div className="space-y-3">
      <ServerForm action={addShoppingItemAction} successMessage="Added." resetOnSuccess ariaLabel="Add to shopping list" className="flex flex-wrap gap-2">
        {({ errors, pending }) => (
          <>
            <input type="hidden" name="groupId" value={groupId} />
            <div className="flex-1">
              <label htmlFor="shopping-label" className="sr-only">
                Item
              </label>
              <Input id="shopping-label" name="label" placeholder="Milk" aria-invalid={Boolean(errors.label)} />
            </div>
            <div className="w-28">
              <label htmlFor="shopping-quantity" className="sr-only">
                Quantity
              </label>
              <Input id="shopping-quantity" name="quantity" placeholder="2 L" />
            </div>
            <SubmitButton pending={pending}>Add</SubmitButton>
          </>
        )}
      </ServerForm>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">The shared list is empty.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <button
                type="button"
                onClick={() => toggleShoppingAction(item.id, !item.purchasedAt)}
                aria-pressed={Boolean(item.purchasedAt)}
                aria-label={item.purchasedAt ? `Mark ${item.label} as needed again` : `Mark ${item.label} as bought`}
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  item.purchasedAt ? 'border-success bg-success text-success-foreground' : 'border-input'
                }`}
              >
                {item.purchasedAt ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
              </button>
              <span className={`flex-1 text-sm ${item.purchasedAt ? 'text-muted-foreground line-through' : ''}`}>
                {item.label}
                {item.quantity ? <span className="text-xs text-muted-foreground"> · {item.quantity}</span> : null}
              </span>
              <ConfirmActionButton
                action={() => removeShoppingAction(item.id)}
                title="Remove this item?"
                description={`“${item.label}” will be removed from the shared list.`}
                confirmLabel="Remove"
                label={`Remove ${item.label}`}
                variant="ghost"
                size="icon"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                className="text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InvitePanel({ groupId, role }: { groupId: string; role: string }) {
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const toast = useToast();
  const canInvite = ['owner', 'admin', 'moderator'].includes(role);

  if (!canInvite) return <p className="text-sm text-muted-foreground">Ask an admin for an invite link.</p>;

  return (
    <div className="space-y-3">
      <ServerForm
        action={async (formData) => {
          const result = await createInviteAction(formData);
          if (result.ok && typeof result.data === 'object' && result.data) {
            setInviteUrl((result.data as { url: string }).url);
          }
          return result;
        }}
        successMessage="Invite link created."
        ariaLabel="Invite someone"
        className="space-y-3"
      >
        {({ errors, pending }) => (
          <>
            <input type="hidden" name="groupId" value={groupId} />
            <Field label="Their email (optional)" name="email" error={errors.email} hint="Used only for the invite record - OpenHub does not email people who have not joined.">
              {(props) => <Input {...props} name="email" type="email" placeholder="friend@example.com" />}
            </Field>
            <Field label="Role" name="role" error={errors.role}>
              {(props) => (
                <Select {...props} name="role" defaultValue="member">
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                </Select>
              )}
            </Field>
            <SubmitButton pending={pending}>Create invite link</SubmitButton>
          </>
        )}
      </ServerForm>

      {inviteUrl ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Share this link privately. It expires in 14 days.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-card px-2 py-1 text-xs">{inviteUrl}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.push({ tone: 'success', title: 'Copied to clipboard.' });
                } catch {
                  toast.push({ tone: 'warning', title: 'Copy failed', description: 'Select the link and copy it manually.' });
                }
              }}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MembersPanel({
  groupId,
  members,
  joinRequests,
  currentUserId,
  myRole,
}: {
  groupId: string;
  members: {
    id: string;
    userId: string;
    role: string;
    user: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
  }[];
  joinRequests: { id: string; message: string | null; status: string; user: { username: string; profile: { displayName: string | null } | null } }[];
  currentUserId: string;
  myRole: string;
}) {
  const canManage = ['owner', 'admin'].includes(myRole);
  const canReview = ['owner', 'admin', 'moderator'].includes(myRole);
  const pending = joinRequests.filter((request) => request.status === 'pending');

  return (
    <div className="space-y-4">
      {canReview && pending.length ? (
        <div className="rounded-lg border border-info/30 bg-info/5 p-3">
          <p className="text-sm font-medium text-foreground">Join requests ({pending.length})</p>
          <ul className="mt-2 space-y-2">
            {pending.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm">{request.user.profile?.displayName ?? request.user.username}</p>
                  {request.message ? <p className="text-xs text-muted-foreground">{request.message}</p> : null}
                </div>
                <div className="flex gap-1">
                  <ConfirmActionButton action={() => reviewJoinRequestAction(request.id, true)} title="Add this member?" description="They will be able to see everything in the group." confirmLabel="Approve" label="Approve" variant="success" size="sm" />
                  <ConfirmActionButton action={() => reviewJoinRequestAction(request.id, false)} title="Decline this request?" description="They can request again later." confirmLabel="Decline" label="Decline" variant="outline" size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="space-y-2">
        {members.map((member) => {
          const name = member.user.profile?.displayName ?? member.user.username;
          return (
            <li key={member.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Avatar name={name} src={member.user.profile?.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <Link href={`/members/${member.user.username}`} className="block truncate text-sm font-medium hover:underline">
                  {name}
                </Link>
                <p className="text-xs text-muted-foreground">@{member.user.username}</p>
              </div>
              <Badge tone={member.role === 'owner' ? 'primary' : 'neutral'}>{labelize(member.role)}</Badge>
              {canManage && member.userId !== currentUserId && member.role !== 'owner' ? (
                <div className="flex items-center gap-1">
                  <label htmlFor={`role-${member.id}`} className="sr-only">
                    Role for {name}
                  </label>
                  <select
                    id={`role-${member.id}`}
                    className="input-base h-8 w-32 text-xs"
                    value={member.role}
                    onChange={(event) => setMemberRoleAction(groupId, member.userId, event.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ConfirmActionButton
                    action={() => removeMemberAction(groupId, member.userId)}
                    title={`Remove ${name} from the group?`}
                    description="They will lose access to the group and its content."
                    confirmLabel="Remove member"
                    label={`Remove ${name}`}
                    variant="ghost"
                    size="icon"
                    icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    className="text-muted-foreground"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LeaveGroupButton({ groupId, isOwner }: { groupId: string; isOwner: boolean }) {
  if (isOwner) {
    return (
      <ConfirmActionButton
        action={() => deleteGroupAction(groupId)}
        title="Delete this group?"
        description="Posts, polls, tasks and the member list will be removed for everyone."
        confirmLabel="Delete group"
        label="Delete group"
        variant="danger"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }
  return (
    <ConfirmActionButton
      action={() => leaveGroupAction(groupId)}
      title="Leave this group?"
      description="You will lose access until someone invites you again."
      confirmLabel="Leave group"
      label="Leave group"
      variant="outline"
      icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
    />
  );
}
