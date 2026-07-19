import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  aiAnalystMarketAnalysisHref,
  aiAnalystMarketDirectoryUrl,
  aiAnalystNewsUrl,
  isSafeAiAnalystExternalUrl,
  normalizeAiAnalystMarketDirectoryPayload,
  normalizeAiAnalystNewsPayload,
} from '@/components/ai-analyst/aiAnalystMarketSurfaceData';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8').replace(/\r\n?/g, '\n');

describe('AI Analyst market-surface adapters', () => {
  it('keeps the market directory descriptive and discards invalid asset identities', () => {
    const result = normalizeAiAnalystMarketDirectoryPayload({
      ok: true,
      envelope: { status: 'fresh', freshness: { asOf: '2026-07-19T10:00:00.000Z', isStale: false } },
      pagination: { total: 2 },
      groups: [{ id: 'us-equities', ar: 'أسهم الولايات المتحدة', en: 'US equities', currency: 'USD', totalSymbols: 2 }],
      markets: [
        {
          displaySymbol: 'AAPL',
          name: 'Apple Inc.',
          assetType: 'stock',
          exchange: 'NASDAQ',
          currency: 'USD',
          source: 'Catalog',
          quote: { price: 0 },
          direction: 'up',
        },
        { displaySymbol: '../invalid', name: 'Discarded', assetType: 'stock' },
      ],
    });

    expect(result.status).toBe('available');
    expect(result.total).toBe(2);
    expect(result.assets).toEqual([{
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'STOCK',
      exchange: 'NASDAQ',
      currency: 'USD',
      market: null,
      source: 'Catalog',
    }]);
    expect(result.groups).toHaveLength(1);
    expect(Object.keys(result.assets[0]!).sort()).toEqual([
      'assetType', 'currency', 'exchange', 'market', 'name', 'source', 'symbol',
    ]);
  });

  it('labels partial, stale, and unavailable market payloads truthfully', () => {
    expect(normalizeAiAnalystMarketDirectoryPayload({
      ok: true,
      status: 'degraded',
      markets: [{ symbol: 'BTC-USD', assetType: 'crypto' }],
    }).status).toBe('partial');

    expect(normalizeAiAnalystMarketDirectoryPayload({
      ok: true,
      stale: true,
      markets: [{ symbol: 'EURUSD=X', assetType: 'forex' }],
    }).status).toBe('stale');

    expect(normalizeAiAnalystMarketDirectoryPayload({
      ok: false,
      markets: [{ symbol: 'MSFT', assetType: 'stock' }],
    }).status).toBe('unavailable');
  });

  it('only carries safe news presentation fields and safe source URLs', () => {
    const result = normalizeAiAnalystNewsPayload({
      ok: true,
      status: 'success',
      lastUpdated: '2026-07-19T10:00:00.000Z',
      items: [
        {
          id: 'story-1',
          title: 'Exchange filing published',
          summary: 'A source-backed filing is available.',
          sourceName: 'Exchange',
          publishedAt: '2026-07-19T09:00:00.000Z',
          originalUrl: 'https://example.com/filing',
          isOfficial: true,
          score: 1,
        },
        {
          id: 'story-2',
          title: 'Unsafe link is not exposed',
          originalUrl: 'javascript:alert(1)',
        },
      ],
    });

    expect(result.status).toBe('available');
    expect(result.stories[0]).toEqual({
      id: 'story-1',
      title: 'Exchange filing published',
      summary: 'A source-backed filing is available.',
      sourceName: 'Exchange',
      publishedAt: '2026-07-19T09:00:00.000Z',
      url: 'https://example.com/filing',
      official: true,
    });
    expect(result.stories[1]?.url).toBeNull();
    expect(Object.keys(result.stories[0]!).sort()).toEqual([
      'id', 'official', 'publishedAt', 'sourceName', 'summary', 'title', 'url',
    ]);
    expect(isSafeAiAnalystExternalUrl('https://example.com')).toBe(true);
    expect(isSafeAiAnalystExternalUrl('javascript:alert(1)')).toBe(false);
  });

  it('builds bounded internal routes and does not relay untrusted symbols or query values', () => {
    expect(aiAnalystMarketAnalysisHref('AAPL', 'STOCK')).toBe('/ai-analyst/analyze/AAPL?assetType=STOCK');
    expect(aiAnalystMarketAnalysisHref('../private', 'STOCK')).toBeNull();
    expect(aiAnalystMarketDirectoryUrl({ query: 'AAPL & next=https://outside.example', assetType: 'STOCK', page: 2 }))
      .toBe('/api/markets?limit=24&quality=complete&assetType=stock&page=2');
    expect(aiAnalystNewsUrl('fr')).toBe('/api/market-news?scope=general&limit=12&lang=fr');
  });
});

describe('AI Analyst market-surface composition boundary', () => {
  const source = read('src/components/ai-analyst/AiAnalystMarketSurfaces.tsx');

  it('keeps safe legacy market presentation reuse lazy and excludes the terminal and directional endpoints', () => {
    expect(source).toContain("import('@/components/market-analysis/TradingSessionsPanel')");
    expect(source).toContain("import('@/components/market-analysis/EconomicCalendarPanel')");
    expect(source).toContain('canViewDiagnostics={false}');
    expect(source).not.toMatch(/<iframe\b|thesfm-trader-own\/app|TraderShellPage/);
    expect(source).not.toMatch(/\/api\/recommendations\b|\/api\/market\/signals\b|recommendationEngine|riskScore|targetPrice|stopLoss/i);
  });
});
