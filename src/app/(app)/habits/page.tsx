import type { Metadata } from 'next';
import { Repeat } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listHabits } from '@/features/habits/service';
import { HabitCard, HabitForm } from '@/features/habits/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Habits' };

export default async function HabitsPage() {
  const user = await requireUserPage();
  const habits = await listHabits(user.id);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Habits"
        description="Small, repeated actions. Streaks reset if you miss a day - that is normal."
      />

      <Card>
        <CardHeader title="New habit" icon={<Repeat className="h-5 w-5" aria-hidden="true" />} />
        <CardContent>
          <HabitForm />
        </CardContent>
      </Card>

      {habits.length === 0 ? (
        <EmptyState title="No habits yet" description="Start with one small habit, like drinking water every morning." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}
    </div>
  );
}
