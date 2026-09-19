import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listMemberDirectory } from '@/features/members/service';
import { Avatar, Badge, Card, CardContent, SectionHeading, VerifiedBadge } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/list';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { USER_TYPES } from '@/lib/enums';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Members' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const q = params.q ?? '';
  const city = params.city ?? '';
  const userType = params.userType ?? 'all';
  const page = Number(params.page ?? 1) || 1;

  const { members, total } = await listMemberDirectory(user.id, { q, city, userType, page });

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Members"
        description="People who chose to have a public profile. Private profiles never appear here."
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        OpenHub never shows email addresses or phone numbers here. To get in touch, send a message — and only if the member allows
        messages.
      </Alert>

      <Card>
        <CardContent className="pt-5">
          <form method="get" action="/members" className="grid gap-3 sm:grid-cols-[1fr_160px_180px_auto]" aria-label="Filter members">
            <Input name="q" defaultValue={q} placeholder="Search by name or username" aria-label="Search members" />
            <Input name="city" defaultValue={city} placeholder="City" aria-label="Filter by city" />
            <Select name="userType" defaultValue={userType} aria-label="Filter by member type">
              <option value="all">All member types</option>
              {USER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {labelize(type)}
                </option>
              ))}
            </Select>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState
              title="No public profiles match"
              description="Try a different city or member type. Members control their own visibility in Settings."
              icon={<Users className="h-8 w-8" aria-hidden="true" />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={member.profile?.displayName ?? member.username} src={member.profile?.avatarUrl} size={44} />
                  <div className="min-w-0">
                    <Link href={`/members/${member.username}`} className="block truncate font-medium text-foreground hover:text-primary">
                      {member.profile?.displayName ?? member.username}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
                  </div>
                </div>
                {member.profile?.bio ? <p className="line-clamp-3 text-sm text-muted-foreground">{member.profile.bio}</p> : null}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {member.profile?.verificationStatus === 'verified' ? <VerifiedBadge /> : null}
                  {member.profile?.showLocation && member.profile?.city ? <Badge tone="neutral">{member.profile.city}</Badge> : null}
                  {member.profile?.userTypes
                    ? member.profile.userTypes
                        .split(',')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((type) => (
                          <Badge key={type} tone="primary">
                            {labelize(type.trim())}
                          </Badge>
                        ))
                    : null}
                </div>
                <Link href={`/members/${member.username}`} className="text-sm font-medium text-primary">
                  View profile
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={24} total={total} basePath="/members" searchParams={{ q, city, userType }} />
    </div>
  );
}
