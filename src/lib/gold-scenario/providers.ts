import 'server-only';

import { createFinancialNewsProviders } from '@/lib/market-news/registry';
import { createRssNewsProvider } from '@/lib/market-news/providers/rss';

function googleNewsSearchUrl(query: string, language: 'en' | 'ar') {
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({
    q: query,
    hl: language === 'ar' ? 'ar' : 'en-US',
    gl: 'US',
    ceid: `US:${language}`,
  }).toString();
  return url.toString();
}

export function createGoldScenarioNewsProviders() {
  const base = createFinancialNewsProviders({ marketCodes: ['GLOBAL', 'US'] })
    .filter(provider => (
      provider.id === 'finnhub'
      || provider.id === 'newsapi'
      || provider.id.startsWith('custom-rss-')
      || provider.id === 'official-federal-reserve-press'
      || provider.id === 'official-federal-reserve-monetary-policy'
      || provider.id === 'rss-google-global-markets'
    ));

  const targeted = (['en', 'ar'] as const).map(language => createRssNewsProvider({
    id: `rss-gold-scenario-global-${language}`,
    name: `Gold scenario global events (${language})`,
    url: googleNewsSearchUrl(
      '(gold OR bullion OR "Federal Reserve" OR "White House" OR tariff OR sanction OR war OR ceasefire OR inflation OR dollar OR oil OR central bank) when:7d',
      language,
    ),
    sourceType: 'public_rss',
    priority: 3,
    reliabilityScore: 0.68,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: ['GLOBAL', 'US'],
    marketCodes: ['GLOBAL', 'US'],
    assetTypes: ['commodity', 'currency', 'bond', 'index'],
    originalLanguage: language,
    revalidateSeconds: 240,
    timeoutMs: 6_000,
  }));

  // Keep provider fan-out bounded. The targeted RSS feed widens discovery while
  // story verification still comes from the aggregation engine.
  return [...base, ...targeted].slice(0, 8);
}
