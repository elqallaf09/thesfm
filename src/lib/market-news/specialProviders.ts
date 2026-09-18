import 'server-only';

import { createFinancialNewsProviders } from './registry';
import { createRssNewsProvider } from './providers/rss';
import { TOPICS, type TopicId } from './specialTopics';

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

export function createSpecialNewsProviders(topic: TopicId) {
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
