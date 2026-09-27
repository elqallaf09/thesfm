import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeFetchText: vi.fn(),
}));

vi.mock('@/lib/market-news/security', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/market-news/security')>();
  return { ...actual, safeFetchText: mocks.safeFetchText };
});

import { buildFinancialNewsProviderRegistry } from '@/lib/market-news/registry';

const officialBoursaFeed = `<?xml version="1.0"?><rss><channel>
  <item>
    <title>إفصاح أول</title>
    <link>https://www.boursakuwait.com.kw/ar/news/view#BK54055</link>
    <pubDate>Sun, 27 Sep 2026 10:17:39 +0300</pubDate>
  </item>
  <item>
    <title>إفصاح ثان</title>
    <link>https://www.boursakuwait.com.kw/ar/news/view#BK54056</link>
    <pubDate>Sun, 27 Sep 2026 10:18:39 +0300</pubDate>
  </item>
</channel></rss>`;

describe('Boursa Kuwait official RSS coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeFetchText.mockResolvedValue({
      text: officialBoursaFeed,
      finalUrl: 'https://rss.boursakuwait.com.kw/A/rss/FeedFull.aspx?T=4',
      contentType: 'application/rss+xml',
      status: 200,
    });
  });

  it('maps Kuwait disclosure metadata and preserves fragment-only article identity', async () => {
    const registry = buildFinancialNewsProviderRegistry({ marketCodes: ['KUWAIT'], officialOnly: true });
    const provider = registry.providers.find(item => item.id === 'official-boursa-kuwait-disclosures');

    expect(provider).toBeDefined();
    expect(provider).toMatchObject({
      sourceType: 'official_exchange',
      officialSource: true,
      supportedMarkets: expect.arrayContaining(['GULF', 'KW', 'KUWAIT']),
    });

    const items = await provider!.fetchNews({ marketCodes: ['KUWAIT'], officialOnly: true, limit: 10 });

    expect(items).toHaveLength(2);
    expect(items.map(item => item.canonicalUrl)).toEqual([
      'https://www.boursakuwait.com.kw/ar/news/view#BK54055',
      'https://www.boursakuwait.com.kw/ar/news/view#BK54056',
    ]);
    expect(new Set(items.map(item => item.id)).size).toBe(2);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceType: 'official_exchange',
        isOfficial: true,
        marketCodes: ['GULF', 'KW', 'KUWAIT'],
        exchangeCodes: ['Boursa Kuwait'],
        countries: ['KW'],
      }),
    ]));

    const options = mocks.safeFetchText.mock.calls[0]?.[1];
    expect(options.headers).toEqual({
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
    });
    expect(options.headers).not.toHaveProperty('user-agent');
  });
});
