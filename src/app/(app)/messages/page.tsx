import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getConversation, listConversations } from '@/features/messages/service';
import { ConversationList, MessageThread, MessagingIntro, NewConversationForm } from '@/features/messages/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const conversations = await listConversations(user.id);
  const activeId = params.c;

  const conversation = activeId ? await getConversation(user.id, activeId).catch(() => null) : null;

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Messages"
        description="Private conversations with other members. Only participants can read them."
        icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader title="Conversations" description="Hidden threads stay hidden for you only." />
            <CardContent>
              <ConversationList conversations={conversations} activeId={activeId} />
            </CardContent>
          </Card>
          <NewConversationForm />
        </div>

        <div className="grid gap-4">
          {conversation ? (
            <MessageThread
              conversationId={conversation.id}
              currentUserId={user.id}
              partnerName={
                conversation.participants.find((participant) => participant.userId !== user.id)?.user.profile?.displayName ??
                conversation.participants.find((participant) => participant.userId !== user.id)?.user.username ??
                'Conversation'
              }
              messages={conversation.messages}
            />
          ) : activeId ? (
            <Card>
              <CardContent className="py-5">
                <Alert tone="warning">
                  That conversation is not available to you. It may have been hidden, or you may not be a participant.
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <MessagingIntro />
          )}
        </div>
      </div>
    </div>
  );
}
