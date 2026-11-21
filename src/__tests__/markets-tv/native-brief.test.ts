import { describe, expect, it } from 'vitest';
import { parseSnapshot } from '../../../apps/markets-tv-native/src/api';
import { nativeBriefPage, nativeBriefQuote } from '../../../apps/markets-tv-native/src/briefModel';
import { briefMetrics } from '@/lib/markets-tv/obsidian';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvQuotePrice, tvQuoteTime } from '@/lib/markets-tv/i18n';
import type { TvQuote } from '@/lib/markets-tv/types';

const now = Date.parse('2026-11-20T17:20:00Z');
const quote = (symbol: string, changePercent = 1): TvQuote => ({
  symbol, name: symbol, nameAr: `اسم ${symbol}`, price: 100, currency: 'USD', changePercent,
  source: 'Verified QA source', observedAt: new Date(now - 60_000).toISOString(),
  receivedAt: new Date(now).toISOString(), status: 'delayed', delayType: 'delayed', changeBasis: 'session',
  exchange: 'QA', country: 'US', observation: { precision: 'instant', marketOpen: true },
});
const snapshot = (quotes: unknown[], summary: unknown[] = []) => parseSnapshot({
  scene: 'overview', quotes, summary, generatedAt: new Date(now).toISOString(),
}, 'overview');

describe('native market brief shared data contract', () => {
  it('preserves source observation and listing metadata without substituting request time', () => {
    const row: TvQuote = { ...quote('KFH.KW'), listingKey: 'BOURSA_KUWAIT:KFH:KWD', displaySymbol: 'KFH',
      exchange: 'BOURSA_KUWAIT', country: 'KW', currency: 'KWD', price: .755,
      observedAt: '2026-11-19T10:14:19Z', receivedAt: '2026-11-20T17:19:00Z',
      observation: { precision: 'instant', marketOpen: false }, retryAt: '2026-11-20T17:22:00Z' };
    const parsed = snapshot([row]);
    const adapted = nativeBriefQuote(parsed.quotes[0]);
    expect(adapted).toMatchObject(row);
    expect(adapted.observedAt).not.toBe(parsed.generatedAt);
    expect(adapted.observedAt).not.toBe(adapted.receivedAt);
    expect(quoteStatus(adapted, now)).toBe('closed');
    expect(nativeBriefPage(parsed, 'prices', 0, now).stats.comparable).toBe(1);
    expect(tvQuotePrice(adapted)).toBe('0.755');
    expect(tvQuoteTime(adapted.observedAt, 'en', now)).toContain('2026-11-19');
  });

  it('uses the web brief calculation for unique comparable listings, unchanged prices and every tied leader', () => {
    const rows = [quote('upA', 2), quote('upB', 2), quote('down', -2), quote('flat', 0),
      { ...quote('stale', 90), status: 'stale' as const }, { ...quote('rolling', 50), changeBasis: '24h' as const },
      { ...quote('upA', 1), exchange: 'OTHER' }];
    const data = snapshot(rows, [rows[0]]);
    const model = nativeBriefPage(data, 'highlights', 0, now);
    expect(model.stats).toMatchObject(briefMetrics(rows, now));
    expect(model.stats).toMatchObject({ total: 7, comparable: 5, rising: 3, falling: 1, unchanged: 1 });
    expect(model.rows.map(row => row.symbol)).toEqual(['upA', 'down']);
    expect(nativeBriefPage(data, 'leaders', 0, now).rows.map(row => row.symbol)).toEqual(['upA', 'upB']);
    expect(nativeBriefPage(data, 'leaders', 1, now).rows.map(row => row.symbol)).toEqual(['down']);
  });

  it('keeps tied leaders beyond the top-five ranking limit reachable by remote pages', () => {
    const rows = Array.from({ length: 6 }, (_, index) => quote(`riser${index}`, 2));
    const data = snapshot([...rows, quote('faller', -2)]);
    const first = nativeBriefPage(data, 'leaders', 0, now);
    expect(first.stats.gainers).toHaveLength(5);
    expect(first.pages).toBe(4);
    const displayed = Array.from({ length: first.pages }, (_, page) => nativeBriefPage(data, 'leaders', page, now).rows).flat();
    expect(displayed.map(row => row.symbol)).toEqual([...rows.map(row => row.symbol), 'faller']);
    expect(nativeBriefPage(data, 'leaders', 4, now).page).toBe(0);
    expect(nativeBriefPage(data, 'leaders', -1, now).rows.map(row => row.symbol)).toEqual(['faller']);
  });

  it('selects price browsing for saved observations and never ranks their old changes', () => {
    const data = snapshot([{ ...quote('saved', 99), status: 'stale', observedAt: '2026-09-01T10:00:00Z' }]);
    const model = nativeBriefPage(data, 'highlights', 0, now);
    expect(model).toMatchObject({ view: 'prices', pricesOnly: true, savedOnly: true });
    expect(model.stats).toMatchObject({ available: 1, recent: 0, comparable: 0, average: null, leaders: [] });
    expect(model.rows[0]).toMatchObject({ price: 100, source: 'Verified QA source', observedAt: '2026-09-01T10:00:00Z' });
    expect(tvQuoteTime(model.rows[0].observedAt, 'en', now, true)).toContain('2026-09-01');
  });

  it('keeps prices browsable when the source omits comparable changes', () => {
    const model = nativeBriefPage(snapshot([{ ...quote('priced'), changePercent: null }]), 'leaders', 10, now);
    expect(model).toMatchObject({ view: 'prices', pricesOnly: true, savedOnly: false, page: 0, pages: 1 });
    expect(model.stats).toMatchObject({ recent: 1, comparable: 0, average: null });
    expect(model.rows[0].price).toBe(100);
  });

  it('supports homogeneous rolling changes while excluding them from a mixed session sample', () => {
    const rolling = { ...quote('BTC/USDT', 3), exchange: 'CRYPTO', changeBasis: '24h' };
    expect(nativeBriefPage(snapshot([rolling]), 'highlights', 0, now).stats).toMatchObject({ basis: '24h', comparable: 1, average: 3 });
    expect(nativeBriefPage(snapshot([rolling, quote('session', 1)]), 'highlights', 0, now).stats).toMatchObject({ basis: 'session', comparable: 1, average: 1 });
  });

  it('keeps empty and unavailable data empty instead of inventing zero prices or a current timestamp', () => {
    expect(nativeBriefPage(null, 'highlights', NaN, now)).toMatchObject({ rows: [], page: 0, pages: 1, stats: { total: 0, average: null } });
    const data = parseSnapshot({ scene: 'overview', summary: [], quotes: [
      { ...quote('missing-source'), source: null }, { ...quote('missing-time'), observedAt: null },
      { ...quote('zero'), price: 0 }, { ...quote('nan'), price: NaN },
    ], generatedAt: 'invalid', retryAt: 'invalid' }, 'overview');
    expect(data).toMatchObject({ generatedAt: null, retryAt: null });
    expect(nativeBriefPage(data, 'prices', 0, now)).toMatchObject({ rows: [], stats: { total: 4, available: 0, recent: 0, comparable: 0 } });
  });

  it('does not promote unrecognized evidence or future observations into current rankings', () => {
    const data = snapshot([
      { ...quote('unknown-status'), status: 'cached' },
      { ...quote('unknown-basis'), changeBasis: 'hour' },
      { ...quote('unknown-issue'), issue: 'new_provider_failure' },
      { ...quote('future'), observedAt: new Date(now + 3_600_000).toISOString() },
    ]);
    expect(nativeBriefPage(data, 'highlights', 0, now).stats.comparable).toBe(0);
    expect(nativeBriefQuote(data.quotes[0]).status).toBe('unknown_delay');
    expect(nativeBriefQuote(data.quotes[2]).issue).toBe('provider_unavailable');
  });

  it('retains explicit date precision without treating an incomplete metadata object as a market close', () => {
    const data = snapshot([
      { ...quote('dated'), observation: { precision: 'date', marketOpen: null } },
      { ...quote('unknown'), observation: { precision: 'guess', marketOpen: false } },
    ]);
    expect(quoteStatus(nativeBriefQuote(data.quotes[0]), now)).toBe('reference');
    expect(data.quotes[1].observation).toBeUndefined();
    expect(nativeBriefPage(data, 'prices', 0, now).stats.comparable).toBe(1);
  });
});
