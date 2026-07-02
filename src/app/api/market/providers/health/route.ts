import { NextResponse } from 'next/server';
import { getProviderHealth } from '@/lib/market/marketDataProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = await getProviderHealth();
  const configured = providers.filter(provider => provider.configured).length;
  const healthy = providers.filter(provider => provider.status === 'healthy').length;

  return NextResponse.json({
    ok: true,
    status: healthy > 0 ? 'available' : configured > 0 ? 'degraded' : 'not_configured',
    configured,
    healthy,
    providers,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}
