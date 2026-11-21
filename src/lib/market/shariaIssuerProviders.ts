import 'server-only';
import { createFinancialNewsProviders } from '@/lib/market-news/registry';
import { createRssNewsProvider } from '@/lib/market-news/providers/rss';
import type { NewsFetchParams } from '@/lib/market-news/types';
import { shariahUniverseIdentity } from './shariahUniverseIdentity';

// These are news sources. Eligibility comes from the current screening catalog.
const issuerFeeds = [
  { symbol: 'AAPL', publisher: 'Apple Newsroom', url: 'https://www.apple.com/newsroom/rss-feed.rss' },
  { symbol: 'JNJ', publisher: 'Johnson & Johnson', url: 'https://www.jnj.com/rss-feed/all' },
];

export function shariaIssuerProviders(params: NewsFetchParams) {
  const issuers = issuerFeeds.flatMap(feed => {
    const issuer = shariahUniverseIdentity(feed.symbol);
    if (!issuer || !params.symbols?.includes(issuer.symbol)) return [];
    return [createRssNewsProvider({
      id: 'issuer-' + issuer.symbol.toLowerCase(), name: feed.publisher, url: feed.url,
      sourceType: 'corporate_press_release', officialSource: true, priority: 1, reliabilityScore: 0.95,
      supportedMarkets: ['US'], marketCodes: ['US'], countries: ['US'], exchangeCodes: [issuer.exchange],
      assetTypes: ['equity'], symbols: [issuer.symbol], companyNames: [issuer.name],
      originalLanguage: 'en', timeoutMs: 4000,
    })];
  });
  return [...issuers, ...createFinancialNewsProviders(params)];
}
