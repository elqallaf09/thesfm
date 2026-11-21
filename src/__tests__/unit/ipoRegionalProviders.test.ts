import { afterEach, expect, it, vi } from 'vitest';
import { createSpecialNewsProviders } from '@/lib/market-news/specialProviders';
import { IPO_REGIONS, ipoEditionFeedUrl } from '@/lib/market-news/ipoRegions';
import * as security from '@/lib/market-news/security';

afterEach(() => vi.restoreAllMocks());

it('keeps every Gulf edition, including Kuwait, and matches the venue before taking the provider limit', async () => {
  const topic = 'ipo-gulf-news';
  const providers = createSpecialNewsProviders(topic);
  for (const edition of IPO_REGIONS[topic].editions) {
    expect(providers.map(provider => provider.id)).toContain(`rss-ipo-${topic}-${edition.country.toLowerCase()}-${edition.language}`);
  }
  const kw = providers.find(provider => provider.id.endsWith('-kw-ar'))!;
  const url = ipoEditionFeedUrl(topic, {country: 'KW', language: 'ar'});
  const headlines = ['طرح عام أولي في ناسداك', 'طرح عام أولي في بورصة الكويت'];
  const text = '<rss><channel>' + headlines.map((title, index) => `<item><title>${title} - Kuwait Times</title>
    <source url="https://example.org">Kuwait Times</source><link>https://example.org/${index}</link>
    <pubDate>${new Date().toUTCString()}</pubDate></item>`).join('') + '</channel></rss>';
  const transport = vi.spyOn(security, 'safeFetchText').mockResolvedValue({text, finalUrl: url, contentType: 'application/rss+xml', status: 200});
  const items = await kw.fetchNews({ marketCodes: ['GULF'], limit: 1 });
  expect(String(transport.mock.calls[0][0])).toBe(url);
  expect(items.map(item => item.originalUrl)).toEqual(['https://example.org/1']);
});
