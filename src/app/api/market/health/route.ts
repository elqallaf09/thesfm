import { NextResponse } from 'next/server';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';
import { getVerifiedMarketSystemState } from '@/lib/market-state/verifiedState';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { state, activeProbe, waitedForRefresh } = await getVerifiedMarketSystemState();
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
    waitedForRefresh,
    measuredAt: state.generatedAt,
    state: sanitizeMarketSystemStateForPublic(state),
  }, {
    status: available ? 200 : 503,
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  });
}
