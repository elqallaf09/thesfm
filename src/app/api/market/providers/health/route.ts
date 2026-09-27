import { NextResponse } from 'next/server';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getMarketSystemState();
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
