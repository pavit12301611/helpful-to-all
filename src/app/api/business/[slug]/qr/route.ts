import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getDb } from '@/server/db/client';
import { appUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * QR code for a public business page.
 *
 * The code only encodes the public URL - no tokens, no user data - so it is safe
 * to cache and print.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();

  const business = await db.businessProfile.findFirst({ where: { slug, published: true }, select: { slug: true } });
  if (!business) {
    return NextResponse.json({ error: 'Business page not found.' }, { status: 404 });
  }

  const target = `${appUrl()}/business/${business.slug}`;
  const png = await QRCode.toBuffer(target, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#111827', light: '#ffffff' },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${business.slug}-qr.png"`,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
