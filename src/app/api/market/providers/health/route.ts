import { NextResponse } from 'next/server';
import { getProviderHealth } from '@/lib/market/marketDataProviders';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = await getProviderHealth();
  const configured = providers.filter(provider => provider.configured).length;
  const healthy = providers.filter(provider => provider.status === 'healthy').length;
  // Additive-only field — the new unified market-state view; existing consumers can ignore it.
  const state = await getMarketSystemState();

  return NextResponse.json({
    ok: true,
    status: healthy > 0 ? 'available' : configured > 0 ? 'degraded' : 'not_configured',
    configured,
    healthy,
    providers,
    state,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}
