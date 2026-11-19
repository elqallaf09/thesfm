import { describe, expect, it } from 'vitest';
import { tvSceneHasComparableChange, tvSceneQuotes } from '@/lib/markets-tv/scene-quotes';
import type { TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const now = Date.parse('2026-11-19T21:57:00Z');
const quote = (symbol: string, patch: Partial<TvQuote> = {}): TvQuote => ({
  symbol, name: symbol, nameAr: symbol, price: 100, currency: 'USD', source: 'Verified test source',
  observedAt: '2026-11-19T21:00:00Z', receivedAt: '2026-11-19T21:01:00Z',
  status: 'closed', exchange: 'NYSE', country: 'US', changePercent: -1.2, changeBasis: 'session', ...patch,
});
const missing = (symbol: string) => quote(symbol, { price: null, status: 'unavailable', issue: 'timeout' });
const snapshot = (summary: TvQuote[] | undefined, quotes: TvQuote[]): TvSnapshot => ({
  group: 'watchlist', summary, quotes, generatedAt: new Date(now).toISOString(), total: quotes.length,
  available: quotes.filter(quote => quote.price !== null).length,
});

describe('TV scene quote selection', () => {
  it('filters missing prices before limiting summaries and rows, retaining raw coverage', () => {
    const selected = tvSceneQuotes(snapshot(
      [...Array.from({ length: 4 }, (_, i) => missing(`SUMMARY${i}`)), quote('LATE_SUMMARY')],
      [...Array.from({ length: 6 }, (_, i) => missing(`ROW${i}`)), quote('LATE_ROW')],
    ), false, false);
    expect(selected.summaries.map(quote => quote.symbol)).toEqual(['LATE_SUMMARY']);
    expect(selected.rows.map(quote => quote.symbol)).toEqual(['LATE_ROW']);
    expect(selected.all).toHaveLength(12);
    expect(selected.tickerQuotes).toHaveLength(2);
  });

  it('keeps short partial watchlists together even when the row segment is unavailable', () => {
    const selected = tvSceneQuotes(snapshot([quote('GE'), quote('HTCO')], [missing('MISSING')]), false, true);
    expect(selected.summaries).toEqual([]);
    expect(selected.rows.map(quote => quote.symbol)).toEqual(['GE', 'HTCO']);
    expect(selected.all).toHaveLength(3);
    expect(selected.tickerQuotes).toEqual(selected.rows);
  });

  it('preserves the limits and source order without duplicating summaries in legacy snapshots', () => {
    const quotes = [missing('MISSING'), ...Array.from({ length: 12 }, (_, i) => quote(`QA${i}`))];
    const selected = tvSceneQuotes(snapshot(undefined, quotes), false, false);
    expect(selected.summaries.map(quote => quote.symbol)).toEqual(['QA0', 'QA1', 'QA2', 'QA3']);
    expect(selected.rows.map(quote => quote.symbol)).toEqual(['QA4', 'QA5', 'QA6', 'QA7', 'QA8', 'QA9']);
    expect(selected.all).toHaveLength(13);
    expect(selected.tickerQuotes).toHaveLength(12);
  });

  it('deduplicates exact identities while preserving distinct currencies and venues', () => {
    const ge = quote('GE');
    const selected = tvSceneQuotes(snapshot([ge], [ge, quote('GE', { currency: 'EUR', exchange: 'XETR' })]), false, true);
    expect(selected.rows).toHaveLength(2);
    expect(selected.all).toHaveLength(2);
  });

  it('does not invent entries for an empty or two-instrument watchlist', () => {
    expect(tvSceneQuotes(null, false, true).all).toEqual([]);
    const selected = tvSceneQuotes(snapshot([quote('GE'), quote('HTCO')], []), false, true);
    expect(selected.rows.map(quote => quote.symbol)).toEqual(['GE', 'HTCO']);
    expect(selected.summaries).toEqual([]);
  });
});

describe('TV heatmap evidence', () => {
  it('accepts a verified close without treating its midnight timestamp as missing', () => {
    expect(tvSceneHasComparableChange(quote('GE'), now)).toBe(true);
  });

  it.each([
    { status: 'stale' }, { status: 'unknown_delay' }, { status: 'unknown_time', observedAt: null },
    { status: 'reference', changeBasis: 'reference' }, { changeBasis: undefined },
    { changePercent: null }, { changePercent: NaN }, { changePercent: Infinity },
    { price: null }, { source: null }, { issue: 'timeout' }, { observedAt: '2026-11-01T21:00:00Z' },
  ] satisfies Partial<TvQuote>[])('excludes unsupported changes: %j', patch => {
    expect(tvSceneHasComparableChange(quote('GE', patch), now)).toBe(false);
  });
});
