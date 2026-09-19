import { NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Generates a QR code PNG for text supplied by the visitor.
 *
 * The text is never stored: it is encoded and returned as an image, so the
 * utility-tools promise of "nothing is written to the server" still holds.
 */

const querySchema = z.object({
  text: z.string().trim().min(1, 'Add something to encode.').max(1000),
  size: z.coerce.number().int().min(128).max(1024).default(384),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    await enforceRateLimit('create', `tools-qr:${url.searchParams.get('text')?.slice(0, 32) ?? 'anon'}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many QR codes just now. Try again in a minute.' }, { status: 429 });
    }
    throw error;
  }

  const parsed = querySchema.safeParse({
    text: url.searchParams.get('text') ?? '',
    size: url.searchParams.get('size') ?? '384',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const png = await QRCode.toBuffer(parsed.data.text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: parsed.data.size,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="qrcode.png"',
      'Cache-Control': 'no-store',
    },
  });
}
