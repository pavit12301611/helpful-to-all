import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { requireStaffPage } from '@/server/core/page-guard';
import {
  listAuditLogs,
  listHiddenContent,
  listMembers,
  listModerationHistory,
  listReports,
  listVerificationQueue,
  moderationStats,
} from '@/features/admin/service';
import {
  AuditList,
  HiddenContentList,
  MemberCard,
  MemberFilters,
  ModerationHistoryList,
  ReportCard,
  VerificationList,
} from '@/features/admin/components';
import { Card, CardContent, CardHeader, SectionHeading, Stat } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Pagination, Tabs } from '@/components/ui/list';

export const metadata: Metadata = { title: 'Admin & moderation' };

const TABS = [
  { key: 'queue', label: 'Report queue' },
  { key: 'members', label: 'Members' },
  { key: 'verify', label: 'Verification' },
  { key: 'hidden', label: 'Hidden content' },
  { key: 'audit', label: 'Audit log' },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireStaffPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'queue';
  const page = Number(params.page ?? 1) || 1;

  const stats = await moderationStats();

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Admin & moderation"
        description="Review reports, manage members, verify listings and read the audit trail."
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open reports" value={stats.openReports} tone={stats.openReports > 0 ? 'warning' : 'success'} hint={`${stats.actionedReports} reviewed or actioned`} />
        <Stat label="Members" value={stats.members} hint={`${stats.staff} staff · ${stats.suspended} suspended`} />
        <Stat
          label="Awaiting verification"
          value={stats.unverifiedResources + stats.unverifiedOpportunities + stats.unverifiedCampaigns}
          hint={`${stats.unverifiedResources} resources · ${stats.unverifiedOpportunities} opportunities · ${stats.unverifiedCampaigns} campaigns`}
        />
        <Stat label="Moderation actions" value={stats.moderationActions} hint={`${stats.hiddenHelp} posts and ${stats.hiddenComments} comments hidden`} />
      </div>

      <Alert tone="info">
        Every action taken here is written to the audit log with your account, the target and a timestamp. Moderators can never act
        silently, and members are notified when their content or account is affected.
      </Alert>

      <Tabs tabs={TABS} current={tab} basePath="/admin" searchParams={params} />

      {tab === 'queue' ? (
        <ReportQueue tab={tab} page={page} status={params.status} />
      ) : null}

      {tab === 'members' ? (
        <MembersPanel
          currentUserId={user.id}
          isAdmin={user.role === 'admin'}
          q={params.q ?? ''}
          role={params.role ?? 'all'}
          suspended={params.suspended ?? 'all'}
          page={page}
        />
      ) : null}

      {tab === 'verify' ? <VerificationPanel /> : null}

      {tab === 'hidden' ? <HiddenPanel /> : null}

      {tab === 'audit' ? <AuditPanel page={page} action={params.action} /> : null}
    </div>
  );
}

async function ReportQueue({ tab, page, status }: { tab: string; page: number; status?: string }) {
  const { reports, total } = await listReports({ status, page });

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-5">
          <form method="get" action="/admin" className="flex flex-wrap items-end gap-3" aria-label="Filter reports">
            <input type="hidden" name="tab" value={tab} />
            <label className="grid gap-1">
              <span className="label">Status</span>
              <select name="status" defaultValue={status ?? 'open'} className="input-base appearance-none pr-8">
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All</option>
              </select>
            </label>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted">
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState title="No reports in this queue" description="Reports from members land here for review." icon={<ShieldCheck className="h-8 w-8" aria-hidden="true" />} />
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => <ReportCard key={report.id} report={report} />)
      )}

      <Pagination page={page} pageSize={20} total={total} basePath="/admin" searchParams={{ tab, status }} />
    </div>
  );
}

async function MembersPanel({
  currentUserId,
  isAdmin,
  q,
  role,
  suspended,
  page,
}: {
  currentUserId: string;
  isAdmin: boolean;
  q: string;
  role: string;
  suspended: string;
  page: number;
}) {
  const { members, total } = await listMembers({
    q,
    role,
    suspended: suspended === 'all' ? undefined : suspended === 'suspended',
    page,
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="pt-5">
          <MemberFilters current={{ q, role, suspended }} />
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState title="No members match those filters" description="Try clearing the search or status filter." />
          </CardContent>
        </Card>
      ) : (
        members.map((member) => (
          <MemberCard key={member.id} member={member} isAdmin={isAdmin} isSelf={member.id === currentUserId} />
        ))
      )}

      <Pagination page={page} pageSize={20} total={total} basePath="/admin" searchParams={{ tab: 'members', q, role, suspended }} />
    </div>
  );
}

async function VerificationPanel() {
  const [resources, opportunities, campaigns] = await Promise.all([
    listVerificationQueue('resources'),
    listVerificationQueue('opportunities'),
    listVerificationQueue('campaigns'),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title="Local resources" description="Check the name, address and phone before verifying." />
        <CardContent>
          <VerificationList rows={resources} kind="resource" linkBase="/resources/" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Volunteer opportunities" description="Confirm the organiser and dates are real." />
        <CardContent>
          <VerificationList rows={opportunities} kind="opportunity" linkBase="/volunteer/" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Donation campaigns" description="Verification is not an endorsement — it means the organiser was checked." />
        <CardContent>
          <VerificationList rows={campaigns} kind="campaign" linkBase="/volunteer/campaigns/" />
        </CardContent>
      </Card>
    </div>
  );
}

async function HiddenPanel() {
  const hidden = await listHiddenContent();
  const all = [
    ...hidden.helpRequests,
    ...hidden.comments,
    ...hidden.posts,
    ...hidden.resources,
  ].sort((a, b) => (b.hiddenAt?.getTime() ?? 0) - (a.hiddenAt?.getTime() ?? 0));

  return (
    <Card>
      <CardHeader title="Hidden content" description="Restore anything that was hidden by mistake." />
      <CardContent>
        <HiddenContentList items={all} />
      </CardContent>
    </Card>
  );
}

async function AuditPanel({ page, action }: { page: number; action?: string }) {
  const [{ entries, total }, history] = await Promise.all([listAuditLogs({ page, action }), listModerationHistory(page)]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Audit log" description="Every privileged action, including who did it and when." />
        <CardContent>
          <AuditList entries={entries} />
          <Pagination page={page} pageSize={20} total={total} basePath="/admin" searchParams={{ tab: 'audit', action }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Moderation history" description="Hide, restore, warn, suspend, reinstate and verify actions." />
        <CardContent>
          <ModerationHistoryList actions={history.actions} />
        </CardContent>
      </Card>
    </div>
  );
}
