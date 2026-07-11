import { NextResponse } from 'next/server';
import { getMarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminJson(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      Vary: 'Cookie, Authorization',
    },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard');
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, auth.status);

  const result = await getMarketNewsAdminProviderStatus(auth.admin);
  const summary = result.providers.reduce((counts, provider) => {
    counts.total += 1;
    if (provider.enabled) counts.enabled += 1;
    if (provider.healthStatus === 'healthy') counts.healthy += 1;
    if (provider.healthStatus === 'degraded') counts.degraded += 1;
    if (provider.healthStatus === 'unhealthy' || provider.healthStatus === 'rate_limited') counts.attention += 1;
    return counts;
  }, { total: 0, enabled: 0, healthy: 0, degraded: 0, attention: 0 });
  // Additive-only field — the new unified market-state view; existing consumers can ignore it.
  const state = await getMarketSystemState();

  return adminJson({
    ok: true,
    available: result.available,
    code: result.available ? null : 'MARKET_NEWS_STATUS_PARTIAL',
    generatedAt: result.generatedAt,
    providers: result.providers,
    summary,
    state,
  });
}
