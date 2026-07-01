import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { generateSignalForSymbol, getLatestSignalFromDb } from '@/lib/market/signalService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  const decodedSymbol = decodeURIComponent(symbol ?? '').trim().toUpperCase();
  if (!decodedSymbol) {
    return json({ ok: false, code: 'INVALID_SYMBOL', message: 'Symbol is required.' }, { status: 400 });
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1' || request.nextUrl.searchParams.get('refresh') === 'true';
  const assetType = request.nextUrl.searchParams.get('assetType');
  const admin = createServerSupabaseAdmin();

  if (!forceRefresh) {
    const stored = await getLatestSignalFromDb(admin, decodedSymbol);
    if (stored.ok && stored.signal) {
      return json({ ok: true, source: 'database', signal: stored.signal, item: stored.signal });
    }
  }

  const signal = await generateSignalForSymbol(decodedSymbol, assetType, { forceFresh: forceRefresh });
  return json({
    ok: true,
    source: 'provider-on-demand',
    signal,
    item: signal,
    warning: admin ? undefined : 'Supabase service role is not configured; signal was calculated without persistence.',
  });
}
