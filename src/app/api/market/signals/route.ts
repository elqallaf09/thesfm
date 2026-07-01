import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import {
  filterSignals,
  generateSignalsForUniverse,
  getLatestSignalsFromDb,
  SIGNAL_REFRESH_UNIVERSE,
  type SignalListFilters,
} from '@/lib/market/signalService';
import type { MarketSignalAction } from '@/lib/market/signalEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function normalizeAction(value: string | null): SignalListFilters['action'] {
  if (value === 'buy' || value === 'sell' || value === 'wait' || value === 'watch' || value === 'all') return value;
  return null;
}

function normalizeSymbols(value: string | null) {
  return String(value ?? '')
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 60);
}

function parseFilters(searchParams: URLSearchParams): SignalListFilters & { refresh: boolean } {
  const minConfidence = Number(searchParams.get('minConfidence') ?? searchParams.get('confidence'));
  const limit = Number(searchParams.get('limit'));
  return {
    market: searchParams.get('market'),
    action: normalizeAction(searchParams.get('action')),
    minConfidence: Number.isFinite(minConfidence) ? minConfidence : null,
    symbols: normalizeSymbols(searchParams.get('symbols')),
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 30,
    refresh: searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true',
  };
}

export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  const admin = createServerSupabaseAdmin();

  if (!filters.refresh) {
    const stored = await getLatestSignalsFromDb(admin, filters);
    if (stored.ok && stored.signals.length > 0) {
      return json({
        ok: true,
        source: 'database',
        signals: stored.signals,
        items: stored.signals,
      });
    }
  }

  const universe = filters.symbols?.length ? filters.symbols : SIGNAL_REFRESH_UNIVERSE;
  const generated = await generateSignalsForUniverse(universe, {
    forceFresh: filters.refresh,
    concurrency: 4,
  });
  const signals = filterSignals(generated, {
    ...filters,
    action: filters.action as MarketSignalAction | 'all' | null,
  });

  return json({
    ok: true,
    source: 'provider-on-demand',
    signals,
    items: signals,
    warning: admin ? undefined : 'Supabase service role is not configured; signals were calculated without persistence.',
  });
}
