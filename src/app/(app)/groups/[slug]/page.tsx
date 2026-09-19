import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, ListChecks, ShoppingBasket } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getDb } from '@/server/db/client';
import { getGroupBySlug, listPolls, listPosts, listShopping } from '@/features/groups/service';
import {
  GroupForm,
  InvitePanel,
  JoinControls,
  LeaveGroupButton,
  MembersPanel,
  PollCard,
  PollForm,
  PostCard,
  PostForm,
  ShoppingPanel,
} from '@/features/groups/components';
import { Badge, Card, CardContent, CardHeader, PrivacyBadge, SectionHeading, labelize } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';
import { formatDateTime } from '@/lib/utils';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Group' };

const TABS = [
  { key: 'feed', label: 'Feed' },
  { key: 'polls', label: 'Polls' },
  { key: 'shopping', label: 'Shopping list' },
  { key: 'members', label: 'Members' },
  { key: 'settings', label: 'Settings' },
];

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await currentUser();
  const { slug } = await params;
  const query = await searchParams;
  const tab = TABS.some((entry) => entry.key === query.tab) ? (query.tab as string) : 'feed';

  let data;
  try {
    data = await getGroupBySlug(user?.id ?? null, slug);
  } catch (error) {
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title={error.name === 'ForbiddenError' ? 'This group is private' : 'Group not found'}>
            {error.message}
          </Alert>
          <Link href="/groups" className="link text-sm">
            Back to groups
          </Link>
        </div>
      );
    }
    throw error;
  }

  const { group, membership, isMember } = data;
  const myRole = membership?.role ?? 'visitor';
  const canModerate = ['owner', 'admin', 'moderator'].includes(myRole);
  const db = await getDb();

  const [posts, polls, shopping, joinRequests] = await Promise.all([
    isMember ? listPosts(user!.id, group.id) : Promise.resolve([]),
    isMember ? listPolls(user!.id, group.id) : Promise.resolve([]),
    isMember ? listShopping(user!.id, group.id) : Promise.resolve([]),
    canModerate
      ? db.groupJoinRequest.findMany({
          where: { groupId: group.id },
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All groups
      </Link>

      <SectionHeading
        title={group.name}
        description={group.description || `${group._count.members} members · created ${formatDateTime(group.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrivacyBadge visibility={group.visibility} />
            <Badge tone="neutral">{labelize(group.kind)}</Badge>
            {isMember ? <Badge tone="primary">You are {labelize(myRole)}</Badge> : null}
          </div>
        }
      />

      {!user ? (
        <Alert tone="info">
          <Link href="/login" className="link">
            Sign in
          </Link>{' '}
          to join this group.
        </Alert>
      ) : !isMember ? (
        <Card>
          <CardHeader title="Join this group" />
          <CardContent>
            <JoinControls group={{ id: group.id, name: group.name }} visibility={group.visibility} />
          </CardContent>
        </Card>
      ) : null}

      {isMember ? (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={`/tasks?groupId=${group.id}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Shared tasks
            </Link>
            <Link href={`/calendar?groupId=${group.id}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Shared calendar
            </Link>
            <Link href={`/groups/${group.slug}?tab=shopping`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 hover:bg-muted">
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              Shopping list
            </Link>
          </div>

          <Tabs tabs={TABS} current={tab} basePath={`/groups/${group.slug}`} searchParams={{}} />

          {tab === 'feed' ? (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Post to the group" description={canModerate ? 'Moderators can send announcements that notify everyone.' : undefined} />
                <CardContent>
                  <PostForm groupId={group.id} isModerator={canModerate} />
                </CardContent>
              </Card>

              {posts.length === 0 ? (
                <EmptyState title="No posts yet" description="Start the conversation - dates, plans, reminders, anything useful." />
              ) : (
                <ul className="space-y-2">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      canModerate={canModerate}
                      isAuthor={post.authorId === user!.id}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'polls' ? (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Create a poll" description="Great for dates, menus and splitting the bill." />
                <CardContent>
                  <PollForm groupId={group.id} />
                </CardContent>
              </Card>
              {polls.length === 0 ? (
                <EmptyState title="No polls yet" description="Ask the group something and let everyone vote." />
              ) : (
                <ul className="space-y-2">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} userId={user!.id} />
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'shopping' ? (
            <Card>
              <CardHeader title="Shared shopping list" description="Anyone in the group can add or tick off items." />
              <CardContent>
                <ShoppingPanel groupId={group.id} items={shopping} />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'members' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title={`Members (${group.members.length})`} description="Roles: owner, admin, moderator, member." />
                <CardContent>
                  <MembersPanel
                    groupId={group.id}
                    members={group.members}
                    joinRequests={joinRequests}
                    currentUserId={user!.id}
                    myRole={myRole}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Invite people" description="Invite links expire after 14 days and only work once per person." />
                <CardContent>
                  <InvitePanel groupId={group.id} role={myRole} />
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === 'settings' ? (
            <div className="space-y-4">
              {['owner', 'admin'].includes(myRole) ? (
                <Card>
                  <CardHeader title="Group settings" description="Changing visibility affects who can find this group." />
                  <CardContent>
                    <GroupForm
                      groupId={group.id}
                      defaultValues={{
                        name: group.name,
                        description: group.description,
                        kind: group.kind,
                        visibility: group.visibility,
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Alert tone="info">Only the owner and admins can change group settings.</Alert>
              )}

              <Card>
                <CardHeader title="Membership" description={group.ownerId === user!.id ? 'You own this group. Deleting it removes posts, polls and lists for everyone.' : 'Leaving removes your access immediately.'} />
                <CardContent>
                  <LeaveGroupButton groupId={group.id} isOwner={group.ownerId === user!.id} />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      ) : (
        <Alert tone="info">
          Public groups show their member count and description. Join to see posts, polls and the shared list.
        </Alert>
      )}
    </div>
  );
}
