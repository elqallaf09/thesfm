import { describe, expect, it } from 'vitest';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';
import {
  UNRESOLVED_TICKER,
  categoryMatches,
  computeMentionedTickers,
  computeSourceCounts,
  dedupeNewsItems,
  impactLevel,
  isResolvedTicker,
  itemMatchesSearch,
  marketConnectionScore,
  resolveEvidenceState,
  sortNewsItems,
  timeMatches,
} from '@/lib/tech-news/newsProcessing';

function item(overrides: Partial<TechNewsItem> = {}): TechNewsItem {
  return {
    id: overrides.id ?? 'story-1',
    headline: 'Nvidia unveils new AI chip',
    summary: 'Nvidia announced a new AI accelerator for data centers.',
    titleOriginal: 'Nvidia unveils new AI chip',
    summaryOriginal: 'Nvidia announced a new AI accelerator for data centers.',
    languageOriginal: 'en',
    title: 'Nvidia unveils new AI chip',
    companyName: 'NVIDIA',
    ticker: 'NVDA',
    sector: 'semiconductors',
    sectors: ['semiconductors', 'ai'],
    source: 'CNBC',
    datetime: 1_700_000_000,
    publishedAt: new Date().toISOString(),
    url: 'https://example.com/story',
    image: null,
    price: 120,
    changePercent: 1.5,
    change: 1.8,
    priceSource: 'Finnhub',
    delayed: true,
    verificationStatus: 'confirmed',
    independentSourceCount: 2,
    supportingSources: [],
    isOfficial: false,
    sourceReliability: 0.8,
    eventType: 'product_launch',
    importanceScore: 60,
    sentiment: 'positive',
    expectedImpact: 'medium',
    impactDirection: 'positive',
    impactHorizon: 'short_term',
    impactReason: null,
    whyItMatters: null,
    conflictSummary: null,
    ...overrides,
  } as TechNewsItem;
}

describe('isResolvedTicker', () => {
  it('rejects the unresolved-symbol sentinel', () => {
    expect(isResolvedTicker(UNRESOLVED_TICKER)).toBe(false);
  });
  it('rejects empty/whitespace tickers', () => {
    expect(isResolvedTicker('')).toBe(false);
    expect(isResolvedTicker('  ')).toBe(false);
    expect(isResolvedTicker(undefined)).toBe(false);
  });
  it('accepts a real tracked ticker', () => {
    expect(isResolvedTicker('AAPL')).toBe(true);
  });
});

describe('dedupeNewsItems', () => {
  it('drops a second item with the same URL after tracking-param stripping', () => {
    const a = item({ id: 'a', url: 'https://example.com/story?utm_source=x' });
    const b = item({ id: 'b', url: 'https://example.com/story?utm_campaign=y' });
    expect(dedupeNewsItems([a, b])).toHaveLength(1);
  });

  it('drops a second item with a near-identical normalized title even on a different domain', () => {
    const a = item({ id: 'a', url: 'https://a.com/1', titleOriginal: 'Nvidia unveils new AI chip' });
    const b = item({ id: 'b', url: 'https://b.com/2', titleOriginal: 'Nvidia Unveils New AI Chip!' });
    expect(dedupeNewsItems([a, b])).toHaveLength(1);
  });

  it('keeps genuinely distinct stories', () => {
    const a = item({ id: 'a', url: 'https://a.com/1', titleOriginal: 'Nvidia unveils new AI chip' });
    const b = item({ id: 'b', url: 'https://b.com/2', titleOriginal: 'Apple reports quarterly earnings' });
    expect(dedupeNewsItems([a, b])).toHaveLength(2);
  });
});

describe('categoryMatches', () => {
  it('matches an item by declared sector', () => {
    expect(categoryMatches(item({ sector: 'cloud', sectors: ['cloud'] }), 'cloud')).toBe(true);
  });

  it('matches an item by keyword when sector is not tagged', () => {
    const story = item({ sector: 'software', sectors: ['software'], title: 'Tesla battery breakthrough announced', summary: '' });
    expect(categoryMatches(story, 'ev')).toBe(true);
  });

  it('"all" always matches', () => {
    expect(categoryMatches(item(), 'all')).toBe(true);
  });

  it('breaking matches high-impact same-day stories even without a breaking keyword', () => {
    const story = item({
      publishedAt: new Date().toISOString(),
      changePercent: 6,
      title: 'Generic headline with no special keyword',
      summary: '',
    });
    expect(impactLevel(story)).toBe('high');
    expect(categoryMatches(story, 'breaking')).toBe(true);
  });
});

describe('timeMatches', () => {
  it('excludes stories older than the selected window', () => {
    const old = item({ publishedAt: new Date(Date.now() - 40 * 86400000).toISOString() });
    expect(timeMatches(old, 'month')).toBe(false);
    expect(timeMatches(old, 'all')).toBe(true);
  });
});

describe('itemMatchesSearch', () => {
  it('matches on ticker, company name, or headline text', () => {
    const story = item({ ticker: 'NVDA', companyName: 'NVIDIA' });
    expect(itemMatchesSearch(story, 'nvda')).toBe(true);
    expect(itemMatchesSearch(story, 'nvidia')).toBe(true);
    expect(itemMatchesSearch(story, 'unrelated-term')).toBe(false);
  });
  it('an empty query always matches', () => {
    expect(itemMatchesSearch(item(), '   ')).toBe(true);
  });
});

describe('impactLevel', () => {
  it('classifies a large price move plus an earnings keyword as high impact', () => {
    const story = item({ changePercent: 5, title: 'Company beats earnings estimates', summary: '' });
    expect(impactLevel(story)).toBe('high');
  });
  it('classifies a modest analyst-related move as medium impact', () => {
    const story = item({ changePercent: 0.2, title: 'Analyst upgrade issued for the stock', summary: '' });
    expect(impactLevel(story)).toBe('medium');
  });
  it('classifies a quiet, unresolved-ticker story as low impact', () => {
    const story = item({ ticker: UNRESOLVED_TICKER, changePercent: 0, title: 'General technology roundup', summary: '' });
    expect(impactLevel(story)).toBe('low');
  });
});

describe('marketConnectionScore', () => {
  it('never assigns the resolved-ticker bonus to the unresolved sentinel', () => {
    const resolved = item({ ticker: 'AAPL', changePercent: 0, title: 'x', summary: '' });
    const unresolved = item({ ticker: UNRESOLVED_TICKER, changePercent: 0, title: 'x', summary: '' });
    expect(marketConnectionScore(resolved)).toBeGreaterThan(marketConnectionScore(unresolved));
  });
});

describe('sortNewsItems', () => {
  const older = item({ id: 'older', publishedAt: new Date(Date.now() - 3600000).toISOString() });
  const newer = item({ id: 'newer', publishedAt: new Date().toISOString() });

  it('recent-first is the default direction', () => {
    expect(sortNewsItems([older, newer], 'recent', 'en-US').map(story => story.id)).toEqual(['newer', 'older']);
  });
  it('oldest reverses the order', () => {
    expect(sortNewsItems([older, newer], 'oldest', 'en-US').map(story => story.id)).toEqual(['older', 'newer']);
  });
  it('does not mutate the input array', () => {
    const input = [older, newer];
    sortNewsItems(input, 'oldest', 'en-US');
    expect(input).toEqual([older, newer]);
  });
});

describe('computeMentionedTickers', () => {
  it('never mentions the unresolved-symbol sentinel', () => {
    const items = [
      item({ id: 'a', ticker: 'AAPL', companyName: 'Apple' }),
      item({ id: 'b', ticker: UNRESOLVED_TICKER, companyName: 'Technology market' }),
    ];
    const mentioned = computeMentionedTickers(items);
    expect(mentioned.map(entry => entry.ticker)).toEqual(['AAPL']);
  });

  it('counts repeated mentions of the same ticker', () => {
    const items = [
      item({ id: 'a', ticker: 'AAPL' }),
      item({ id: 'b', ticker: 'AAPL' }),
      item({ id: 'c', ticker: 'MSFT' }),
    ];
    const mentioned = computeMentionedTickers(items);
    expect(mentioned[0]).toMatchObject({ ticker: 'AAPL', count: 2 });
  });
});

describe('computeSourceCounts', () => {
  it('ranks sources by article count, most first', () => {
    const items = [
      item({ id: 'a', source: 'CNBC' }),
      item({ id: 'b', source: 'CNBC' }),
      item({ id: 'c', source: 'Yahoo' }),
    ];
    expect(computeSourceCounts(items)[0]).toEqual(['CNBC', 2]);
  });
});

describe('resolveEvidenceState', () => {
  it('flags conflicting verification even when independently sourced', () => {
    expect(resolveEvidenceState({ verificationStatus: 'conflicting', isOfficial: false, independentSourceCount: 3 }).kind).toBe('conflicting');
  });
  it('treats an official source as official regardless of verificationStatus text', () => {
    expect(resolveEvidenceState({ verificationStatus: 'unverified', isOfficial: true, independentSourceCount: 1 }).kind).toBe('official');
  });
  it('falls back to unverified for a single, non-official, non-confirmed source', () => {
    expect(resolveEvidenceState({ verificationStatus: 'unverified', isOfficial: false, independentSourceCount: 1 }).kind).toBe('unverified');
  });
});
