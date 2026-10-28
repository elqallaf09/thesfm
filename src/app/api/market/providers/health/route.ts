import { NextResponse } from 'next/server';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let state = await getMarketSystemState();
  let activeProbe = false;

  // A cold serverless instance can briefly miss both the shared snapshot and
  // the refresh lease. Verify that empty state once before publishing a false
  // provider outage to operational clients.
  if (state.capabilityMatrix.length === 0 && Object.keys(state.providers).length === 0) {
    state = await getMarketSystemState({ forceFresh: true });
    activeProbe = true;
  }
  const publicState = sanitizeMarketSystemStateForPublic(state);
  const providers = publicState.providerProfiles.map(profile => ({
    provider: profile.provider,
    displayName: traderProviderDisplayName(profile.provider) ?? profile.provider,
    configured: profile.configured,
    status: profile.status,
    latencyMs: profile.latencyMs,
    lastCheckedAt: profile.lastSuccessAt ?? profile.lastErrorAt ?? publicState.generatedAt,
  }));
  const configured = providers.filter(provider => provider.configured).length;
  const healthy = providers.filter(provider => provider.status === 'connected').length;

  return NextResponse.json({
    ok: true,
    status: publicState.overall,
    activeProbe,
    configured,
    healthy,
    providers,
    state: publicState,
    generatedAt: publicState.generatedAt,
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}
