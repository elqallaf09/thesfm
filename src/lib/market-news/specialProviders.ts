import 'server-only';

import { createFinancialNewsProviders } from './registry';
import { createRssNewsProvider } from './providers/rss';
import { TOPICS, type TopicId } from './specialTopics';
import {
  IPO_REGIONS,
  ipoEditionFeedUrl,
  ipoGlobalPublisherFeedUrl,
  ipoRegionalPublisherFeedUrl,
  isIpoTopic,
  type IpoTopicId,
} from './ipoRegions';

// Search the topic at the source. Filtering an index/central-bank feed locally
// cannot recover company news that the feed never contained.
export function specialNewsFeedUrl(topic: TopicId, language: 'en' | 'ar') {
  const config = TOPICS[topic];
  const market = topic === 'metals-news' || topic === 'federal-reserve'
    ? ''
    : ' (Nasdaq OR NYSE OR "US stocks" OR "Wall Street" OR ناسداك OR الأمريكية)';
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({
    q: `(${config.query})${market} when:${config.days}d`,
    hl: language === 'ar' ? 'ar' : 'en-US',
    gl: 'US',
    ceid: `US:${language}`,
  }).toString();
  return url.toString();
}

function googleRss(id: string, name: string, url: string, marketCodes: string[], language: string, reliabilityScore: number) {
  return createRssNewsProvider({
    id, name, url,
    sourceType: 'public_rss',
    priority: 3,
    reliabilityScore,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: marketCodes,
    marketCodes,
    // The RSS parser keeps each item's real publisher; nothing is assigned
    // from the search terms.
    originalLanguage: language,
    revalidateSeconds: 300,
    timeoutMs: 6_000,
  });
}

// Regional IPO coverage draws on several independent references at once:
// each regional edition, region-specialist outlets, global wires scoped to the
// region's venues, and first-party exchange/regulator feeds when available.
function createIpoNewsProviders(topic: IpoTopicId) {
  const region = IPO_REGIONS[topic];
  const { marketCodes } = region;
  const editions = region.editions.map(edition => googleRss(
    `rss-ipo-${topic}-${edition.country.toLowerCase()}-${edition.language}`,
    `Google News — ${topic} (${edition.country}/${edition.language})`,
    ipoEditionFeedUrl(topic, edition), marketCodes, edition.language, 0.65,
  ));
  const publishers = [
    googleRss(`rss-ipo-${topic}-regional-publishers`, `Specialist publishers — ${topic}`,
      ipoRegionalPublisherFeedUrl(topic), marketCodes, region.editions[0].language, 0.72),
    googleRss(`rss-ipo-${topic}-global-wires`, `Global wires — ${topic}`,
      ipoGlobalPublisherFeedUrl(topic), marketCodes, 'en', 0.75),
  ];
  const official = region.registryProviderPrefixes.length === 0 ? [] : createFinancialNewsProviders({ marketCodes })
    .filter(provider => region.registryProviderPrefixes.some(prefix => provider.id.startsWith(prefix)));
  const keyed = topic === 'ipo-us-news'
    ? createFinancialNewsProviders({ marketCodes }).filter(provider => provider.id === 'finnhub' || provider.id === 'newsapi')
    : [];
  return [...official, ...publishers, ...editions, ...keyed].slice(0, 12);
}

export function createSpecialNewsProviders(topic: TopicId) {
  if (isIpoTopic(topic)) return createIpoNewsProviders(topic);
  const marketCodes = topic === 'metals-news' ? ['GLOBAL'] : ['US'];
  const targeted = (['en', 'ar'] as const).map(language => createRssNewsProvider({
    id: `rss-special-${topic}-${language}`,
    name: `Google News — ${topic} (${language})`,
    url: specialNewsFeedUrl(topic, language),
    sourceType: 'public_rss',
    priority: 3,
    reliabilityScore: 0.65,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: marketCodes,
    marketCodes,
    // No company/symbol is assigned from the search terms. The article must
    // supply its own identity; the RSS parser preserves the actual publisher.
    originalLanguage: language,
    revalidateSeconds: 300,
    timeoutMs: 6_000,
  }));
  const existing = createFinancialNewsProviders({ marketCodes }).filter(provider =>
    provider.id === 'finnhub' || provider.id === 'newsapi'
    || provider.id.startsWith('custom-rss-')
    || (topic === 'federal-reserve' && provider.id === 'official-federal-reserve-monetary-policy'),
  );
  return [...targeted, ...existing].slice(0, 6);
}
