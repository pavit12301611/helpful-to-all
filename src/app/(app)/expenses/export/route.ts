import { NextResponse } from 'next/server';
import { requireUser } from '@/server/core/guards';
import { currentMonth, exportExpenses } from '@/features/expenses/service';
import { errorMessage } from '@/lib/errors';

/**
 * GET /expenses/export?month=YYYY-MM
 * Streams the caller's own expenses as CSV. Nothing is stored on the server.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const month = new URL(request.url).searchParams.get('month') ?? currentMonth();
    const csv = await exportExpenses(user.id, month);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="openhub-expenses-${month}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}
