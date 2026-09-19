import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Optional currency rate lookup.
 *
 * Core OpenHub never depends on this: the currency tool ships with a reference
 * table and accepts a rate typed by the user. If a deployment sets
 * CURRENCY_API_KEY this endpoint proxies the provider so the browser never
 * holds the key.
 */

const querySchema = z.object({
  from: z.string().trim().length(3).toUpperCase(),
  to: z.string().trim().length(3).toUpperCase(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    await enforceRateLimit('search', url.searchParams.get('from') ?? 'anon');
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }
    throw error;
  }

  const parsed = querySchema.safeParse({
    from: url.searchParams.get('from') ?? '',
    to: url.searchParams.get('to') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Use three-letter currency codes.' }, { status: 400 });
  }

  if (!env().CURRENCY_API_KEY) {
    return NextResponse.json(
      { error: 'No currency API key is configured. Enter the rate yourself in the converter.' },
      { status: 501 },
    );
  }

  const endpoint = `https://api.currencyapi.com/v3/latest?apikey=${encodeURIComponent(env().CURRENCY_API_KEY!)}&currencies=${parsed.data.to}&base_currency=${parsed.data.from}`;
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) {
    return NextResponse.json({ error: 'The currency provider rejected the request.' }, { status: 502 });
  }

  const payload = (await response.json()) as { data?: Record<string, { value?: number }> };
  const rate = payload.data?.[parsed.data.to]?.value;
  if (typeof rate !== 'number') {
    return NextResponse.json({ error: 'The provider did not return that pair.' }, { status: 502 });
  }

  return NextResponse.json({ from: parsed.data.from, to: parsed.data.to, rate });
}
