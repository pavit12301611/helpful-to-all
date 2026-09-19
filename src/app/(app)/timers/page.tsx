import type { Metadata } from 'next';
import { Timer } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { CountdownTimer, PomodoroTimer, Stopwatch } from '@/features/timers/components';
import { SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Timers' };

export default async function TimersPage() {
  await requireUserPage();

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Timers"
        description="Pomodoro blocks, a stopwatch and a countdown. All three run in your browser."
        icon={<Timer className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        Timer state and finished pomodoro blocks are stored in this browser's local storage only — nothing is sent to the server, so
        clearing your browser data also clears them.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <PomodoroTimer />
        <div className="grid gap-6">
          <Stopwatch />
          <CountdownTimer />
        </div>
      </div>
    </div>
  );
}
