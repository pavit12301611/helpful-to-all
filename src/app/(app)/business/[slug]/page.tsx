import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { getPublicBusiness } from '@/features/business/service';
import { PublicBookingForm, PublicServiceList } from '@/features/business/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Business' };

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let business;
  try {
    business = await getPublicBusiness(slug);
  } catch (error) {
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <Alert tone="warning" title="Page unavailable">{error.message}</Alert>
          <Link href="/business" className="link text-sm">
            Back to my business
          </Link>
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title={business.name}
        description={business.description || [business.city, business.country].filter(Boolean).join(', ')}
        action={
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {business.address ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {business.address}
              </span>
            ) : null}
            {business.phone ? (
              <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {business.phone}
              </a>
            ) : null}
            {business.email ? (
              <a href={`mailto:${business.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {business.email}
              </a>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Services and prices" description={business.qrMenuEnabled ? 'Scan the QR code at the counter to see this list on your phone.' : undefined} />
          <CardContent>
            <PublicServiceList services={business.services} currency={business.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Book an appointment"
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            description="The business confirms bookings - this is a request, not a confirmed slot."
          />
          <CardContent>
            <PublicBookingForm slug={business.slug} services={business.services} />
          </CardContent>
        </Card>

        {business.website ? (
          <div className="lg:col-span-2">
            <Card>
              <CardContent>
                <a href={business.website} target="_blank" rel="noreferrer noopener" className="link text-sm">
                  Visit {business.name}&apos;s website
                </a>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <Alert tone="info" title="Community listing">
        Business pages are created by the businesses themselves. OpenHub does not verify prices, availability or service quality.
      </Alert>
    </div>
  );
}
