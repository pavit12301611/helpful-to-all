import type { Metadata } from 'next';
import { Luggage } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listTrips } from '@/features/trips/service';
import { TripEmpty, TripForm, TripList } from '@/features/trips/components';
import { Card, CardContent, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';

export const metadata: Metadata = { title: 'Trip planner' };

export default async function TripsPage() {
  const user = await requireUserPage();
  const trips = await listTrips(user.id);

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Trip planner"
        description="Plan trips together: itinerary, packing list, shared budget with fair splits, and quick polls."
        icon={<Luggage className="h-5 w-5" aria-hidden="true" />}
      />

      <Alert tone="info">
        Trip expenses also appear on your Expenses page so your personal budget stays complete. A trip is private to its
        travellers unless you set it to be visible to all members, and contact details you add are never shown publicly.
      </Alert>

      {trips.length === 0 ? (
        <Card>
          <CardContent>
            <TripEmpty />
          </CardContent>
        </Card>
      ) : (
        <TripList trips={trips} />
      )}

      <TripForm />
    </div>
  );
}
