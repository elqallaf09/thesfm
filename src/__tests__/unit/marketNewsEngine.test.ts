import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistence = vi.hoisted(() => ({
  searchStoredNews: vi.fn(),
  persistNewsItems: vi.fn(),
  persistProviderFetch: vi.fn(),
}));

vi.mock('@/lib/market-news/persistence', () => persistence);

import {
  aggregateFinancialNews,
  fetchFromAllProviders,
  mergeConsolidatedStories,
  resetMarketNewsRuntimeForTests,
} from '@/lib/market-news/engine';
import { identifyEntities } from '@/lib/market-news/entityResolver';
import {
  areDuplicateStories,
  calculateImportanceScore,
  clusterRelatedStories,
  normalizeNewsItem,
  processNewsItems,
  resolveCanonicalUrl,
} from '@/lib/market-news/processing';
import { parseFinancialNewsFeed } from '@/lib/market-news/rssParser';
import { itemMatchesQuery, publisherEvidenceProfile, publisherSourceId } from '@/lib/market-news/providers/shared';
import { assertSafePublicHttpUrl, normalizeCanonicalUrl, sanitizeExternalText } from '@/lib/market-news/security';
import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
  type ConsolidatedNewsStory,
  type FinancialNewsProvider,
  type NewsFetchParams,
  type NormalizedNewsItem,
} from '@/lib/market-news/types';

const NOW = '2026-07-10T12:00:00.000Z';

function item(overrides: Partial<NormalizedNewsItem> = {}): NormalizedNewsItem {
  const id = overrides.id ?? 'item-1';
  const providerId = overrides.providerId ?? 'publisher-a';
  const sourceName = overrides.sourceName ?? 'Financial Wire A';
  const originalUrl = overrides.originalUrl ?? `https://example.com/markets/${id}?utm_source=test`;
  return {
    id,
    providerId,
    providerName: providerId,
    canonicalUrl: resolveCanonicalUrl(originalUrl),
    originalUrl,
    imageUrl: null,
    title: 'Apple reports quarterly earnings and revenue growth',
    normalizedTitle: 'apple reports quarterly earnings and revenue growth',
    summary: 'Apple reported financial results for investors.',
    originalLanguage: 'en',
    translatedLanguage: null,
    translatedTitle: null,
    translatedSummary: null,
    sourceId: providerId,
    sourceName,
    sourceType: 'financial_news_agency',
    sourceDomain: 'example.com',
    sourceNetworkId: providerId,
    sourceNetwork: providerId,
    sourceReliability: 0.82,
    sourcePriority: 3,
    isOfficial: false,
    publishedAt: '2026-07-10T10:00:00.000Z',
    updatedAt: null,
    fetchedAt: NOW,
    marketCodes: ['US'],
    exchangeCodes: ['NASDAQ'],
    countries: ['US'],
    sectors: ['technology'],
    industries: [],
    symbols: ['AAPL'],
    companyNames: ['Apple Inc.'],
    assetTypes: ['equity'],
    currencies: ['USD'],
    eventType: 'unknown',
    relevanceScore: 0,
    importanceScore: 0,
    entityConfidenceScore: 0.95,
    entityConfidence: 0.95,
    confidenceScore: 0.8,
    sentiment: 'unknown',
    expectedImpact: 'unknown',
    impactDirection: 'unknown',
    impactHorizon: 'unknown',
    impactReason: null,
    verificationStatus: 'single_source',
    corroboratingSourceCount: 0,
    duplicateGroupId: null,
    contentHash: null,
    eventFingerprint: null,
    processingStatus: 'normalized',
    processingVersion: null,
    ...overrides,
  };
}

function provider(
  id: string,
  fetchNews: FinancialNewsProvider['fetchNews'],
  overrides: Partial<FinancialNewsProvider> = {},
): FinancialNewsProvider {
  return {
    id,
    name: id,
    sourceId: id,
    sourceName: id,
    sourceType: 'financial_news_agency',
    sourceDomain: `${id}.example`,
    sourceNetworkId: `${id}.example`,
    sourceNetwork: `${id}.example`,
    reliabilityScore: 0.8,
    priority: 3,
    officialSource: false,
    supportedMarkets: ['GLOBAL'],
    lastSuccessfulFetch: null,
    lastFailedFetch: null,
    averageLatency: null,
    healthStatus: 'healthy',
    failureCount: 0,
    enabled: true,
    rateLimitState: 'available',
    disabledUntil: null,
    fetchNews,
    searchNews: fetchNews,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  vi.clearAllMocks();
  resetMarketNewsRuntimeForTests();
  persistence.searchStoredNews.mockResolvedValue({ stories: [], total: 0, lastSuccessfulUpdate: null, available: false });
  persistence.persistNewsItems.mockResolvedValue({ saved: 0, deduplicated: 0, available: false });
  persistence.persistProviderFetch.mockResolvedValue({ available: false });
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('market-news normalization and security', () => {
  it('normalizes canonical URLs and removes tracking parameters', () => {
    expect(resolveCanonicalUrl('https://www.example.com/story/?utm_source=x&b=2&a=1#section'))
      .toBe('https://example.com/story?a=1&b=2');
    expect(normalizeCanonicalUrl('https://example.com/story?fbclid=abc&utm_campaign=test'))
      .toBe('https://example.com/story');
  });

  it.each([
    'http://127.0.0.1/admin',
    'http://10.0.0.1/private',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'file:///etc/passwd',
  ])('rejects unsafe configured URL %s', value => {
    expect(() => assertSafePublicHttpUrl(value)).toThrow(FinancialNewsProviderError);
  });

  it('sanitizes external HTML and rejects feed entries without a valid publication date', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[Market <b>update</b>]]></title><link>https://example.com/one</link><pubDate>Thu, 10 Jul 2026 10:00:00 GMT</pubDate><description><![CDATA[<script>alert(1)</script><p>Safe summary</p>]]></description></item>
      <item><title>Missing date</title><link>https://example.com/two</link></item>
      <item><title>Unsafe URL</title><link>javascript:alert(1)</link><pubDate>Thu, 10 Jul 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`;
    const parsed = parseFinancialNewsFeed(xml, {
      providerId: 'rss-test', providerName: 'RSS Test', sourceId: 'rss-test', sourceName: 'RSS Test',
      sourceType: 'public_rss', sourceDomain: 'example.com', sourceNetworkId: 'example.com',
      sourceReliability: 0.7, sourcePriority: 3, isOfficial: false,
    }, NOW);

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].title).toBe('Market update');
    expect(parsed.items[0].summary).toBe('Safe summary');
    expect(parsed.rejectedByReason.missing_or_invalid_date).toBe(1);
    expect(parsed.rejectedByReason.missing_or_unsafe_url).toBe(1);
    expect(sanitizeExternalText('<img src=x onerror=alert(1)>Clean')).toBe('Clean');
  });
});

describe('market-news entity resolution and classification', () => {
  it('maps a legal company name to its symbol with high confidence', () => {
    const result = identifyEntities(item({ symbols: [], companyNames: [], title: 'Apple Inc. reports quarterly earnings' }));
    expect(result.symbols).toContain('AAPL');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  it('does not attach a one-letter ticker using a weak incidental keyword', () => {
    const result = identifyEntities(item({ symbols: [], companyNames: [], title: 'A company reports market earnings', summary: null }));
    expect(result.symbols).not.toContain('A');
    expect(result.symbols).not.toContain('C');
  });

  it('classifies events and keeps importance separate from source reliability', () => {
    const normalized = normalizeNewsItem(item({
      title: 'Apple announces quarterly dividend after earnings',
      summary: 'The company declared a cash dividend for shareholders.',
      sourceReliability: 0.62,
    }));
    expect(normalized.eventType).toBe('dividend_announcement');
    expect(normalized.importanceScore).toBeGreaterThan(50);
    expect(normalized.sourceReliability).toBe(0.62);
    expect(calculateImportanceScore(normalized)).toBe(normalized.importanceScore);
  });

  it('rejects sponsored content and invalid/missing publication dates without fabricating freshness', () => {
    const result = processNewsItems([
      item({ id: 'sponsored', title: 'Sponsored stock promotion buy now' }),
      item({ id: 'missing-date', publishedAt: '' }),
    ]);
    expect(result.items).toHaveLength(0);
    expect(result.rejected.map(entry => entry.reason)).toEqual(expect.arrayContaining([
      'promotional_or_low_quality', 'invalid_publication_date',
    ]));
  });

  it('treats curated OR topics as alternatives instead of requiring every topic', () => {
    const utilityStory = item({ id: 'utility', title: 'Utility stocks rise after regulator decision' });
    const result = processNewsItems([utilityStory], { query: 'consumer staples stocks OR utility stocks OR telecom stocks' });
    expect(result.items).toHaveLength(1);
    expect(itemMatchesQuery(utilityStory, 'consumer staples stocks OR utility stocks OR telecom stocks')).toBe(true);
  });

  it('keeps market-wide stories for watchlists but enforces explicit symbol searches', () => {
    const marketWide = item({ id: 'market-wide', symbols: [], companyNames: [], title: 'Stock market earnings outlook improves', summary: null });
    expect(processNewsItems([marketWide], { symbols: ['AAPL', 'MSFT'] }).items).toHaveLength(1);
    expect(processNewsItems([marketWide], { symbols: ['AAPL'], strictEntityFilter: true }).items).toHaveLength(0);
  });
});

describe('multi-stage deduplication, independence, and conflicts', () => {
  it('deduplicates exact canonical URLs and similar titles', () => {
    const first = normalizeNewsItem(item({ id: 'a', originalUrl: 'https://example.com/story?utm_source=a' }));
    const exact = normalizeNewsItem(item({ id: 'b', originalUrl: 'https://example.com/story?utm_source=b', providerId: 'publisher-b', sourceId: 'publisher-b' }));
    const similar = normalizeNewsItem(item({
      id: 'c', originalUrl: 'https://other.example/apple-results', providerId: 'publisher-c', sourceId: 'publisher-c',
      sourceNetworkId: 'publisher-c', sourceDomain: 'other.example',
      title: 'Apple reports quarterly earnings, revenue growth',
    }));
    expect(areDuplicateStories(first, exact)).toBe(true);
    expect(areDuplicateStories(first, similar)).toBe(true);
  });

  it('does not count syndicated copies from one publisher network as independent confirmation', () => {
    const stories = clusterRelatedStories([
      normalizeNewsItem(item({ id: 'a', providerId: 'wire-a', sourceId: 'wire-a', sourceNetworkId: 'network-one' })),
      normalizeNewsItem(item({ id: 'b', providerId: 'syndication-b', sourceId: 'syndication-b', sourceNetworkId: 'network-one', originalUrl: 'https://copy.example/a' })),
    ]);
    expect(stories).toHaveLength(1);
    expect(stories[0].independentSourceCount).toBe(1);
    expect(stories[0].verificationStatus).toBe('single_source');
  });

  it('does not treat a social or low-confidence signal as independent confirmation', () => {
    const [story] = clusterRelatedStories([
      normalizeNewsItem(item({ id: 'credible', sourceNetworkId: 'credible.example' })),
      normalizeNewsItem(item({
        id: 'signal', providerId: 'signal', sourceId: 'signal', sourceNetworkId: 'signal.example',
        sourceDomain: 'signal.example', sourceType: 'social_signal', sourceReliability: 0.9,
        originalUrl: 'https://signal.example/apple-results',
      })),
    ]);
    expect(story.independentSourceCount).toBe(2);
    expect(story.corroboratingSourceCount).toBe(0);
    expect(story.verificationStatus).toBe('single_source');
  });

  it('keeps stable publisher identities and conservative defaults for unknown outlets', () => {
    expect(publisherSourceId('Reuters.com')).toBe(publisherSourceId('reuters.com'));
    expect(publisherEvidenceProfile('www.reuters.com').reliability).toBeGreaterThan(0.9);
    expect(publisherEvidenceProfile('unknown-outlet.example').reliability).toBeLessThan(0.6);
  });

  it('selects an official disclosure as primary and confirms with independent sources', () => {
    const professional = normalizeNewsItem(item({ id: 'wire', providerId: 'wire', sourceId: 'wire', sourceNetworkId: 'wire.example' }));
    const official = normalizeNewsItem(item({
      id: 'official', providerId: 'sec', sourceId: 'sec', sourceName: 'U.S. SEC', sourceType: 'regulator',
      sourceNetworkId: 'sec.gov', sourceDomain: 'sec.gov', sourceReliability: 0.99, sourcePriority: 1,
      isOfficial: true, originalUrl: 'https://sec.gov/news/official-story',
    }));
    const [story] = clusterRelatedStories([professional, official]);
    expect(story.sourceId).toBe('sec');
    expect(story.isOfficial).toBe(true);
    expect(story.independentSourceCount).toBe(2);
    expect(story.verificationStatus).toBe('official');
  });

  it('clusters a practical cross-language duplicate using entity, event, number, and time', () => {
    const english = normalizeNewsItem(item({
      id: 'en', title: 'Apple announces 2% cash dividend', summary: 'Apple declared a 2% dividend.',
    }));
    const arabic = normalizeNewsItem(item({
      id: 'ar', providerId: 'arabic-wire', sourceId: 'arabic-wire', sourceName: 'Arabic Wire', sourceNetworkId: 'arabic.example',
      sourceDomain: 'arabic.example', originalUrl: 'https://arabic.example/apple-dividend', originalLanguage: 'ar',
      title: 'أبل تعلن توزيعات نقدية بنسبة 2%', summary: 'أعلنت أبل عن توزيعات أرباح بنسبة 2%.',
    }));
    expect(areDuplicateStories(english, arabic)).toBe(true);
    expect(clusterRelatedStories([english, arabic])).toHaveLength(1);
  });

  it('marks materially conflicting deal status and suppresses definitive impact', () => {
    const completed = normalizeNewsItem(item({
      id: 'completed', title: 'Apple acquisition completed after final approval', summary: 'The deal has closed.',
      eventType: 'merger_acquisition',
    }));
    const talks = normalizeNewsItem(item({
      id: 'talks', providerId: 'wire-b', sourceId: 'wire-b', sourceNetworkId: 'wire-b', sourceDomain: 'wire-b.example',
      originalUrl: 'https://wire-b.example/deal', title: 'Apple acquisition talks remain ongoing', summary: 'Negotiations are continuing.',
      eventType: 'merger_acquisition',
    }));
    expect(completed.symbols).toEqual(talks.symbols);
    expect(completed.eventType).toBe(talks.eventType);
    expect(completed.eventFingerprint).toBe(talks.eventFingerprint);
    expect(areDuplicateStories(completed, talks)).toBe(true);
    const [story] = clusterRelatedStories([completed, talks]);
    expect(story.verificationStatus).toBe('conflicting');
    expect(story.conflictSummary).toBe('status_disagreement');
    expect(story.expectedImpact).toBe('unknown');
    expect(story.impactDirection).toBe('unknown');
  });

  it('preserves the stored cluster id and detects conflicts introduced on a later run', () => {
    const existing = clusterRelatedStories([normalizeNewsItem(item({
      id: 'existing', title: 'Apple acquisition completed after final approval', summary: 'The deal has closed.',
      eventType: 'merger_acquisition',
    }))])[0];
    const incoming = clusterRelatedStories([normalizeNewsItem(item({
      id: 'incoming', providerId: 'wire-b', sourceId: 'wire-b', sourceNetworkId: 'wire-b.example',
      sourceDomain: 'wire-b.example', originalUrl: 'https://wire-b.example/deal',
      title: 'Apple acquisition talks remain ongoing', summary: 'Negotiations are continuing.', eventType: 'merger_acquisition',
    }))])[0];
    const [merged] = mergeConsolidatedStories([existing], [incoming]);
    expect(merged.id).toBe(existing.id);
    expect(merged.verificationStatus).toBe('conflicting');
    expect(merged.expectedImpact).toBe('unknown');
  });
});

describe('resilient provider orchestration and stored fallback', () => {
  const params: NewsFetchParams = {
    from: '2026-07-01', to: '2026-07-10', limit: 20, marketCodes: ['US'], language: 'en',
  };

  it('keeps successful results when another provider fails', async () => {
    const good = provider('good', async () => [item({ id: 'good-story', providerId: 'good', sourceId: 'good', sourceNetworkId: 'good.example' })]);
    const bad = provider('bad', async () => { throw new Error('upstream unavailable'); });
    const outcomes = await fetchFromAllProviders([bad, good], params);
    expect(outcomes.map(result => result.status)).toEqual(['failed', 'success']);
    expect(outcomes[1].items).toHaveLength(1);
  });

  it('reports all providers unavailable without fabricating stories', async () => {
    const first = provider('first', async () => { throw new Error('down'); });
    const second = provider('second', async () => { throw new Error('down'); });
    const result = await aggregateFinancialNews(params, {
      providers: [first, second], mode: 'ingest', pageSize: 10, forceExternal: true, skipPersistence: true,
    });
    expect(result.stories).toEqual([]);
    expect(result.liveUpdatesAvailable).toBe(false);
    expect(result.warnings).toContain('ALL_PROVIDERS_UNAVAILABLE');
  });

  it('uses stored stories when every live provider fails', async () => {
    const stored = clusterRelatedStories([normalizeNewsItem(item({ id: 'stored' }))])[0] as ConsolidatedNewsStory;
    persistence.searchStoredNews.mockResolvedValue({ stories: [stored], total: 1, lastSuccessfulUpdate: stored.publishedAt, available: true });
    const failing = provider('failing-live', async () => { throw new Error('down'); });
    const result = await aggregateFinancialNews(params, {
      providers: [failing], pageSize: 10, forceExternal: true, skipPersistence: true,
    });
    expect(result.stories).toHaveLength(1);
    expect(result.storedFallbackUsed).toBe(true);
    expect(result.liveUpdatesAvailable).toBe(false);
    expect(result.warnings).toContain('LIVE_UPDATES_UNAVAILABLE_STORED_RESULTS');
  });

  it('returns a complete indexed page without mislabeling it as a live outage', async () => {
    const stored = clusterRelatedStories([normalizeNewsItem(item({ id: 'stored-page-two' }))])[0] as ConsolidatedNewsStory;
    persistence.searchStoredNews.mockResolvedValue({ stories: [stored], total: 25, lastSuccessfulUpdate: stored.publishedAt, available: true });
    const fetchNews = vi.fn(async () => []);
    const result = await aggregateFinancialNews(params, {
      providers: [provider('unused-live', fetchNews)], page: 2, pageSize: 1,
    });
    expect(fetchNews).not.toHaveBeenCalled();
    expect(result.page).toBe(2);
    expect(result.total).toBe(25);
    expect(result.stories).toHaveLength(1);
    expect(result.storedFallbackUsed).toBe(false);
    expect(result.liveUpdatesAvailable).toBe(true);
    expect(result.warnings).not.toContain('LIVE_UPDATES_UNAVAILABLE_STORED_RESULTS');
  });

  it('opens a temporary circuit after a rate-limit response', async () => {
    const limited = provider('limited', async () => {
      throw new FinancialNewsProviderError('limited', FinancialNewsProviderErrorCode.RATE_LIMITED, { httpStatus: 429 });
    });
    const first = await fetchFromAllProviders([limited], params);
    const second = await fetchFromAllProviders([limited], params);
    expect(first[0]).toMatchObject({ status: 'failed', rateLimited: true });
    expect(second[0]).toMatchObject({ status: 'skipped', errorCode: 'circuit_open' });
  });
});
