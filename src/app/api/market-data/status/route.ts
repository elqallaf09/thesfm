import { NextResponse } from 'next/server';
import { getEconomicDataProviderStatus } from '@/lib/providers/economic-data';
import { getEconomicCalendarProviderStatus } from '@/lib/providers/economic-calendar';
import { getConfiguredProviderDescriptors } from '@/lib/market-news/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const newsProviders = getConfiguredProviderDescriptors();
  const enabledNewsProviders = newsProviders.filter(provider => provider.enabled && provider.configured);
  const news = {
    configured: enabledNewsProviders.length > 0,
    provider: 'multi-source' as const,
    status: enabledNewsProviders.length > 0 ? 'available' as const : 'not_configured' as const,
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
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60',
    },
  });
}
