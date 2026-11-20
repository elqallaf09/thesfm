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
  it.each([
    ['605336.SS', 'SSE', 'SHH'], ['000001.SZ', 'SZSE', 'SHZ'],
  ])('recovers the qualified Chinese listing %s without changing its currency or clock', (symbol, region, exchangeName) => {
    const listing: TvAsset = { symbol, name: symbol, region, currency: 'CNY', country: 'CN', assetType: 'stock' };
    const sample = history({ symbol, exchangeName, currency: 'CNY', regularMarketPrice: 9.2, previousClose: 9 });
    if (!sample.success) throw new Error('Invalid test fixture');
    const data = { ...sample, providerSymbol: symbol };
    expect(verifiedTvRegionalQuote(listing, data, now)).toMatchObject({ symbol, price: 9.2, currency: 'CNY', source: 'Yahoo Finance', observedAt: new Date(observed).toISOString() });
    expect(verifiedTvRegionalQuote({ ...listing, currency: 'USD' }, data, now)).toBeNull();
    expect(verifiedTvRegionalQuote(listing, { ...data, quoteSnapshot: { ...data.quoteSnapshot!, exchangeCode: exchangeName === 'SHH' ? 'SHZ' : 'SHH' } }, now)).toBeNull();
    expect(tvRegionalIdentity({ ...listing, assetType: 'index' })).toBeNull();
    expect(tvRegionalIdentity({ ...listing, region: region === 'SSE' ? 'SZSE' : 'SSE' })).toBeNull();
    expect(tvRegionalIdentity({ ...listing, symbol: symbol.split('.')[0] })).toBeNull();
  });
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

describe('last known prices for verified illiquid DFM listings', () => {
  const checkedAt = Date.parse('2026-11-19T15:00:00Z');
  const day = 86_400_000;
  const listing = (ticker: string): TvAsset => ({ symbol: `${ticker}.DU`, name: ticker, region: 'DFM',
    mic: 'XDFM', currency: 'AED', country: 'AE', assetType: 'stock' });
  function sample(ticker: string, lastTrade: number, price = 52) {
    const symbol = `${ticker}.AE`;
    const data = normalizeYahooChartHistory({ chart: { result: [{
      meta: { symbol, exchangeName: 'DFM', instrumentType: 'EQUITY', currency: 'AED',
        regularMarketPrice: price, regularMarketTime: lastTrade / 1000, previousClose: price * .9,
        currentTradingPeriod: { regular: { start: checkedAt / 1000 - 32_400, end: checkedAt / 1000 - 14_400 } } },
      // A current carried-forward daily bar cannot replace the actual trade clock.
      timestamp: [checkedAt / 1000 - 32_400], indicators: { quote: [{ close: [price], volume: [0] }] },
    }] } }, { symbol, providerSymbol: symbol, assetType: 'stock', period: '5d', interval: '1d' });
    if (!data.success || !data.quoteSnapshot) throw new Error('Invalid DFM fixture');
    return data;
  }
  beforeEach(() => vi.setSystemTime(checkedAt));

  // https://service.dfm.ae/Bulletins, official bulletin dated 19 Nov 2026:
  // these active listings carry older last-trade dates, not new trades today.
  it.each([
    ['EIBANK', '2026-11-06T10:42:54.000Z', 52],
    ['IFA', '2026-11-09T06:00:03.000Z', 5.95],
    ['NAHO', '2026-05-07T06:05:19.000Z', 1.85],
  ])('retains %s with its original old trade time and no current-session change', (ticker, date, price) => {
    const quote = verifiedTvRegionalQuote(listing(ticker), sample(ticker, Date.parse(date), price), checkedAt);
    expect(quote).toMatchObject({ symbol: `${ticker}.DU`, price, currency: 'AED', source: 'Yahoo Finance',
      observedAt: date, receivedAt: new Date(checkedAt).toISOString(), status: 'stale',
      changePercent: null, changeBasis: 'reference', observation: { precision: 'instant', marketOpen: null } });
  });

  it('bounds the historical exception at 366 days and retains the normal seven-day limit elsewhere', () => {
    expect(verifiedTvRegionalQuote(listing('EIBANK'), sample('EIBANK', checkedAt - 366 * day), checkedAt)?.status).toBe('stale');
    expect(verifiedTvRegionalQuote(listing('EIBANK'), sample('EIBANK', checkedAt - 366 * day - 1), checkedAt)).toBeNull();
    expect(verifiedTvRegionalQuote(listing('EMAAR'), sample('EMAAR', checkedAt - 8 * day), checkedAt)).toBeNull();
  });

  it('still requires matching venue, currency, equity type and provider identity', () => {
    const asset = listing('EIBANK'), data = sample('EIBANK', checkedAt - 13 * day);
    for (const changed of [
      { currency: 'USD' }, { currency: undefined }, { country: 'KW' }, { mic: 'DIFX' },
      { region: 'NASDAQ_DUBAI' }, { exchange: 'ADX' }, { providerSymbol: 'IFA' }, { assetType: 'commodity' as const },
    ]) expect(verifiedTvRegionalQuote({ ...asset, ...changed }, data, checkedAt)).toBeNull();
    for (const changed of [
      { symbol: 'IFA.AE' }, { exchangeCode: 'NASDAQ' }, { currency: 'USD' }, { assetType: 'ETF' },
    ]) expect(verifiedTvRegionalQuote(asset, { ...data, quoteSnapshot: { ...data.quoteSnapshot!, ...changed } }, checkedAt)).toBeNull();
    expect(verifiedTvRegionalQuote(asset, { ...data, providerSymbol: 'IFA.AE' }, checkedAt)).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity, 0, -1])('rejects invalid historical prices %s', price => {
    const data = sample('EIBANK', checkedAt - 13 * day);
    expect(verifiedTvRegionalQuote(listing('EIBANK'), {
      ...data, quoteSnapshot: { ...data.quoteSnapshot!, price },
    }, checkedAt)).toBeNull();
  });

  it.each(['invalid', new Date(checkedAt + 120_000).toISOString()])('rejects invalid or future trade clocks %s', marketTime => {
    const data = sample('EIBANK', checkedAt - 13 * day);
    expect(verifiedTvRegionalQuote(listing('EIBANK'), {
      ...data, quoteSnapshot: { ...data.quoteSnapshot!, marketTime },
    }, checkedAt)).toBeNull();
  });
});

describe('Yahoo listings for the exchange directory', () => {
  const share: TvAsset = { symbol: 'SAP', name: 'SAP', region: 'TD_XETR', mic: 'XETR', country: 'DE', currency: 'EUR' };
  it.each([
    ['XETR', 'DE', 'DE', 'GER'], ['XFRA', 'DE', 'F', 'FRA'], ['XDUS', 'DE', 'DU', 'DUS'],
    ['XHAM', 'DE', 'HM', 'HAM'], ['XHAN', 'DE', 'HA', 'HAN'], ['XMUN', 'DE', 'MU', 'MUN'],
    ['XSTU', 'DE', 'SG', 'STU'], ['XLON', 'GB', 'L', 'LSE'], ['XWAR', 'PL', 'WA', 'WSE'],
    ['XASX', 'AU', 'AX', 'ASX'], ['CXAC', 'AU', 'XA', 'CXA'], ['XTAI', 'TW', 'TW', 'TAI'],
    ['XNSE', 'IN', 'NS', 'NSI'], ['XJPX', 'JP', 'T', 'JPX'],
  ])('binds %s to its own Yahoo venue', (mic, country, suffix, exchange) => {
    expect(tvRegionalIdentity({ ...share, mic, region: `TD_${mic}`, country })).toMatchObject({ symbol: `SAP.${suffix}`, exchange });
  });

  it('recovers a bare Xetra quote with its original clock and rejects same-symbol Frankfurt evidence', () => {
    const data = history({ symbol: 'SAP.DE', currency: 'EUR', exchangeName: 'GER' });
    if (!data.success || !data.quoteSnapshot) throw new Error('Invalid fixture');
    expect(verifiedTvRegionalQuote(share, data, now)).toMatchObject({ symbol: 'SAP', exchange: 'TD_XETR', price: 755,
      source: 'Yahoo Finance', observedAt: new Date(observed).toISOString() });
    expect(verifiedTvRegionalQuote(share, { ...data, quoteSnapshot: { ...data.quoteSnapshot, exchangeCode: 'FRA' } }, now)).toBeNull();
    for (const patch of [{ region: 'TD_XFRA' }, { exchange: 'TD_XFRA' }, { providerSymbol: 'SAP.F' }, { country: 'FR' }, { symbol: 'SAP.F' }]) {
      expect(tvRegionalIdentity({ ...share, ...patch })).toBeNull();
    }
  });

  it('preserves the London listing unit for pence and pound directories', () => {
    const london = { ...share, symbol: 'VOD', country: 'GB', region: 'TD_XLON', mic: 'XLON' };
    const data = history({ symbol: 'VOD.L', exchangeName: 'LSE', currency: 'GBp', regularMarketPrice: 80, previousClose: 75 });
    expect(verifiedTvRegionalQuote({ ...london, currency: 'GBP' }, data, now)).toMatchObject({ price: .8, currency: 'GBP' });
    expect(verifiedTvRegionalQuote({ ...london, currency: 'GBp' }, data, now)).toMatchObject({ price: 80, currency: 'GBp' });
    expect(verifiedTvRegionalQuote({ ...london, currency: 'USD' }, data, now)).toBeNull();
  });
});
