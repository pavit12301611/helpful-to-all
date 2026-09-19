'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { LinkButton } from '@/components/ui/button';
import { Avatar, Badge, Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/field';
import { deleteMessageAction, hideConversationAction, sendMessageAction, startConversationAction } from './actions';

function formDataOf(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

export function NewConversationForm() {
  return (
    <Card>
      <CardHeader title="Start a conversation" description="Message someone by username. Their message preference is respected." />
      <CardContent>
        <ServerForm action={startConversationAction} className="space-y-3" ariaLabel="Start a conversation" resetOnSuccess>
          {({ errors, pending }) => (
            <>
              <Field
                label="Username"
                name="username"
                error={errors.username}
                required
                hint="People who set messages to “nobody” cannot be messaged."
              >
                {(props) => <Input {...props} name="username" required maxLength={40} placeholder="priya" />}
              </Field>
              <SubmitButton pending={pending}>Open conversation</SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type ConversationSummary = {
  id: string;
  kind: string;
  title: string | null;
  others: { userId: string; user: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null } }[];
  lastMessage: { id: string; body: string; createdAt: Date } | null;
  lastMessageAt: Date;
  unread: number;
};

export function ConversationList({ conversations, activeId }: { conversations: ConversationSummary[]; activeId?: string }) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations"
        description="Start one with the form on the right. You can also message someone from their profile or a skill listing."
        icon={<MessageSquare className="h-8 w-8" aria-hidden="true" />}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conversation) => {
        const other = conversation.others[0];
        const name = other?.user.profile?.displayName ?? other?.user.username ?? conversation.title ?? 'Conversation';
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages?c=${conversation.id}`}
              aria-current={activeId === conversation.id ? 'page' : undefined}
              className={`flex items-start gap-3 py-3 ${activeId === conversation.id ? 'text-foreground' : ''}`}
            >
              <Avatar name={name} src={other?.user.profile?.avatarUrl} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{name}</span>
                  {conversation.unread > 0 ? <Badge tone="primary">{conversation.unread} new</Badge> : null}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {conversation.lastMessage ? conversation.lastMessage.body : 'No messages yet'}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
  sender: { username: string; profile: { displayName: string | null; avatarUrl: string | null } | null };
};

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
  partnerName,
}: {
  conversationId: string;
  messages: MessageRow[];
  currentUserId: string;
  partnerName: string;
}) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <Card>
      <CardHeader
        title={partnerName}
        description={`${messages.length} message${messages.length === 1 ? '' : 's'}`}
        action={
          <ConfirmActionButton
            action={() => hideConversationAction(formDataOf({ conversationId }))}
            title="Hide this conversation?"
            description="It disappears from your list. The other person keeps their copy."
            confirmLabel="Hide conversation"
            successMessage="Conversation hidden."
            variant="outline"
            label="Hide"
          />
        }
      />
      <CardContent className="grid gap-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Say hello — your first message is only sent when you press Send.</p>
        ) : (
          <ul className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
            {messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <li key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
                  {!mine ? <Avatar name={message.sender.profile?.displayName ?? message.sender.username} src={message.sender.profile?.avatarUrl} size={28} /> : null}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      mine ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted/40 text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {mine ? (
                    <ConfirmActionButton
                      action={() => deleteMessageAction(formDataOf({ conversationId, messageId: message.id }))}
                      title="Delete this message?"
                      description="It is removed for everyone in the conversation."
                      confirmLabel="Delete message"
                      successMessage="Message deleted."
                      variant="ghost"
                      size="icon"
                      label="Delete message"
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />

        <ServerForm action={sendMessageAction} className="space-y-3" ariaLabel={`Message ${partnerName}`} resetOnSuccess>
          {({ errors, pending }) => (
            <>
              <input type="hidden" name="conversationId" value={conversationId} />
              <Field label="Message" name="body" error={errors.body} required>
                {(props) => (
                  <Textarea {...props} name="body" rows={3} required maxLength={2000} placeholder={`Write to ${partnerName}…`} />
                )}
              </Field>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Be kind. Reports and blocks are available from any profile.
                </p>
                <SubmitButton pending={pending}>
                  <Send className="h-4 w-4" aria-hidden="true" /> Send
                </SubmitButton>
              </div>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function MessagingIntro() {
  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <Alert tone="info">
          Messages are private between participants. Moderators can only see them if they are reported, and every moderation view is
          written to the audit log.
        </Alert>
        <p className="text-sm text-muted-foreground">
          Choose a conversation on the left, or start a new one. You can change who may message you in your profile settings.
        </p>
        <LinkButton href="/notifications" variant="outline" size="sm" className="justify-self-start">
          See notifications instead
        </LinkButton>
      </CardContent>
    </Card>
  );
}
