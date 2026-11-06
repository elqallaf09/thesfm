import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeYahooChartHistory } from '@/lib/market/fetchYahooHistory';
import { tvRegionalIdentity, verifiedTvRegionalQuote } from '@/lib/markets-tv/regionalQuote';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';
const now = Date.parse('2026-11-06T21:00:00Z');
const observed = Date.parse('2026-11-05T10:14:19Z');
const asset: TvAsset = { symbol: 'KFH.KW', name: 'Kuwait Finance House', nameAr: 'بيت التمويل الكويتي',
  region: 'BOURSA_KUWAIT', mic: 'XKUW', currency: 'KWD', country: 'KW', assetType: 'stock' };
function history(meta: Record<string, unknown> = {}, previous = 752) {
  return normalizeYahooChartHistory({ chart: { result: [{
    meta: { symbol: 'KFH.KW', exchangeName: 'KUW', fullExchangeName: 'Kuwait', instrumentType: 'EQUITY', currency: 'KWF',
      regularMarketPrice: 755, regularMarketTime: observed / 1000, chartPreviousClose: 500, previousClose: previous,
      currentTradingPeriod: { regular: { start: observed / 1000 - 15_000, end: observed / 1000 - 1000 } }, ...meta },
    timestamp: [observed / 1000], indicators: { quote: [{ close: [755] }] },
  }] } } as Parameters<typeof normalizeYahooChartHistory>[0], { symbol: 'KFH.KW', providerSymbol: 'KFH.KW', assetType: 'stock', period: '5d', interval: '1d' });
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());
describe('verified TV Gulf fallback', () => {
  it('converts explicitly denominated Kuwait fils to dinars and retains source clocks and daily change', () => {
    const q = verifiedTvRegionalQuote(asset, history(), now);
    expect(q).toMatchObject({ symbol: 'KFH.KW', price: .755, currency: 'KWD', source: 'Yahoo Finance',
      observedAt: new Date(observed).toISOString(), receivedAt: new Date(now).toISOString(), status: 'closed', changeBasis: 'session' });
    expect(q?.changePercent).toBeCloseTo(3 / 752 * 100);
    expect(verifiedTvRegionalQuote(asset, history({ currency: 'KWD', regularMarketPrice: .755, previousClose: .752 }), now)?.price).toBe(.755);
  });
  it.each([{ symbol: 'KFH.BH' }, { exchangeName: 'BHB' }, { currency: 'USD' }, { instrumentType: 'MUTUALFUND' },
    { regularMarketTime: (now + 120_000) / 1000 }, { regularMarketTime: (now - 8 * 86400000) / 1000 }, { regularMarketPrice: -1 }])('rejects incompatible metadata %j', meta => {
    expect(verifiedTvRegionalQuote(asset, history(meta), now)).toBeNull();
  });
  it('requires a qualified listing and does not guess ADX, Bahrain or Oman aliases', () => {
    expect(tvRegionalIdentity({ ...asset, mic: 'XBAH' })).toBeNull();
    expect(tvRegionalIdentity({ ...asset, symbol: 'FAB.AE', mic: 'XADS' })).toBeNull();
    expect(tvRegionalIdentity({ ...asset, symbol: 'NBB.BH', mic: 'XBAH' })).toBeNull();
    expect(tvRegionalIdentity({ ...asset, symbol: 'BKMB.OM', mic: 'XMUS' })).toBeNull();
    expect(tvRegionalIdentity({ symbol: 'EMAAR.DU', name: 'Emaar', mic: 'XDFM' })).toMatchObject({ symbol: 'EMAAR.AE', exchange: 'DFM', currency: 'AED' });
  });
  it('never turns a range baseline into a daily change', () => {
    const data = history({ previousClose: null }, 0);
    expect(verifiedTvRegionalQuote(asset, data, now)?.changePercent).toBeNull();
  });
  it('does not call a cached intraday observation the closing print merely because the session has ended', () => {
    const data = history({ currentTradingPeriod: { regular: { start: observed / 1000 - 1000, end: observed / 1000 + 1000 } } });
    expect(verifiedTvRegionalQuote(asset, data, now)?.status).toBe('stale');
  });
});
