import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import {
  filterSignals,
  getLatestSignalsFromDb,
  SIGNAL_REFRESH_UNIVERSE,
  type SignalListFilters,
} from '@/lib/market/signalService';
import type { MarketSignalAction } from '@/lib/market/signalEngine';
import { generateSfmTraderSignals } from '@/lib/sfm-market/traderSignals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-SFM-Market-Source': 'THE SFM Market Data Engine',
      ...(init?.headers ?? {}),
    },
  });
}

function normalizeAction(value: string | null): SignalListFilters['action'] {
  if (
    value === 'buy' ||
    value === 'cautious_buy' ||
    value === 'watch' ||
    value === 'sell_or_avoid' ||
    value === 'insufficient_data' ||
    value === 'sell' ||
    value === 'wait' ||
    value === 'all'
  ) return value;
  return null;
}

function normalizeSymbols(value: string | null) {
  return String(value ?? '')
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function parseFilters(searchParams: URLSearchParams): SignalListFilters & { refresh: boolean } {
  const minConfidence = Number(searchParams.get('minConfidence') ?? searchParams.get('confidence'));
  const requestedLimit = searchParams.get('limit');
  const limit = Number(requestedLimit);
  return {
    market: searchParams.get('market'),
    action: normalizeAction(searchParams.get('action')),
    minConfidence: Number.isFinite(minConfidence) ? minConfidence : null,
    symbols: normalizeSymbols(searchParams.get('symbols')),
    limit: requestedLimit && requestedLimit !== 'all' && Number.isFinite(limit) ? Math.max(1, limit) : undefined,
    refresh: searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true',
  };
}

async function candidateSymbols(filters: SignalListFilters & { refresh: boolean }) {
  if (filters.symbols?.length) return filters.symbols;

  // Stored signals can only seed the symbol shortlist. Their historical
  // price, action, confidence and targets are never returned as SFM evidence.
  // Do not use stale action/confidence filters while choosing candidates.
  if (!filters.refresh) {
    const admin = createServerSupabaseAdmin();
    const shortlistLimit = Math.min(Math.max((filters.limit ?? 8) * 4, 16), 48);
    const stored = await getLatestSignalsFromDb(admin, {
      market: filters.market,
      limit: shortlistLimit,
    });
    if (stored.ok && stored.signals.length) {
      return Array.from(new Set(stored.signals.map(signal => signal.symbol.trim().toUpperCase()).filter(Boolean)))
        .slice(0, shortlistLimit);
    }
  }

  const fallbackLimit = Math.min(Math.max((filters.limit ?? 8) * 4, 16), 48);
  return SIGNAL_REFRESH_UNIVERSE.slice(0, fallbackLimit);
}

export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  const symbols = await candidateSymbols(filters);
  const generated = await generateSfmTraderSignals(symbols, {
    forceFresh: filters.refresh,
    concurrency: 4,
  });
  const signals = filterSignals(generated, {
    ...filters,
    action: filters.action as MarketSignalAction | 'all' | null,
  });

  return json({
    ok: true,
    source: 'sfm-market-data-engine',
    signals,
    items: signals,
    loaded: signals
      .filter(signal => signal.dataQuality !== 'unavailable')
      .map(signal => ({ symbol: signal.symbol, provider: 'THE SFM', reason: 'sfm_evidence_loaded' })),
    failed: signals
      .filter(signal => signal.dataQuality === 'unavailable')
      .map(signal => ({ symbol: signal.symbol, provider: 'THE SFM', reason: signal.warnings?.[0] || 'sfm_evidence_unavailable' })),
    skipped: [],
    provider: 'THE SFM',
    engine: 'THE SFM Market Data Engine',
    reason: signals.length ? null : 'no_sfm_signals_available',
    resultCount: signals.length,
  });
}
