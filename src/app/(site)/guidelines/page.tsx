import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Community guidelines' };

const SECTIONS = [
  {
    title: 'The short version',
    body: [
      'Be useful, be kind, and do not put anyone at risk.',
      'Do not post other people’s personal details — no addresses, phone numbers, medical records or photos of people who did not agree.',
      'Report anything that looks like a scam, harassment or a safety risk. A moderator reviews every report.',
    ],
  },
  {
    title: 'What belongs where',
    body: [
      'Community help is for questions, requests and offers. Pick the category and urgency honestly so people see what matters.',
      'Groups are for the people you invited. Do not use a private group as a public noticeboard.',
      'Student resources must be things you have the right to share. Uploading someone else’s paid textbook, exam paper or lecture recording is a copyright violation and will be removed.',
      'The local directory is for services the public can use. Add real opening hours and never list a home as a public service.',
      'Skill exchange is about swapping knowledge. Do not post job adverts or paid work listings.',
    ],
  },
  {
    title: 'Medical, legal and financial topics',
    body: [
      'Members are not professionals by default, and OpenHub does not present their answers as professional advice.',
      'Do not diagnose, prescribe, tell someone to stop medication, or give legal or investment instructions as fact.',
      'Share experience, signpost to official sources, and say plainly that you are not qualified.',
      'If someone is in danger, tell them to contact official emergency services.',
    ],
  },
  {
    title: 'Money, donations and scams',
    body: [
      'OpenHub does not process payments. Nothing here is an endorsement of a fundraiser.',
      'Verify a campaign independently before sending money or goods: talk to the organiser, ask for proof, prefer giving goods locally.',
      'Never send money to someone you only know through a message thread, and never share bank details, OTPs or passwords.',
      'Report suspected scams immediately — moderators can hide the post and warn the community.',
    ],
  },
  {
    title: 'Privacy and safety',
    body: [
      'Post the minimum personal detail that solves the problem. A landmark is better than an address.',
      'Do not publish anyone’s contact details, even if you believe they are already public.',
      'Do not share photos of children, patients, or people in distress.',
      'Use the block and report tools. Blocking hides you from that person immediately.',
    ],
  },
  {
    title: 'How moderation works',
    body: [
      'Anyone can report content: spam, harassment, misinformation, copyright problems, scams, or anything else.',
      'Moderators can hide content, lock a discussion, warn a member, suspend an account, or verify a listing.',
      'Content is hidden rather than deleted, so a mistake can be reversed.',
      'Every moderation action is written to an audit log with the moderator, the target and a timestamp. Nothing happens silently.',
      'You can appeal: reply to the notification you receive, or contact your instance administrators.',
    ],
  },
  {
    title: 'Enforcement',
    body: [
      'First, a warning explaining which rule was broken.',
      'Repeated or serious breaches lead to temporary or permanent suspension.',
      'Illegal content is removed and may be reported to the authorities where the law requires it.',
      'Each self-hosted instance sets its own moderators. This document is the baseline every OpenHub instance starts from.',
    ],
  },
];

export default function GuidelinesPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-12">
      <SectionHeading
        title="Community guidelines"
        description="The rules every OpenHub instance starts with. Instance administrators can add local rules, but they cannot remove these."
      />

      <Alert tone="info">
        These guidelines exist to keep help useful and people safe. They apply to posts, comments, messages, listings and uploads.
      </Alert>

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader title={section.title} />
          <CardContent>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-5 text-sm text-muted-foreground">
          Last reviewed for the initial OpenHub release. If you run an instance, keep this page updated with your own contact details
          and local legal requirements.
        </CardContent>
      </Card>
    </div>
  );
}
