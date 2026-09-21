import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
import { parseCryptoDirectory, parseCryptoQuotes, parseForexDirectory, parseEcbRates, referenceForexQuote } from '@/lib/server/markets-tv/instruments';
import { mergeStripSnapshot } from '@/lib/markets-tv/stripQuotes';
import { normalizeTvSettings, type TvSnapshot } from '@/lib/markets-tv/types';
import { quoteStatus } from '@/lib/markets-tv/quotes';
const now = Date.parse('2026-09-19T10:00:00Z');
describe('TV expanded currency feeds', () => {
  it('discovers the full active spot directory without renaming USDT to USD', () => {
    const symbols = Array.from({ length: 1400 }, (_, i) => ({ symbol: `QA${i}USDT`, baseAsset: `QA${i}`, quoteAsset: 'USDT', status: 'TRADING', isSpotTradingAllowed: true }));
    const rows = parseCryptoDirectory({ symbols: [...symbols, { ...symbols[0], symbol: 'BAD', baseAsset: 'HALT', status: 'BREAK' }] });
    expect(rows).toHaveLength(1400); expect(rows[0].currency).toBe('USDT');
    const quotes = parseCryptoQuotes([{ symbol: rows[0].providerSymbol, lastPrice: '1.123456', closeTime: now, priceChangePercent: '2.5', count: 20 }], [rows[0]], now);
    expect(quotes[0]).toMatchObject({ price: 1.123456, currency: 'USDT', observedAt: new Date(now).toISOString(), status: 'available' });
    expect(parseCryptoQuotes([{ symbol: 'OTHER', lastPrice: '9', closeTime: now, count: 1 }], [rows[0]], now)[0].price).toBeNull();
    expect(parseCryptoQuotes([{ symbol: rows[0].providerSymbol, lastPrice: '1', closeTime: now + 100000, count: 20 }], [rows[0]], now)[0].price).toBeNull();
  });
  it('accepts all published forex pairs and computes explicitly dated ECB crosses', () => {
    const assets = parseForexDirectory({ data: [{ symbol: 'GBP/USD', currency_base: 'Pound', currency_quote: 'Dollar' }, { symbol: 'EUR/USD' }, { symbol: 'EUR/USD' }, { symbol: 'USD/USD' }] });
    expect(assets.map(a => a.symbol)).toEqual(['EUR/USD', 'GBP/USD']);
    const days = parseEcbRates('<gesmes><Cube><Cube time="2026-09-18"><Cube currency="USD" rate="1.2"/><Cube currency="GBP" rate="0.8"/></Cube><Cube time="2026-09-17"><Cube currency="USD" rate="1.1"/><Cube currency="GBP" rate="0.8"/></Cube></Cube></gesmes>');
    const q = referenceForexQuote(assets[1], days);
    expect(q.price).toBeCloseTo(1.5); expect(q.changePercent).toBeCloseTo(9.0909); expect(q.observedAt).toBe('2026-09-18'); expect(q.source).toBe('ECB · reference');
    expect(quoteStatus(q, now)).toBe('reference');
    expect(referenceForexQuote({ symbol: 'KWD/USD', name: 'Test' }, days).price).toBeNull();
  });
  it('retains evidence only for the same listing and never advances its source clock on failure', () => {
    const quote = { symbol: 'TEST', exchange: 'ONE', name: 'Test', nameAr: 'Test', country: null, currency: 'USD', price: 10, changePercent: 1, observedAt: new Date(now).toISOString(), receivedAt: null, source: 'Source', status: 'available' as const };
    const old: TvSnapshot = { group: 'world', quotes: [quote], generatedAt: '', available: 1, total: 1 };
    const failed = { ...old, quotes: [{ ...quote, price: null, observedAt: null }] };
    expect(mergeStripSnapshot(old, failed).quotes[0]).toMatchObject({ price: 10, status: 'stale', observedAt: quote.observedAt });
    expect(mergeStripSnapshot(old, { ...failed, quotes: [{ ...failed.quotes[0], exchange: 'TWO' }] }).quotes[0].price).toBeNull();
    expect(mergeStripSnapshot(old, { ...old, quotes: [{ ...quote, price: 11, observedAt: new Date(now + 1000).toISOString() }] }).quotes[0].price).toBe(11);
  });
  it('validates custom market IDs, keeps an explicit empty selection and clamps controls', () => {
    expect(normalizeTvSettings({ marketIds: ['TD_XSAU','crypto','crypto','<script>'], stripSpeed: 999, stripDensity: 'compact' })).toMatchObject({ marketIds: ['TD_XSAU','crypto'], stripSpeed: 56, stripDensity: 'compact' });
    expect(normalizeTvSettings({ marketIds: [] }).marketIds).toEqual([]);
  });
  it('migrates saved speed presets once without resetting other preferences', () => {
    for (const [previous, current] of [[20, 36], [32, 56], [44, 80]]) {
      const settings = normalizeTvSettings({ stripSpeed: previous, language: 'fr', marketIds: ['crypto'], stripDensity: 'compact' });
      expect(settings).toMatchObject({ stripSpeed: current, language: 'fr', marketIds: ['crypto'], stripDensity: 'compact' });
      expect(normalizeTvSettings(settings)).toEqual(settings);
    }
  });
});
