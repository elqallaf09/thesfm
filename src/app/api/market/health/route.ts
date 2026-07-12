import { NextResponse } from 'next/server';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';

export async function GET() {
  const state = await getMarketSystemState();
  const configured = Object.values(state.providers).some(provider => provider?.configured);
  const returnedCapabilities = state.featuresSucceeded.length + state.featuresDegraded.length;
  const available = returnedCapabilities > 0;
  const marketDataService = !configured
    ? 'not_configured'
    : state.overall === 'connected' && !state.delivery?.cached && !state.delivery?.delayed
      ? 'connected'
      : available
        ? 'degraded'
        : 'unavailable';

  return NextResponse.json({
    ok: available,
    code: available ? null : configured ? 'MARKET_DATA_UNAVAILABLE' : 'MARKET_DATA_NOT_CONFIGURED',
    marketDataService,
    activeProbe: false,
    measuredAt: state.generatedAt,
    state: sanitizeMarketSystemStateForPublic(state),
  }, {
    status: available ? 200 : 503,
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  });
}
