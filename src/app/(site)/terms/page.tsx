import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-12">
      <SectionHeading title="Terms of use" description="The baseline terms for OpenHub software and any instance running it." />

      <Alert tone="warning">
        This is not legal advice. If you operate an OpenHub instance for other people, have your own terms reviewed for your
        jurisdiction.
      </Alert>

      <Card>
        <CardHeader title="1. The software" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            OpenHub is free software released under the GNU Affero General Public License 3.0. You may run it, study it, modify it and
            share it, provided you pass on the same freedoms and disclose your changes. Full text is in the LICENSE file in the
            repository.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="2. Running an instance" />
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>You are responsible for the accounts, content and moderation on your instance.</li>
            <li>You must publish contact details so members can reach an administrator.</li>
            <li>You must comply with the data protection and consumer laws that apply to you.</li>
            <li>You should keep the community guidelines and privacy pages accurate for your deployment.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="3. Member responsibilities" />
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>Keep your password secret. Activity under your account is treated as yours.</li>
            <li>Only post content you have the right to share.</li>
            <li>Do not use OpenHub for anything illegal, harmful or deceptive.</li>
            <li>Do not attempt to access other members' private data or interfere with the service.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="4. No professional advice" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Content shared by members may concern health, law or money. It is shared experience, not professional advice, and
            OpenHub does not present it as fact. Always confirm important decisions with a qualified professional or an official
            source.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="5. Safety and emergencies" />
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>The safety hub is an information directory. It never contacts emergency services and is not a replacement for them.</li>
            <li>Emergency numbers are community-contributed and may be out of date. Verify before you rely on them.</li>
            <li>Missing person reports are not an official report to the police. Contact the authorities yourself.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="6. Donations and money" />
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>OpenHub does not process payments and takes no share of anything given.</li>
            <li>Verification of a campaign means a moderator checked the organiser's details — it is not a guarantee.</li>
            <li>You are responsible for your own decision to give money or goods.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="7. Accounts and termination" />
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>You can delete your account at any time from Settings.</li>
            <li>Instance operators may suspend or remove accounts that break the guidelines.</li>
            <li>Suspension is reversible by a moderator; deletion is not.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="8. Disclaimer and liability" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The software is provided "as is", without warranty of any kind. To the extent permitted by law, the authors are not
            liable for loss arising from its use. Instance operators are responsible for their own availability, backups and
            compliance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
