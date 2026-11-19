import { describe, expect, it } from 'vitest';
import { TV_NASDAQ_DUBAI_COLUMNS, TV_NASDAQ_DUBAI_LISTINGS, tvNasdaqDubaiIdentity, verifiedTvNasdaqDubaiQuote } from '@/lib/markets-tv/nasdaqDubaiQuote';
import { briefMetrics } from '@/lib/markets-tv/obsidian';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';

const now = Date.parse('2026-11-19T15:00:00Z');
const receivedAt = new Date(now).toISOString();
type Listing = typeof TV_NASDAQ_DUBAI_LISTINGS[number];
const nasdaq = TV_NASDAQ_DUBAI_LISTINGS[5];
const asset = (listing: Listing = nasdaq): TvAsset => ({ ...listing, name: `${listing.ticker} verified Dubai listing`, assetType: 'stock' });
const row = (listing: Listing = nasdaq) => ({ s: `${listing.exchange}:${listing.ticker}`,
  d: [listing.ticker, 'Provider description', listing.exchange, listing.type, listing.currency, 42.5, 7.2,
    now / 1000 - 60, listing.isin, 'streaming', 'regular'] as unknown[] });
const payload = (overrides: Record<number, unknown> = {}, listing: Listing = nasdaq) => {
  const record = row(listing);
  for (const [index, value] of Object.entries(overrides)) record.d[Number(index)] = value;
  return { data: [record] };
};

describe('strict Nasdaq Dubai prices with an unknown trade clock', () => {
  it.each(TV_NASDAQ_DUBAI_LISTINGS)('verifies $ticker by exact venue, denomination, instrument type and ISIN', listing => {
    const quote = verifiedTvNasdaqDubaiQuote(asset(listing), payload({}, listing), receivedAt, now);
    expect(quote).toMatchObject({ symbol: listing.symbol, price: 42.5, currency: listing.currency, source: 'TradingView',
      observedAt: null, receivedAt, status: 'unknown_time', changePercent: null, delayType: null,
      exchange: 'NASDAQDUBAI', country: 'AE', observation: { precision: 'unknown', marketOpen: null } });
    expect(quote?.issue).toBeUndefined();
    expect(quote?.changeBasis).toBeUndefined();
    expect(quoteStatus(quote!, now)).toBe('unknown_time');
    expect(briefMetrics([quote!], now)).toMatchObject({ comparable: 0 });
  });

  it('accepts canonical directory identity or explicit DIFX MIC while rejecting contradictory metadata', () => {
    expect(tvNasdaqDubaiIdentity({ symbol: 'NDAQ', name: 'Nasdaq', region: 'NASDAQ_DUBAI', currency: 'USD' })).toBe(nasdaq);
    expect(tvNasdaqDubaiIdentity({ symbol: 'NDAQ', name: 'Nasdaq', mic: 'DIFX', currency: 'USD' })).toBe(nasdaq);
    for (const changes of [
      { region: undefined, mic: undefined }, { region: 'US' }, { region: 'DFM' }, { mic: 'XNAS' },
      { exchange: 'NASDAQ' }, { exchange: 'DFM' }, { country: 'US' }, { currency: 'AED' },
      { currency: undefined }, { symbol: 'NDAQ.US' }, { symbol: 'OTHER' }, { providerSymbol: 'OTHER' },
      { assetType: 'index' as const },
    ]) expect(tvNasdaqDubaiIdentity({ ...asset(), ...changes })).toBeNull();
  });

  it.each([
    [0, 'OTHER'], [2, 'NASDAQ'], [2, 'DIFX'], [3, 'dr'], [4, 'AED'], [8, 'WRONG_ISIN'],
    [5, 0], [5, -1], [5, '42.5'], [5, NaN], [5, Infinity],
    [7, null], [7, String(now / 1000)], [7, now / 1000 + .5], [7, now / 1000 + 61],
    [7, now / 1000 - 7 * 86400 - 1], [7, Infinity],
  ])('rejects incompatible or malformed response field %s', (index, value) => {
    expect(verifiedTvNasdaqDubaiQuote(asset(), payload({ [index as number]: value }), receivedAt, now)).toBeNull();
  });

  it('requires the observed depositary-receipt and fund types instead of coercing them to equities', () => {
    for (const listing of TV_NASDAQ_DUBAI_LISTINGS.filter(item => item.type !== 'stock')) {
      expect(verifiedTvNasdaqDubaiQuote(asset(listing), payload({ 3: 'stock' }, listing), receivedAt, now)).toBeNull();
    }
    const depa = TV_NASDAQ_DUBAI_LISTINGS[0];
    expect(verifiedTvNasdaqDubaiQuote({ ...asset(depa), currency: 'USD' }, payload({}, depa), receivedAt, now)).toBeNull();
  });

  it('rejects duplicate matching rows, wrong prefixes and changed response schemas', () => {
    for (const data of [[row(), row()], [{ ...row(), s: 'NASDAQ:NDAQ' }],
      [{ ...row(), d: row().d.slice(0, -1) }], [{ ...row(), d: [...row().d, 'unexpected'] }], []]) {
      expect(verifiedTvNasdaqDubaiQuote(asset(), { data }, receivedAt, now)).toBeNull();
    }
    for (const value of [null, {}, { data: null }, { data: [null, false, 'NDAQ'] }]) {
      expect(verifiedTvNasdaqDubaiQuote(asset(), value, receivedAt, now)).toBeNull();
    }
    expect(verifiedTvNasdaqDubaiQuote(asset(), { data: [row(), row(TV_NASDAQ_DUBAI_LISTINGS[0])] }, receivedAt, now)?.price).toBe(42.5);
    expect(TV_NASDAQ_DUBAI_COLUMNS).toHaveLength(11);
  });

  it('uses feed freshness only as a validation bound and never invents a price time or daily change', () => {
    for (const timestamp of [now / 1000 - 7 * 86400, now / 1000, now / 1000 + 60]) {
      const quote = verifiedTvNasdaqDubaiQuote(asset(), payload({ 7: timestamp, 6: 0, 9: 'delayed_streaming_900', 10: 'out_of_session' }), receivedAt, now);
      expect(quote).toMatchObject({ price: 42.5, observedAt: null, receivedAt, changePercent: null,
        status: 'unknown_time', delayType: null, observation: { precision: 'unknown', marketOpen: null } });
    }
    expect(verifiedTvNasdaqDubaiQuote(asset(), payload(), 'invalid', now)).toBeNull();
    expect(verifiedTvNasdaqDubaiQuote(asset(), payload(), new Date(now + 61_000).toISOString(), now)).toBeNull();
    expect(verifiedTvNasdaqDubaiQuote(asset(), payload(), receivedAt, NaN)).toBeNull();
  });
});
