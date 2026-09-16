import { describe, expect, it } from 'vitest';
import {
  normalizeGrowthStatementRows,
  normalizeGrowthUniverseRows,
  recentCompletedQuarters,
  selectGrowthCandidates,
} from './growthStockScreenerCore';

describe('growthStockScreenerCore', () => {
  it('returns completed quarters newest first', () => {
    expect(recentCompletedQuarters(new Date('2026-09-16T12:00:00Z'))).toEqual([
      { year: 2026, period: 'Q2' },
      { year: 2026, period: 'Q1' },
      { year: 2025, period: 'Q4' },
      { year: 2025, period: 'Q3' },
    ]);
  });

  it('keeps the newest growth row per symbol', () => {
    const rows = normalizeGrowthStatementRows([
      { symbol: 'ACME', date: '2026-03-31', period: 'Q1', growthRevenue: 0.12 },
      { symbol: 'ACME', date: '2026-06-30', period: 'Q2', growthRevenue: 0.24 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.revenueGrowth).toBe(0.24);
  });

  it('screens the full supplied universe using fundamentals instead of a fixed watchlist', () => {
    const universe = normalizeGrowthUniverseRows([
      { symbol: 'FAST', companyName: 'Fast Growth', marketCap: 2_000_000_000, price: 40, volume: 2_000_000 },
      { symbol: 'TOPLINE', companyName: 'Top Line Growth', marketCap: 900_000_000, price: 12, volume: 500_000 },
      { symbol: 'SLOW', companyName: 'Slow Company', marketCap: 5_000_000_000, price: 70, volume: 3_000_000 },
    ]);
    const growth = normalizeGrowthStatementRows([
      { symbol: 'FAST', date: '2026-06-30', growthRevenue: 0.18, growthEPS: 0.16 },
      { symbol: 'TOPLINE', date: '2026-06-30', growthRevenue: 0.27, growthEPS: -0.05 },
      { symbol: 'SLOW', date: '2026-06-30', growthRevenue: 0.07, growthEPS: 0.30 },
    ]);

    const candidates = selectGrowthCandidates(universe, growth);
    expect(candidates.map(row => row.symbol)).toEqual(['TOPLINE', 'FAST']);
  });
});
