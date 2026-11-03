import { describe, expect, it } from 'vitest';
import { tvAnalysisHref } from '@/lib/markets-tv/analysisLink';

describe('TV phone analysis handoff', () => {
  it.each([
    ['^GDAXI', null, 'INDEX'], ['ASML.AS', 'TD_XAMS', 'STOCK'],
    ['BTC/USDT', 'BINANCE', 'CRYPTO'], ['EUR/USD', 'FOREX', 'FOREX'], ['GC=F', null, 'COMMODITY'],
  ])('opens %s with its asset class and explicit TV execution intent', (symbol, exchange, assetType) => {
    const url = new URL(tvAnalysisHref({ symbol: symbol!, exchange, currency: null }), 'https://www.the-sfm.com');
    expect(decodeURIComponent(url.pathname)).toBe(`/ai-analyst/analyze/${symbol}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ assetType, autoRun: '1', source: 'markets-tv' });
  });
  it('qualifies a local ticker instead of substituting its US listing', () => {
    expect(tvAnalysisHref({ symbol: 'ASML', exchange: 'TD_XAMS', currency: 'EUR' })).toContain('/ASML.AS?');
    expect(tvAnalysisHref({ symbol: 'SAP.DE', exchange: 'TD_XETR', currency: 'EUR' })).toContain('/SAP.DE?');
  });
  it('preserves the exchange detail route when there is no verified analysis mapping', () => {
    expect(tvAnalysisHref({ symbol: 'TEST', exchange: 'TD_XUNK', currency: 'EUR' })).toBe('/world-stocks/TEST?region=TD_XUNK');
  });
});
