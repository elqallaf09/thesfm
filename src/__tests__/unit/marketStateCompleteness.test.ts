import { describe, expect, it } from 'vitest';
import { classifyCatalogCompleteness, computeCompleteness } from '@/lib/market-state/completeness';

describe('computeCompleteness', () => {
  it('reports the exact partial coverage for 18 of 25 requested symbols', () => {
    const completeness = computeCompleteness(25, 18);
    expect(completeness).toEqual({ requested: 25, returned: 18, missing: 7, percentage: 72 });
  });

  it('reports 100% when nothing was requested but something was returned', () => {
    expect(computeCompleteness(0, 3).percentage).toBe(100);
  });

  it('reports 0% for a fully empty response', () => {
    expect(computeCompleteness(10, 0)).toEqual({ requested: 10, returned: 0, missing: 10, percentage: 0 });
  });
});

describe('classifyCatalogCompleteness', () => {
  const diagnostics = {
    totalSymbolsDiscovered: 13307,
    totalSymbolsLoaded: 13307,
    failedSymbols: [],
    generatedAt: '2026-07-10T12:00:00.000Z',
  };

  it('never fabricates liveQuoteAvailable as equal to discovered when no quote sample was measured', () => {
    const breakdown = classifyCatalogCompleteness(diagnostics);
    expect(breakdown.discovered).toBe(13307);
    expect(breakdown.liveQuoteAvailable).toBeNull();
    expect(breakdown.delayedQuoteAvailable).toBeNull();
  });

  it('reports a real measured live-quote sample distinct from the discovered catalog count', () => {
    const breakdown = classifyCatalogCompleteness(diagnostics, { liveCount: 1842, delayedCount: 3205 });
    expect(breakdown.discovered).toBe(13307);
    expect(breakdown.liveQuoteAvailable).toBe(1842);
    expect(breakdown.delayedQuoteAvailable).toBe(3205);
    expect(breakdown.liveQuoteAvailable).not.toBe(breakdown.discovered);
  });

  it('derives malformed count from the discovered/loaded/failed difference', () => {
    const breakdown = classifyCatalogCompleteness({
      totalSymbolsDiscovered: 100,
      totalSymbolsLoaded: 90,
      failedSymbols: [{ symbol: 'X', provider: 'fmp', reason: 'bad_data' }],
      generatedAt: '2026-07-10T12:00:00.000Z',
    });
    expect(breakdown.failed).toBe(1);
    expect(breakdown.malformed).toBe(9);
  });
});
