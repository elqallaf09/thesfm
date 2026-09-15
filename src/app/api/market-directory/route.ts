import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { loadGlobalDirectory, paginateGlobalDirectory } from '@/lib/server/globalMarketDirectory';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 90, prefix: 'market-directory' });
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const exchange = params.get('exchange') || 'all';
  const country = params.get('country') || 'all';
  if (exchange !== 'all' && !GLOBAL_MARKET_STRIPS.some(strip => strip.id === exchange)) {
    return NextResponse.json({ success: false, error: 'unknown_exchange' }, { status: 400 });
  }
  if (country !== 'all' && !GLOBAL_MARKET_STRIPS.some(strip => strip.countryCode === country)) {
    return NextResponse.json({ success: false, error: 'unknown_country' }, { status: 400 });
  }
  try {
    const { rows, coverage } = await loadGlobalDirectory(exchange, country);
    return NextResponse.json(paginateGlobalDirectory(rows, coverage, params), { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ success: false, error: 'directory_temporarily_unavailable' }, { status: 503 });
  }
}
