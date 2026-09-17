import { describe, expect, it } from 'vitest';
import { sortWorldStocks } from '@/lib/world-stocks/sort';
import type { WorldStock } from '@/lib/world-stocks/types';

function stock(overrides: Partial<WorldStock> = {}): WorldStock {
  return {
    canonicalSymbol: 'AAA',
    providerSymbol: 'AAA',
    displayName: 'Alpha Corp',
    exchangeCode: 'US',
    exchangeName: 'US Markets',
    countryCode: 'US',
    countryName: 'United States',
    region: 'US',
    currency: 'USD',
    sector: null,
    industry: null,
    assetType: 'stock',
    price: null,
    change: null,
    changePercent: null,
    marketCap: null,
    quoteTimestamp: null,
    delayed: true,
    dataSource: null,
    logoKey: 'AAA',
    metadataStatus: 'available',
    quoteStatus: 'not_fetched',
    ...overrides,
  };
}

describe('sortWorldStocks', () => {
  it('sorts by localized display name by default', () => {
    const items = [stock({ canonicalSymbol: 'B', displayName: 'Beta Corp' }), stock({ canonicalSymbol: 'A', displayName: 'Alpha Corp' })];
    expect(sortWorldStocks(items, 'name', 'en-US').map(s => s.canonicalSymbol)).toEqual(['A', 'B']);
  });

  it('sorts by canonical symbol', () => {
    const items = [stock({ canonicalSymbol: 'ZZZ' }), stock({ canonicalSymbol: 'AAA' })];
    expect(sortWorldStocks(items, 'symbol', 'en-US').map(s => s.canonicalSymbol)).toEqual(['AAA', 'ZZZ']);
  });

  it('does not mutate the input array', () => {
    const items = [stock({ canonicalSymbol: 'B' }), stock({ canonicalSymbol: 'A' })];
    sortWorldStocks(items, 'symbol', 'en-US');
    expect(items.map(s => s.canonicalSymbol)).toEqual(['B', 'A']);
  });

  it('ranks gainers/losers only by fetched quotes, pushing not_fetched/unavailable stocks to the end rather than treating them as a fabricated 0% change', () => {
    const items = [
      stock({ canonicalSymbol: 'PENDING', quoteStatus: 'not_fetched', changePercent: null }),
      stock({ canonicalSymbol: 'UP', quoteStatus: 'available', changePercent: 5 }),
      stock({ canonicalSymbol: 'DOWN', quoteStatus: 'available', changePercent: -3 }),
      stock({ canonicalSymbol: 'FAILED', quoteStatus: 'unavailable', changePercent: null }),
    ];
    const gainers = sortWorldStocks(items, 'change_desc', 'en-US').map(s => s.canonicalSymbol);
    expect(gainers.slice(0, 2)).toEqual(['UP', 'DOWN']);
    expect(gainers.slice(2)).toEqual(expect.arrayContaining(['PENDING', 'FAILED']));

    const losers = sortWorldStocks(items, 'change_asc', 'en-US').map(s => s.canonicalSymbol);
    expect(losers.slice(0, 2)).toEqual(['DOWN', 'UP']);
  });

  it('never uses changePercent from a stock whose quote is not available, even if a stale value is present on the object', () => {
    // Defensive case: quoteStatus is the source of truth, not merely
    // whether changePercent happens to be non-null.
    const items = [
      stock({ canonicalSymbol: 'STALE', quoteStatus: 'unavailable', changePercent: 999 }),
      stock({ canonicalSymbol: 'REAL', quoteStatus: 'available', changePercent: 1 }),
    ];
    expect(sortWorldStocks(items, 'change_desc', 'en-US').map(s => s.canonicalSymbol)).toEqual(['REAL', 'STALE']);
  });
});
