import { describe, expect, it } from 'vitest';
import { compactNewsItem, parseNewsLimit } from '@/lib/news/apiPayload';

function evidenceItem() {
  return {
    id: 'story-1',
    title: 'Central bank announces an interest-rate decision',
    summary: 'The official release kept the policy rate unchanged.',
    titleOriginal: 'Central bank announces an interest-rate decision',
    summaryOriginal: 'The official release kept the policy rate unchanged.',
    languageOriginal: 'en',
    source: 'Official Central Bank',
    url: 'https://centralbank.example/releases/rate-decision',
    publishedAt: '2026-07-10T10:00:00.000Z',
    isOfficial: true,
    sourceReliability: 0.99,
    verificationStatus: 'official',
    independentSourceCount: 3,
    corroboratingSourceCount: 2,
    supportingSources: [
      {
        sourceId: 'provider-secret-id',
        sourceName: 'Independent Wire',
        sourceDomain: 'www.wire.example',
        sourceNetworkId: 'private-network-id',
        originalUrl: 'https://wire.example/story?id=123',
        publishedAt: '2026-07-10T10:01:00.000Z',
        isOfficial: false,
        reliabilityScore: 0.9,
        independent: true,
        rawPayload: { secret: true },
      },
    ],
    eventType: 'interest_rate_decision',
    importanceScore: 91,
    relevanceScore: 88,
    confidenceScore: 0.96,
    entityConfidenceScore: 0.93,
    sentiment: 'neutral',
    expectedImpact: 'high',
    impactDirection: 'neutral',
    impactHorizon: 'immediate',
    impactReason: 'Official policy decision affecting borrowing costs.',
    conflictSummary: 'Sources disagree on the timing of the next meeting.',
    whyItMatters: 'Policy rates affect financing conditions across the market.',
    marketCodes: ['US', 'US'],
    exchangeCodes: ['NYSE', 'NASDAQ'],
    symbols: ['SPY', 'QQQ'],
    sectors: ['financials'],
    providerId: 'internal-provider',
    rawProviderPayload: { apiKey: 'must-not-leak' },
  };
}

describe('news API payload compaction', () => {
  it('preserves the complete aggregation evidence allow-list', () => {
    const result = compactNewsItem(evidenceItem());

    expect(result).toMatchObject({
      isOfficial: true,
      sourceReliability: 0.99,
      verificationStatus: 'official',
      independentSourceCount: 3,
      corroboratingSourceCount: 2,
      eventType: 'interest_rate_decision',
      importanceScore: 91,
      relevanceScore: 88,
      confidenceScore: 0.96,
      entityConfidenceScore: 0.93,
      sentiment: 'neutral',
      expectedImpact: 'high',
      impactDirection: 'neutral',
      impactHorizon: 'immediate',
      impactReason: 'Official policy decision affecting borrowing costs.',
      conflictSummary: 'Sources disagree on the timing of the next meeting.',
      whyItMatters: 'Policy rates affect financing conditions across the market.',
      marketCodes: ['US'],
      exchangeCodes: ['NYSE', 'NASDAQ'],
      symbols: ['SPY', 'QQQ'],
      sectors: ['financials'],
    });
    expect(result.supportingSources).toEqual([{
      sourceName: 'Independent Wire',
      sourceDomain: 'wire.example',
      originalUrl: 'https://wire.example/story?id=123',
      publishedAt: '2026-07-10T10:01:00.000Z',
      isOfficial: false,
      reliabilityScore: 0.9,
      independent: true,
    }]);
  });

  it('does not expose provider payloads or supporting-source internals', () => {
    const result = compactNewsItem(evidenceItem()) as Record<string, unknown>;
    const source = (result.supportingSources as Array<Record<string, unknown>>)[0];

    expect(result).not.toHaveProperty('providerId');
    expect(result).not.toHaveProperty('rawProviderPayload');
    expect(source).not.toHaveProperty('sourceId');
    expect(source).not.toHaveProperty('sourceNetworkId');
    expect(source).not.toHaveProperty('rawPayload');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('provider-secret-id');
  });

  it('removes unsafe URLs and invalid evidence values', () => {
    const result = compactNewsItem({
      ...evidenceItem(),
      url: 'javascript:alert(1)',
      sourceReliability: 5,
      verificationStatus: 'definitely_verified',
      confidenceScore: Number.NaN,
      eventType: 'invented_event',
      supportingSources: [
        {
          sourceName: 'Unsafe Source',
          sourceDomain: 'localhost',
          originalUrl: 'http://127.0.0.1/admin',
          publishedAt: 'not-a-date',
          isOfficial: true,
          reliabilityScore: 4,
        },
      ],
    });

    expect(result.url).toBe('');
    expect(result).not.toHaveProperty('sourceReliability');
    expect(result).not.toHaveProperty('verificationStatus');
    expect(result).not.toHaveProperty('confidenceScore');
    expect(result).not.toHaveProperty('eventType');
    expect(result.supportingSources).toEqual([{
      sourceName: 'Unsafe Source',
      sourceDomain: null,
      originalUrl: '',
      publishedAt: '',
      isOfficial: true,
      reliabilityScore: null,
    }]);
  });

  it('derives corroboration and a symbol from legacy category-news fields', () => {
    const result = compactNewsItem({
      id: 'legacy',
      headline: 'Company announces results',
      source: 'Newswire',
      url: 'https://news.example/company-results',
      publishedAt: '2026-07-10T10:00:00.000Z',
      ticker: 'AAPL',
      sectors: ['technology'],
      independentSourceCount: 4,
    });

    expect(result.symbols).toEqual(['AAPL']);
    expect(result.sectors).toEqual(['technology']);
    expect(result.corroboratingSourceCount).toBe(3);
  });

  it('continues to bound the public limit parameter', () => {
    expect(parseNewsLimit(null)).toBe(50);
    expect(parseNewsLimit('0')).toBe(1);
    expect(parseNewsLimit('999')).toBe(60);
    expect(parseNewsLimit('not-a-number')).toBe(50);
  });
});
