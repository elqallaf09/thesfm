import { describe, expect, it } from 'vitest';
import { boundedSymbols, intelligenceAssetType } from '../../../apps/expo-go/src/investorAnalysis';

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
});
