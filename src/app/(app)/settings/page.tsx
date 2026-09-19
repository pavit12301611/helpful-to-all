import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { getPreferences } from '@/server/services/notifications';
import {
  DangerZone,
  DataExportCard,
  NotificationSettingsForm,
  PasswordForm,
  PreferencesForm,
  PrivacySettingsForm,
  ProfileSettingsForm,
} from '@/features/settings/components';
import { Card, CardContent, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';

export const metadata: Metadata = { title: 'Settings' };

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'security', label: 'Security & data' },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'profile';

  const db = await getDb();
  const [profile, tags, preferences] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.userTag.findMany({ where: { userId: user.id }, include: { tag: true } }),
    getPreferences(user.id),
  ]);

  const tagLabels = (kind: string) => tags.filter((link) => link.tag.kind === kind).map((link) => link.tag.label);

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Settings"
        description="Your profile, privacy, notifications, appearance and data."
        icon={<Settings className="h-5 w-5" aria-hidden="true" />}
      />

      <Tabs tabs={TABS} current={tab} basePath="/settings" searchParams={params} />

      {tab === 'profile' ? (
        <ProfileSettingsForm
          profile={{
            displayName: profile?.displayName ?? user.username,
            bio: profile?.bio ?? null,
            city: profile?.city ?? null,
            country: profile?.country ?? null,
            website: profile?.website ?? null,
            availability: profile?.availability ?? null,
            userTypes: profile?.userTypes ?? '',
            skills: tagLabels('skill'),
            interests: tagLabels('interest'),
            languages: tagLabels('language'),
          }}
        />
      ) : null}

      {tab === 'privacy' ? (
        <div className="grid gap-4">
          <PrivacySettingsForm
            privacy={{
              profileVisibility: profile?.profileVisibility ?? 'community',
              showLocation: profile?.showLocation ?? false,
              showOnlineStatus: profile?.showOnlineStatus ?? false,
              showActivity: profile?.showActivity ?? true,
              searchable: profile?.searchable ?? true,
              allowMessages: profile?.allowMessages ?? 'everyone',
              showGroupMembership: profile?.showGroupMembership ?? true,
            }}
          />
          <Card>
            <CardContent className="grid gap-2 py-5 text-sm text-muted-foreground">
              <p>
                OpenHub never sells or shares your data. There is no advertising and no third-party analytics in the default
                deployment.
              </p>
              <p>
                Exact addresses are never published: local resources show a street-level address, and member profiles show at most a
                city.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <NotificationSettingsForm
          inAppEnabled={preferences.inAppEnabled}
          emailEnabled={preferences.emailEnabled}
          digestMode={preferences.digestMode}
          disabledTypes={preferences.disabledTypes.split(',').filter(Boolean)}
        />
      ) : null}

      {tab === 'appearance' ? <PreferencesForm locale={user.locale} theme={user.theme} /> : null}

      {tab === 'security' ? (
        <div className="grid gap-4">
          <Alert tone="info">
            Passwords are hashed with scrypt and never stored in plain text. Sessions expire after{' '}
            {process.env.SESSION_TTL_DAYS ?? 30} days.
          </Alert>
          <PasswordForm />
          <DataExportCard />
          <DangerZone username={user.username} />
        </div>
      ) : null}
    </div>
  );
}
