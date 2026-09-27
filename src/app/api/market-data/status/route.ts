import { NextResponse } from 'next/server';
import { getEconomicDataProviderStatus } from '@/lib/providers/economic-data';
import { getEconomicCalendarProviderStatus } from '@/lib/providers/economic-calendar';
import { getConfiguredProviderDescriptors } from '@/lib/market-news/registry';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';

export const dynamic = 'force-dynamic';

function observedNewsStatus(
  configured: boolean,
  state: Awaited<ReturnType<typeof getMarketSystemState>>,
) {
  if (!configured) return 'not_configured' as const;

  const statuses = state.capabilityMatrix
    .filter(cell => cell.capability === 'news' && cell.configured)
    .map(cell => cell.status);

  // Presence of a feed or API key permits an attempt; only an observed
  // successful source may make the combined news service available.
  if (statuses.includes('connected')) return 'available' as const;
  if (statuses.includes('unknown') || statuses.length === 0) return 'unknown' as const;
  if (statuses.includes('rate_limited')) return 'rate_limited' as const;
  if (statuses.includes('degraded')) return 'degraded' as const;
  return 'unavailable' as const;
}

export async function GET() {
  const newsProviders = getConfiguredProviderDescriptors();
  const enabledNewsProviders = newsProviders.filter(provider => provider.enabled && provider.configured);
  // Additive-only field — the new unified market-state view; existing consumers can ignore it.
  const state = await getMarketSystemState();
  const news = {
    configured: enabledNewsProviders.length > 0,
    provider: 'multi-source' as const,
    status: observedNewsStatus(enabledNewsProviders.length > 0, state),
    providerCount: enabledNewsProviders.length,
    independentNetworkCount: new Set(enabledNewsProviders.map(provider => provider.sourceNetworkId || provider.sourceDomain || provider.id)).size,
    officialSourceCount: enabledNewsProviders.filter(provider => provider.officialSource).length,
    providers: newsProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: provider.configured,
      enabled: provider.enabled,
      official: provider.officialSource,
      supportedMarkets: provider.supportedMarkets,
    })),
  };
  const economicCalendar = getEconomicCalendarProviderStatus();
  const economicData = getEconomicDataProviderStatus();

  return NextResponse.json({
    news,
    economicCalendar,
    economicData,
    state: sanitizeMarketSystemStateForPublic(state),
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60',
    },
  });
}
