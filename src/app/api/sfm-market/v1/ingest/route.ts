import { NextRequest, NextResponse } from 'next/server';
import { SIGNAL_REFRESH_UNIVERSE } from '@/lib/market/signalService';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { persistSfmMarketQuoteObservation } from '@/lib/sfm-market/store';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ADMIN_API_POLICY_EXCEPTION: cron-or-admin-sfm-market-ingest

const MAX_SYMBOLS_PER_RUN = 60;
const INGEST_CONCURRENCY = 4;

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

function cronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.SFM_MARKET_INGEST_SECRET?.trim() || '';
}

function hasCronAccess(request: NextRequest) {
  const expected = cronSecret();
  if (!expected) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return bearer === expected || headerSecret === expected;
}

function normalizeSymbols(value: unknown) {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return Array.from(new Set(raw
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean)))
    .slice(0, MAX_SYMBOLS_PER_RUN);
}

async function ingest(symbols: string[], forceFresh: boolean) {
  const results: Array<Record<string, unknown>> = [];
  for (let cursor = 0; cursor < symbols.length; cursor += INGEST_CONCURRENCY) {
    const batch = symbols.slice(cursor, cursor + INGEST_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async symbol => {
      const quote = await getSfmMarketQuote(symbol, { forceFresh });
      if (!quote) return { symbol, ok: false, reason: 'sfm_quote_unavailable' };
      const stored = await persistSfmMarketQuoteObservation(quote);
      return {
        symbol: quote.symbol,
        ok: stored.ok,
        inserted: stored.inserted,
        duplicate: stored.duplicate,
        reason: stored.reason,
        quality: quote.quality.state,
        sourceClass: quote.provenance.sourceClass,
        upstreamProvider: quote.provenance.upstreamProvider,
        observedAt: quote.provenance.observedAt,
        evidenceHash: stored.evidenceHash,
      };
    }));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') results.push(result.value);
      else results.push({
        symbol: batch[index] ?? 'UNKNOWN',
        ok: false,
        reason: 'ingest_exception',
      });
    });
  }
  return results;
}

async function run(request: NextRequest, symbols: string[], forceFresh: boolean) {
  const results = await ingest(symbols, forceFresh);
  const inserted = results.filter(item => item.inserted === true).length;
  const duplicates = results.filter(item => item.duplicate === true).length;
  const failed = results.filter(item => item.ok !== true).length;
  return json({
    ok: failed === 0,
    engine: 'THE SFM Market Data Engine',
    source: 'sfm-market-data-engine',
    requested: symbols.length,
    inserted,
    duplicates,
    failed,
    results,
    generatedAt: new Date().toISOString(),
  }, { status: failed === symbols.length && symbols.length > 0 ? 503 : 200 });
}

export async function POST(request: NextRequest) {
  const cronAllowed = hasCronAccess(request);
  if (!cronAllowed) {
    const auth = await requireAdminApiAccess(request);
    if (!auth.ok) return json({ ok: false, code: auth.code }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requested = normalizeSymbols(body.symbols);
  const symbols = requested.length ? requested : normalizeSymbols(SIGNAL_REFRESH_UNIVERSE);
  const forceFresh = body.forceFresh === true || body.refresh === true;
  return run(request, symbols, forceFresh);
}

export async function GET(request: NextRequest) {
  if (!hasCronAccess(request)) {
    return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const requested = normalizeSymbols(request.nextUrl.searchParams.get('symbols'));
  const symbols = requested.length ? requested : normalizeSymbols(SIGNAL_REFRESH_UNIVERSE);
  return run(request, symbols, true);
}
