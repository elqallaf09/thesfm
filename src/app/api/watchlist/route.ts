import { NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { parseWatchlistSymbols, watchlistEngine, WATCHLIST_ENGINE_VERSION } from '@/lib/trader/watchlistEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  // Defense in depth: /api/watchlist is also protected by the session/MFA middleware.
  const access = await getTraderAccess();
  if (!access.allowed) return NextResponse.json({ ok: false, code: access.reason }, {
    status: access.reason === 'database_unavailable' ? 503 : access.reason === 'unauthenticated' ? 401 : 403, headers,
  });
  const url = new URL(request.url);
  let symbols: string[];
  try { symbols = parseWatchlistSymbols(url.searchParams.get('symbols')); }
  catch { return NextResponse.json({ ok: false, code: 'INVALID_SYMBOLS', limit: 50 }, { status: 400, headers }); }
  const phase = url.searchParams.get('phase') === 'quotes' ? 'quotes' : 'analysis';
  const limited = rateLimitRequest(request, { max: 60, windowMs: 60_000, prefix: 'watchlist-engine' });
  if (limited) {
    limited.headers.set('Cache-Control', 'private, no-store');
    return limited;
  }
  try {
    const rows = await watchlistEngine.load(symbols, phase);
    const recommendations = rows.filter(row => row.available === true && typeof row.price === 'number' && row.price > 0);
    const unavailable = rows.filter(row => row.available !== true).map(row => ({
      symbol: row.requestedSymbol, name: row.name, reason: row.engine.reason ?? 'provider_unavailable',
    }));
    return NextResponse.json({
      ok: true, engineVersion: WATCHLIST_ENGINE_VERSION, phase, rows, recommendations, unavailable,
      resultCount: recommendations.length, requestedCount: symbols.length,
      status: !symbols.length ? 'empty' : recommendations.length === symbols.length
        && rows.every(row => ['available', 'cached'].includes(row.engine.quoteStatus)) ? 'available'
        : recommendations.length ? 'partial' : 'unavailable',
      // This describes response generation, never the market observation time.
      generatedAt: new Date().toISOString(),
    }, { headers });
  } catch {
    return NextResponse.json({ ok: false, code: 'WATCHLIST_UNAVAILABLE' }, { status: 503, headers: { ...headers, 'Retry-After': '30' } });
  }
}
