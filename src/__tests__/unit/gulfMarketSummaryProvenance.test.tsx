import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GulfMarketSummary } from '@/components/gulf-news/GulfMarketSummary';
import { getGulfMarket } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';
import { TR_NEWS } from '@/lib/translations/news';

const omanData: GulfMarketData = {
  market: 'oman',
  code: 'OM',
  exchangeCode: 'MSX',
  name: 'بورصة عُمان',
  indexName: 'MSX 30',
  requestedSymbol: 'MSX30',
  symbolUsed: 'MSX30',
  value: 7543.592,
  change: -10.534,
  changePercent: -0.14,
  currency: 'OMR',
  marketTime: '2026-09-27T21:58:00.000Z',
  source: 'Muscat Stock Exchange',
  sourceLabel: 'Muscat Stock Exchange',
  sourceAsOf: '2026-09-27T21:58:00.000Z',
  sourceReportedAt: '2026-09-27T22:13:00.000Z',
  sourceDelayMinutes: 15,
  sourceStatus: 'Closed',
  status: 'available',
  available: true,
  delayed: true,
  updatedAt: '2026-09-27T21:58:00.000Z',
};

beforeEach(() => {
  vi.stubGlobal('React', React);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gulf market source provenance', () => {
  it('shows official source, as-of, delay, and translated market status in the Gulf summary', () => {
    const html = renderToStaticMarkup(
      <GulfMarketSummary
        market={getGulfMarket('oman')}
        marketLabel="Oman Exchange"
        data={omanData}
        labels={{
          title: 'Market summary',
          indexName: 'Main index',
          indexValue: 'Index value',
          dailyChange: 'Daily change',
          source: 'Source',
          asOf: 'As of',
          delay: 'Delay',
          delayedByMinutes: minutes => `Delayed by ${minutes} min`,
          marketStatus: 'Market status',
          marketOpen: 'Open',
          marketClosed: 'Closed',
          unavailable: 'Unavailable',
          unavailableHelper: 'Unavailable',
          delayed: 'Delayed data',
        }}
        formatNumber={value => value?.toFixed(2) ?? 'Unavailable'}
        formatPercent={value => value === null ? 'Unavailable' : `${value.toFixed(2)}%`}
        formatDateTime={value => `Formatted ${value}`}
      />,
    );

    expect(html).toContain('Source');
    expect(html).toContain('Muscat Stock Exchange');
    expect(html).toContain('As of');
    expect(html).toContain('Formatted 2026-09-27T21:58:00.000Z');
    expect(html).toContain('Delayed by 15 min');
    expect(html).toContain('Market status');
    expect(html).toContain('Closed');
  });

  it.each(['ar', 'en', 'fr'] as const)('provides source provenance labels in %s', language => {
    for (const key of [
      'gulf_news_as_of',
      'gulf_news_delay',
      'gulf_news_delayed_by_minutes',
      'gulf_news_market_status',
      'gulf_news_market_status_open',
      'gulf_news_market_status_closed',
    ]) {
      expect(TR_NEWS[key][language]).toBeTruthy();
    }
  });
});
