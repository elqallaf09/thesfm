import { describe, expect, it } from 'vitest';
import { buildGulfDailyMarketBrief } from '@/lib/gulf/dailyMarketBrief';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';

const NOW = Date.parse('2026-09-27T10:30:00.000Z');

function marketData(overrides: Partial<GulfMarketData> = {}): GulfMarketData {
  return {
    market: 'kuwait', code: 'KW', exchangeCode: 'Boursa Kuwait', name: 'بورصة الكويت', indexName: 'Premier Market Index',
    requestedSymbol: '^BKP.KW', symbolUsed: '^BKP.KW', value: 9244.26, change: 17.6, changePercent: 0.19,
    currency: 'KWD', marketTime: '2026-09-27T10:15:00.000Z', source: 'Yahoo Finance', status: 'available', available: true,
    delayed: true, updatedAt: '2026-09-27T10:15:00.000Z', ...overrides,
  };
}

function story(overrides: Partial<GulfNewsItem> = {}): GulfNewsItem {
  return {
    id: 'announcement-1', market: 'kuwait', headline: 'إفصاح رسمي', title: 'إفصاح رسمي', summary: 'تفاصيل الإفصاح',
    titleOriginal: 'إفصاح رسمي', summaryOriginal: 'تفاصيل الإفصاح', languageOriginal: 'ar', source: 'Boursa Kuwait',
    publishedAt: '2026-09-27T09:45:00.000Z', url: 'https://www.boursakuwait.com.kw/ar/news/view#BK1', isOfficial: true,
    ...overrides,
  };
}

describe('buildGulfDailyMarketBrief', () => {
  it('summarizes the current index and only the last 24 hours of published notices', () => {
    const result = buildGulfDailyMarketBrief(marketData(), [
      story(),
      story({ id: 'older', title: 'إعلان قديم', publishedAt: '2026-09-25T09:45:00.000Z' }),
    ], NOW);

    expect(result).toMatchObject({
      marketAvailable: true,
      indexValue: 9244.26,
      direction: 'up',
      recentStoryCount: 1,
      officialStoryCount: 1,
      latestStory: { title: 'إفصاح رسمي' },
    });
  });

  it('does not manufacture a market reading when the index provider is unavailable', () => {
    const result = buildGulfDailyMarketBrief(marketData({ available: false, value: null, changePercent: null }), [], NOW);
    expect(result).toMatchObject({ marketAvailable: false, direction: 'unavailable', recentStoryCount: 0, latestStory: null });
  });
});
