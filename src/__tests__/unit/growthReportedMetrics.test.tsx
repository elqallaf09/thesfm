import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowthCoverageSummary, GrowthReportedMetrics } from '@/components/growth-stocks/GrowthReportedMetrics';
import { emptyGrowthFundamentals } from '@/lib/market/growthFundamentalsCore';
import { MarketTickerStrip } from '@/components/market/MarketTickerStrip';
beforeEach(() => { vi.stubGlobal('React', React); }); afterEach(() => { vi.unstubAllGlobals(); });
describe('growth evidence and ticker presentation', () => {
  it.each(['ar', 'en', 'fr'] as const)('shows dated sourced figures including a genuine zero in %s', lang => {
    const data = { ...emptyGrowthFundamentals('TEST', null), status: 'complete' as const, period: '2025-12-31', revenueGrowthPercent: 20, earningsGrowthPercent: 10, netMarginPercent: 0, freeCashFlow: 0, currency: 'USD', sourceUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json' };
    const html = renderToStaticMarkup(<GrowthReportedMetrics data={data} lang={lang} />);
    expect(html).toContain('20%'); expect(html).toContain('0%'); expect(html).toContain('0 USD'); expect(html).toContain('2025-12-31'); expect(html).toContain('SEC EDGAR'); expect(html).not.toMatch(/[٠-٩]/);
    expect(renderToStaticMarkup(<GrowthCoverageSummary items={[{ reported: data }]} loading={false} lang={lang} />)).toContain('1/1');
  });
  it('retains available FMP growth figures when official annual financials are unavailable', () => {
    const evidence = { growthPeriod: '2026 Q2', revenueGrowthPercent: 15, earningsGrowthPercent: null };
    const html = renderToStaticMarkup(<GrowthReportedMetrics screening={evidence} lang="en" />);
    expect(html).toContain('15%'); expect(html).toContain('2026 Q2'); expect(html).toContain('FMP'); expect(html).not.toContain('Reported annual');
    expect(renderToStaticMarkup(<GrowthCoverageSummary items={[evidence]} loading={false} lang="en" />)).toContain('1/1');
  });
  it('does not repeat a sufficiently long list inside the primary ticker set', () => {
    const html = renderToStaticMarkup(<MarketTickerStrip ariaLabel="Quotes" pixelsPerSecond={28} minimumItems={1}>{['A', 'B', 'C'].map(symbol => <article key={symbol}>{symbol}</article>)}</MarketTickerStrip>);
    expect(html.match(/role="listitem"/g)).toHaveLength(6);
    expect(html.match(/aria-hidden="true" inert=""/g)).toHaveLength(3);
    expect(html).toContain('data-pixels-per-second="28"');
  });
});
