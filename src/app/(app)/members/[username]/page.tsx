import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, MapPin, MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { currentUser } from '@/server/core/guards';
import { getPublicProfile } from '@/features/members/service';
import { ReportButton, BlockButton } from '@/features/social/components';
import { Avatar, Badge, Card, CardContent, CardHeader, SectionHeading, Stat, VerifiedBadge } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { LinkButton } from '@/components/ui/button';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Member profile' };

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const viewer = await currentUser();
  const { username } = await params;

  const profile = await getPublicProfile(viewer?.id ?? null, username).catch(() => null);
  if (!profile) notFound();

  return (
    <div className="grid gap-6">
      <SectionHeading
        title={profile.displayName}
        description={`@${profile.username} · joined ${profile.joinedAt.toLocaleDateString()}`}
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        action={
          <span className="flex flex-wrap items-center gap-2">
            {profile.verificationStatus === 'verified' ? <VerifiedBadge /> : null}
            <Badge tone="primary">{labelize(profile.role)}</Badge>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <Card>
            <CardContent className="grid gap-4 pt-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={profile.displayName} src={profile.avatarUrl} size={72} />
                <div className="grid gap-1">
                  {profile.city || profile.country ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Location hidden by this member.</p>
                  )}
                  {profile.userTypes ? (
                    <p className="flex flex-wrap gap-1">
                      {profile.userTypes
                        .split(',')
                        .filter(Boolean)
                        .map((type) => (
                          <Badge key={type} tone="neutral">
                            {labelize(type.trim())}
                          </Badge>
                        ))}
                    </p>
                  ) : null}
                  {profile.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" aria-hidden="true" /> Website
                    </a>
                  ) : null}
                </div>
              </div>

              {profile.bio ? <p className="text-sm text-foreground">{profile.bio}</p> : null}
              {profile.availability ? (
                <p className="text-sm text-muted-foreground">Availability: {profile.availability}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {profile.isSelf ? (
                  <LinkButton href="/settings" variant="outline" size="sm">
                    Edit my profile
                  </LinkButton>
                ) : profile.allowMessages === 'none' ? (
                  <Badge tone="neutral">Messages closed</Badge>
                ) : (
                  <LinkButton href="/messages" variant="primary" size="sm">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" /> Message {profile.displayName.split(' ')[0]}
                  </LinkButton>
                )}
                {!profile.isSelf ? <ReportButton targetType="user" targetId={profile.id} /> : null}
                {!profile.isSelf ? <BlockButton blockedId={profile.id} name={profile.displayName} /> : null}
              </div>
            </CardContent>
          </Card>

          {profile.skillOffers.length > 0 ? (
            <Card>
              <CardHeader title="Teaching" description="Skills this member offered to share." />
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {profile.skillOffers.map((offer) => (
                    <li key={offer.id}>
                      <Link href={`/skills/${offer.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary">
                        <span className="truncate text-foreground">{offer.skill.name}</span>
                        <Badge tone="primary">{offer.priceMode === 'exchange' ? 'exchange' : labelize(offer.priceMode)}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {profile.recentHelp.length > 0 ? (
            <Card>
              <CardHeader title="Recent help posts" description="Public posts this member created." />
              <CardContent>
                <ul className="divide-y divide-border">
                  {profile.recentHelp.map((post) => (
                    <li key={post.id} className="flex items-start justify-between gap-3 py-3">
                      <Link href={`/help/${post.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground hover:text-primary">{post.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {labelize(post.category)} · {post.createdAt.toLocaleDateString()}
                        </span>
                      </Link>
                      <Badge tone={post.urgency === 'urgent' ? 'danger' : 'neutral'}>{post.urgency}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {profile.groups.length > 0 ? (
            <Card>
              <CardHeader title="Public groups" description="Groups this member chose to show." />
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {profile.groups.map((membership) => (
                    <li key={membership.id}>
                      <Link href={`/groups/${membership.group.slug}`} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary">
                        <span className="truncate text-foreground">{membership.group.name}</span>
                        <Badge tone="neutral">{labelize(membership.group.kind)}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4">
            <Stat label="Helpfulness" value={profile.helpfulnessScore} icon={<Star className="h-4 w-4 text-warning" aria-hidden="true" />} hint="Earned from accepted answers" />
            <Stat label="Questions asked" value={profile.stats.helpCount} />
            <Stat label="Answers given" value={profile.stats.answerCount} />
            <Stat label="Study resources shared" value={profile.stats.resourceCount} />
          </div>

          <Card>
            <CardHeader title="What is not shown here" />
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              <p>Email addresses, phone numbers and exact locations are never published.</p>
              <p>Private notes, private help posts and private group activity stay hidden.</p>
              <p>
                Something wrong? <span className="text-foreground">Report this profile</span> and a moderator reviews it. Every
                moderation step is logged.
              </p>
            </CardContent>
          </Card>

          {profile.isBlocked ? (
            <Alert tone="warning">You have blocked this member. Unblock them from the button above to interact again.</Alert>
          ) : null}

          {profile.recentHelp.length === 0 && profile.skillOffers.length === 0 ? (
            <Card>
              <CardContent className="py-5">
                <EmptyState title="Not much here yet" description="This member keeps a low profile for now." />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
