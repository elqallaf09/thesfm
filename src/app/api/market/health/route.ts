import { NextResponse } from 'next/server';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';

export const dynamic = 'force-dynamic';

export async function GET() {
  let state = await getMarketSystemState();
  let activeProbe = false;

  // A cold serverless instance can briefly miss both the shared snapshot and
  // the refresh lease. Do not cache that absence as "not configured" when the
  // deployment may have healthy providers. Probe once to establish the real
  // state; normal requests continue to use the bounded shared snapshot.
  if (state.capabilityMatrix.length === 0 && Object.keys(state.providers).length === 0) {
    state = await getMarketSystemState({ forceFresh: true });
    activeProbe = true;
  }
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
    activeProbe,
    measuredAt: state.generatedAt,
    state: sanitizeMarketSystemStateForPublic(state),
  }, {
    status: available ? 200 : 503,
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  });
}
