'use client';

import * as React from 'react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/feedback';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import {
  changePasswordAction,
  deleteAccountAction,
  exportDataAction,
  updatePreferencesAction,
  updatePrivacyAction,
  updateProfileAction,
} from '@/features/auth/actions';
import { updateNotificationPreferencesAction } from './actions';
import { LOCALES, MESSAGE_PERMISSIONS, PRIVACY_VISIBILITY, THEMES, USER_TYPES } from '@/lib/enums';
import { labelize } from '@/lib/utils';

const NOTIFICATION_TYPES = [
  'message',
  'comment',
  'skill_request',
  'group_invite',
  'join_request',
  'answer',
  'event_reminder',
  'task_reminder',
  'moderation',
  'volunteer_signup',
  'resource_update',
  'system',
];

export type ProfileState = {
  displayName: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  availability: string | null;
  userTypes: string;
  skills: string[];
  interests: string[];
  languages: string[];
};

export function ProfileSettingsForm({ profile }: { profile: ProfileState }) {
  const userTypes = profile.userTypes.split(',').map((value) => value.trim()).filter(Boolean);

  return (
    <Card>
      <CardHeader title="Profile" description="What other members see. Leave anything you do not want to share blank." />
      <CardContent>
        <ServerForm
          action={async (formData) =>
            updateProfileAction({
              displayName: formData.get('displayName'),
              bio: formData.get('bio') ?? '',
              city: formData.get('city') ?? '',
              country: formData.get('country') ?? '',
              website: formData.get('website') ?? '',
              availability: formData.get('availability') ?? '',
              userTypes: formData.getAll('userTypes').map(String),
              skills: String(formData.get('skills') ?? '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
              interests: String(formData.get('interests') ?? '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
              languages: String(formData.get('languages') ?? '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          className="grid gap-3"
          ariaLabel="Update profile"
        >
          {({ errors, pending }) => (
            <>
              <Field label="Display name" name="displayName" error={errors.displayName} required>
                {(props) => <Input {...props} name="displayName" required maxLength={60} defaultValue={profile.displayName} />}
              </Field>
              <Field label="About you" name="bio" error={errors.bio}>
                {(props) => <Textarea {...props} name="bio" rows={3} maxLength={600} defaultValue={profile.bio ?? undefined} />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City" name="city" error={errors.city}>
                  {(props) => <Input {...props} name="city" maxLength={80} defaultValue={profile.city ?? undefined} />}
                </Field>
                <Field label="Country" name="country" error={errors.country}>
                  {(props) => <Input {...props} name="country" maxLength={80} defaultValue={profile.country ?? undefined} />}
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Website" name="website" error={errors.website} hint="Include https://">
                  {(props) => <Input {...props} name="website" maxLength={200} defaultValue={profile.website ?? undefined} />}
                </Field>
                <Field label="Availability" name="availability" error={errors.availability}>
                  {(props) => (
                    <Input {...props} name="availability" maxLength={120} defaultValue={profile.availability ?? undefined} placeholder="Weekends only" />
                  )}
                </Field>
              </div>
              <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <legend className="label">I am a…</legend>
                {USER_TYPES.map((type) => (
                  <Checkbox key={type} id={`userType-${type}`} name="userTypes" value={type} label={labelize(type)} defaultChecked={userTypes.includes(type)} />
                ))}
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Skills (comma separated)" name="skills" error={errors.skills}>
                  {(props) => <Input {...props} name="skills" defaultValue={profile.skills.join(', ')} placeholder="Hindi tutoring, guitar" />}
                </Field>
                <Field label="Interests" name="interests" error={errors.interests}>
                  {(props) => <Input {...props} name="interests" defaultValue={profile.interests.join(', ')} />}
                </Field>
                <Field label="Languages" name="languages" error={errors.languages}>
                  {(props) => <Input {...props} name="languages" defaultValue={profile.languages.join(', ')} />}
                </Field>
              </div>
              <SubmitButton pending={pending} className="justify-self-start">
                Save profile
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export type PrivacyState = {
  profileVisibility: string;
  showLocation: boolean;
  showOnlineStatus: boolean;
  showActivity: boolean;
  searchable: boolean;
  allowMessages: string;
  showGroupMembership: boolean;
};

export function PrivacySettingsForm({ privacy }: { privacy: PrivacyState }) {
  return (
    <Card>
      <CardHeader title="Privacy" description="You decide what is public. Defaults are the private end of each switch." />
      <CardContent>
        <ServerForm
          action={async (formData) =>
            updatePrivacyAction({
              profileVisibility: formData.get('profileVisibility'),
              showLocation: formData.get('showLocation') === 'on',
              showOnlineStatus: formData.get('showOnlineStatus') === 'on',
              showActivity: formData.get('showActivity') === 'on',
              searchable: formData.get('searchable') === 'on',
              allowMessages: formData.get('allowMessages'),
              showGroupMembership: formData.get('showGroupMembership') === 'on',
            })
          }
          className="grid gap-3"
          ariaLabel="Update privacy settings"
        >
          {({ errors, pending }) => (
            <>
              <Field
                label="Who can see my profile"
                name="profileVisibility"
                error={errors.profileVisibility}
                hint="Private means only you and moderators reviewing a report."
              >
                {(props) => (
                  <Select {...props} name="profileVisibility" defaultValue={privacy.profileVisibility}>
                    {PRIVACY_VISIBILITY.map((value) => (
                      <option key={value} value={value}>
                        {labelize(value)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Who can message me" name="allowMessages" error={errors.allowMessages}>
                {(props) => (
                  <Select {...props} name="allowMessages" defaultValue={privacy.allowMessages}>
                    {MESSAGE_PERMISSIONS.map((value) => (
                      <option key={value} value={value}>
                        {value === 'none' ? 'Nobody' : labelize(value)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                <Checkbox name="showLocation" label="Show my city on my profile" defaultChecked={privacy.showLocation} />
                <Checkbox name="showOnlineStatus" label="Show when I am online" defaultChecked={privacy.showOnlineStatus} />
                <Checkbox name="showActivity" label="Show my recent public posts" defaultChecked={privacy.showActivity} />
                <Checkbox name="searchable" label="Let people find me in search" defaultChecked={privacy.searchable} />
                <Checkbox name="showGroupMembership" label="Show my public group memberships" defaultChecked={privacy.showGroupMembership} />
              </div>
              <SubmitButton pending={pending} className="justify-self-start">
                Save privacy settings
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function PreferencesForm({ locale, theme }: { locale: string; theme: string }) {
  return (
    <Card>
      <CardHeader title="Appearance & language" description="Stored on your account, so it follows you between devices." />
      <CardContent>
        <ServerForm
          action={async (formData) => updatePreferencesAction({ locale: formData.get('locale'), theme: formData.get('theme') })}
          className="grid gap-3 sm:grid-cols-2"
          ariaLabel="Update appearance"
        >
          {({ errors, pending }) => (
            <>
              <Field label="Language" name="locale" error={errors.locale}>
                {(props) => (
                  <Select {...props} name="locale" defaultValue={locale}>
                    {LOCALES.map((value) => (
                      <option key={value} value={value}>
                        {value === 'en' ? 'English' : 'हिन्दी'}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Theme" name="theme" error={errors.theme}>
                {(props) => (
                  <Select {...props} name="theme" defaultValue={theme}>
                    {THEMES.map((value) => (
                      <option key={value} value={value}>
                        {labelize(value)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <SubmitButton pending={pending} className="justify-self-start sm:col-span-2">
                Save preferences
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function NotificationSettingsForm({
  inAppEnabled,
  emailEnabled,
  digestMode,
  disabledTypes,
}: {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  digestMode: string;
  disabledTypes: string[];
}) {
  return (
    <Card>
      <CardHeader title="Notifications" description="Choose what reaches you in the app, and whether email is used at all." />
      <CardContent>
        <ServerForm action={updateNotificationPreferencesAction} className="grid gap-3" ariaLabel="Update notification settings">
          {({ errors, pending }) => (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Checkbox name="inAppEnabled" label="In-app notifications" defaultChecked={inAppEnabled} />
                <Checkbox name="emailEnabled" label="Email me (only if an email provider is configured)" defaultChecked={emailEnabled} />
              </div>
              <Field label="Email digest" name="digestMode" error={errors.digestMode}>
                {(props) => (
                  <Select {...props} name="digestMode" defaultValue={digestMode}>
                    <option value="instant">Instant</option>
                    <option value="daily">Daily summary</option>
                    <option value="weekly">Weekly summary</option>
                    <option value="off">No email digest</option>
                  </Select>
                )}
              </Field>
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="label">Mute these notification types</legend>
                {NOTIFICATION_TYPES.map((type) => (
                  <Checkbox
                    key={type}
                    id={`mute-${type}`}
                    name="disabledTypes"
                    value={type}
                    label={labelize(type.replace(/_/g, ' '))}
                    defaultChecked={disabledTypes.includes(type)}
                  />
                ))}
              </fieldset>
              <SubmitButton pending={pending} className="justify-self-start">
                Save notification settings
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs you out of every other device." />
      <CardContent>
        <ServerForm
          action={async (formData) =>
            changePasswordAction({
              currentPassword: formData.get('currentPassword'),
              newPassword: formData.get('newPassword'),
              confirmPassword: formData.get('confirmPassword'),
            })
          }
          className="grid gap-3"
          ariaLabel="Change password"
          resetOnSuccess
        >
          {({ errors, pending }) => (
            <>
              <Field label="Current password" name="currentPassword" error={errors.currentPassword} required>
                {(props) => <Input {...props} name="currentPassword" type="password" autoComplete="current-password" required />}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="New password" name="newPassword" error={errors.newPassword} required hint="At least 8 characters.">
                  {(props) => <Input {...props} name="newPassword" type="password" autoComplete="new-password" required minLength={8} />}
                </Field>
                <Field label="Confirm new password" name="confirmPassword" error={errors.confirmPassword} required>
                  {(props) => <Input {...props} name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />}
                </Field>
              </div>
              <SubmitButton pending={pending} className="justify-self-start">
                Change password
              </SubmitButton>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function DataExportCard() {
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [size, setSize] = React.useState<number | null>(null);

  return (
    <Card>
      <CardHeader title="Your data" description="Download everything OpenHub stores about you as JSON." />
      <CardContent className="grid gap-3">
        <Alert tone="info">
          The export includes your profile, posts, tasks, notes, expenses and moderation history. It never includes other members'
          private data or password hashes.
        </Alert>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await exportDataAction();
                if (result.ok && result.data) {
                  const json = JSON.stringify(result.data.payload, null, 2);
                  setSize(json.length);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'openhub-my-data.json';
                  link.click();
                  URL.revokeObjectURL(url);
                } else {
                  toast.push({ tone: 'danger', title: 'Export failed', description: result.ok ? undefined : result.error });
                }
              })
            }
          >
            Download my data
          </Button>
          {size ? <Badge tone="success">{Math.round(size / 1024)} KB downloaded</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DangerZone({ username }: { username: string }) {
  return (
    <Card>
      <CardHeader title="Delete account" description="This cannot be undone. Your posts are removed and your sessions end." />
      <CardContent>
        <ServerForm
          action={async (formData) =>
            deleteAccountAction({ password: formData.get('password'), confirmText: formData.get('confirmText') })
          }
          className="grid gap-3"
          ariaLabel="Delete account"
        >
          {({ errors, pending }) => (
            <>
              <Alert tone="danger">
                Deleting removes your profile, posts, tasks, notes, expenses and messages. Content other members rely on (answers in
                help threads) is unlinked rather than deleted where the law requires us to keep a record.
              </Alert>
              <Field label="Your password" name="password" error={errors.password} required>
                {(props) => <Input {...props} name="password" type="password" autoComplete="current-password" required />}
              </Field>
              <Field label={`Type DELETE to confirm (account @${username})`} name="confirmText" error={errors.confirmText} required>
                {(props) => <Input {...props} name="confirmText" required placeholder="DELETE" />}
              </Field>
              <span className="justify-self-start">
                <SubmitButton pending={pending} variant="danger">
                  Delete my account
                </SubmitButton>
              </span>
            </>
          )}
        </ServerForm>
      </CardContent>
    </Card>
  );
}

