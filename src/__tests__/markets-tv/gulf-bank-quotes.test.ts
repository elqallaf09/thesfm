import { describe, expect, it } from 'vitest';
import { TV_GULF_BANKS, TV_GULF_BANK_COLUMNS, tvGulfBankIdentity, verifiedTvGulfBankQuote } from '@/lib/markets-tv/gulfBankQuote';
import { briefMetrics } from '@/lib/markets-tv/obsidian';
import { quoteStatus } from '@/lib/markets-tv/quotes';
const now = Date.parse('2026-11-06T22:00:00Z');
const receivedAt = new Date(now).toISOString();
const bank = TV_GULF_BANKS[1];
const asset = { ...bank, name: 'NBB', nameAr: 'بنك البحرين الوطني', assetType: 'stock' as const };
const timestamp = Date.parse('2026-11-05T08:20:02Z') / 1000;
const row = (b = bank as typeof TV_GULF_BANKS[number]) => ({ s: `${b.exchange}:${b.ticker}`,
  d: [b.ticker, 'Test bank', b.exchange, 'stock', b.currency, .5, 0, timestamp, b.isin, 'delayed_streaming_900', 'out_of_session'] });
const payload = (overrides: Record<number, unknown> = {}) => {
  const record = row(); for (const [i, value] of Object.entries(overrides)) record.d[Number(i)] = value as string | number;
  return { data: [record] };
};

describe('verified Gulf bank observations', () => {
  it.each(TV_GULF_BANKS)('matches only the declared $ticker listing, currency and ISIN', b => {
    const result = verifiedTvGulfBankQuote({ ...b, name: b.ticker }, { data: [row(b)] }, receivedAt, now);
    expect(result).toMatchObject({ symbol: b.symbol, price: .5, currency: b.currency, source: 'TradingView', status: 'closed',
      observedAt: '2026-11-05T08:20:02.000Z', receivedAt, delayType: 'delayed', changePercent: 0 });
    expect(briefMetrics([result!], now)).toMatchObject({ available: 1, comparable: 1 });
  });
  it('supports directory symbols with an explicit MIC but never guesses bare symbols', () => {
    expect(tvGulfBankIdentity({ ...asset, symbol: 'NBB' })).toBe(bank);
    expect(tvGulfBankIdentity({ ...asset, symbol: 'NBB', mic: undefined })).toBeNull();
    expect(tvGulfBankIdentity({ ...asset, symbol: 'NBB.L', currency: 'GBP', mic: 'XLON' })).toBeNull();
    expect(tvGulfBankIdentity({ ...TV_GULF_BANKS[0], name: 'FAB', mic: 'XDFM' })).toBeNull();
    expect(tvGulfBankIdentity({ ...asset, providerSymbol: 'BBK' })).toBeNull();
    expect(tvGulfBankIdentity({ ...asset, assetType: 'index' })).toBeNull();
  });
  it.each([
    [0, 'BBK'], [2, 'LSE'], [3, 'fund'], [4, 'USD'], [5, 0], [5, -1], [5, '0.5'], [5, NaN],
    [7, null], [7, '1793866802'], [7, now / 1000 + 120], [7, now / 1000 - 8 * 86400], [8, 'WRONG_ISIN'],
  ])('rejects invalid identity/value/time at field %s', (index, value) => {
    expect(verifiedTvGulfBankQuote(asset, payload({ [index as number]: value }), receivedAt, now)).toBeNull();
  });
  it('rejects duplicate matches, wrong exchange prefixes and changed schemas', () => {
    for (const data of [[row(), row()], [{ ...row(), s: 'LSE:NBB' }], [{ ...row(), d: row().d.slice(0, -1) }]]) {
      expect(verifiedTvGulfBankQuote(asset, { data }, receivedAt, now)).toBeNull();
    }
    expect(TV_GULF_BANK_COLUMNS).toHaveLength(11);
  });
  it('keeps the valid price when a change is missing or invalid without inventing zero', () => {
    for (const change of [null, '0', Infinity, 200]) {
      const result = verifiedTvGulfBankQuote(asset, payload({ 6: change }), receivedAt, now);
      expect(result).toMatchObject({ price: .5, changePercent: null });
      expect(briefMetrics([result!], now).comparable).toBe(0);
    }
  });
  it('never renews old observations or invents a realtime entitlement', () => {
    const old = verifiedTvGulfBankQuote(asset, payload(), receivedAt, now)!;
    expect(quoteStatus(old, now + 8 * 86400000)).toBe('stale');
    const open = verifiedTvGulfBankQuote(asset, payload({ 7: now / 1000 - 60, 9: 'streaming', 10: 'regular' }), receivedAt, now)!;
    expect(open).toMatchObject({ status: 'unknown_delay', delayType: null });
    const delayed = verifiedTvGulfBankQuote(asset, payload({ 7: now / 1000 - 900, 10: 'regular' }), receivedAt, now)!;
    expect(delayed.status).toBe('delayed');
    const stale = verifiedTvGulfBankQuote(asset, payload({ 10: 'regular' }), receivedAt, now)!;
    expect(stale.status).toBe('stale');
  });
});
