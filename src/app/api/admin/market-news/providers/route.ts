import { getMarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 60, windowMs: 60_000, prefix: 'admin-market-news-providers' },
}, async ({ auth, json }) => {
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

  return json({
    ok: true,
    available: result.available,
    code: result.available ? null : 'MARKET_NEWS_STATUS_PARTIAL',
    generatedAt: result.generatedAt,
    providers: result.providers,
    summary,
    state,
  });
});
