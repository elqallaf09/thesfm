import { describe, expect, it } from 'vitest';
import { boundedSymbols, comparisonRows, intelligenceAssetType } from '../../../apps/expo-go/src/investorAnalysis';

describe('mobile investor analysis input boundary', () => {
  it('maps provider labels to the intelligence enum', () => {
    expect(intelligenceAssetType('etf')).toBe('FUND');
    expect(intelligenceAssetType('metal')).toBe('COMMODITY');
    expect(intelligenceAssetType('unrecognized')).toBe('STOCK');
  });

  it('keeps only unique, valid, bounded comparison symbols', () => {
    expect(boundedSymbols('spy, QQQ SPY https://unsafe.example AAPL MSFT NVDA')).toEqual(['SPY', 'QQQ', 'AAPL', 'MSFT']);
  });

  it('keeps valid index, share-class and market-pair symbols without URL syntax', () => {
    expect(boundedSymbols('^gspc, brk.b, eur/usd, btc-usd, a:b')).toEqual(['^GSPC', 'BRK.B', 'EUR/USD', 'BTC-USD']);
  });
  it('reads actual comparison results instead of displaying response metadata as market data', () => {
    expect(comparisonRows({ success: true, source: 'yahoo', results: [{ symbol: 'NBK.KW', name: 'NBK', latestPrice: 1.04, changePercent: 0, currency: 'KWD', source: 'Yahoo Finance', lastUpdated: '2026-10-27T10:00:00Z' }] })).toEqual([{ symbol: 'NBK.KW', name: 'NBK', price: 1.04, changePercent: 0, currency: 'KWD', source: 'Yahoo Finance', updatedAt: '2026-10-27T10:00:00Z' }]);
    expect(comparisonRows({ success: true, marketDataService: 'unavailable', results: [] })).toEqual([]);
    expect(comparisonRows({ success: false, results: [{ symbol: 'AAPL', latestPrice: 123 }] })).toEqual([]);
    expect(comparisonRows({ success: true, results: [null, {}, { symbol: 'AAPL', latestPrice: NaN, changePercent: null }] })[0]).toMatchObject({ symbol: 'AAPL', price: null, changePercent: null });
  });
});
