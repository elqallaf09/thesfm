import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mergeStripSnapshot } from '@/lib/markets-tv/stripQuotes';
import { TvQuoteMarquee } from '@/components/markets-tv/TvQuoteMarquee';
import type { TvQuote, TvSnapshot } from '@/lib/markets-tv/types';

const now = Date.now();
const quote = (listingKey: string, price: number | null, changes: Partial<TvQuote> = {}): TvQuote => ({
  symbol: 'SAME', listingKey, name: 'Synthetic listing', nameAr: 'Synthetic listing',
  currency: 'EUR', exchange: 'EURONEXT', country: null, price, changePercent: 1,
  source: price === null ? null : 'Verified QA source', status: price === null ? 'unavailable' : 'delayed',
  observedAt: price === null ? null : new Date(now - 1000).toISOString(),
  receivedAt: new Date(now).toISOString(), ...(price === null ? { issue: 'timeout' as const } : {}), ...changes,
});
const snapshot = (quotes: TvQuote[]): TvSnapshot => ({
  group: 'world', market: 'europe', quotes, generatedAt: new Date(now).toISOString(), total: quotes.length,
  available: quotes.filter(row => row.price !== null).length,
});

describe('European listing retention', () => {
  it('retains different venues independently even if their exchange display name and ticker match', () => {
    const previous = snapshot([quote('TD_XAMS:SAME', 111), quote('TD_XPAR:SAME', 222)]);
    const next = snapshot([quote('TD_XAMS:SAME', null), quote('TD_XPAR:SAME', null)]);
    const merged = mergeStripSnapshot(previous, next);
    expect(merged.quotes.map(row => [row.listingKey, row.price])).toEqual([['TD_XAMS:SAME', 111], ['TD_XPAR:SAME', 222]]);
    expect(merged.quotes.every(row => row.status === 'stale')).toBe(true);
    expect(merged.available).toBe(2);
  });

  it('never fills a failed listing from another explicit venue when metadata is absent', () => {
    const previous = snapshot([quote('TD_XAMS:SAME', 111)]);
    const next = snapshot([quote('TD_XPAR:SAME', null, { exchange: null, currency: null })]);
    expect(mergeStripSnapshot(previous, next).quotes[0]).toEqual(next.quotes[0]);
  });

  it('retains the same explicit listing and its original clocks when a refresh loses metadata', () => {
    const previous = snapshot([quote('TD_XAMS:SAME', 111)]);
    const next = snapshot([quote('TD_XAMS:SAME', null, { exchange: null, currency: null })]);
    expect(mergeStripSnapshot(previous, next).quotes[0]).toMatchObject({
      listingKey: 'TD_XAMS:SAME', price: 111, currency: 'EUR', exchange: 'EURONEXT', status: 'stale',
      observedAt: previous.quotes[0].observedAt, receivedAt: previous.quotes[0].receivedAt,
    });
    expect(mergeStripSnapshot(previous, snapshot([quote('TD_XAMS:SAME', null, { currency: 'CHF' })])).quotes[0].price).toBeNull();
  });

  it('requires complete venue evidence when upgrading a legacy quote and preserves the new key', () => {
    const previous = snapshot([quote('unused', 111, { listingKey: undefined, exchange: 'TD_XAMS' })]);
    const next = snapshot([quote('TD_XAMS:SAME', null, { exchange: 'TD_XAMS' })]);
    expect(mergeStripSnapshot(previous, next).quotes[0]).toMatchObject({ listingKey: 'TD_XAMS:SAME', price: 111, status: 'stale' });
    const incomplete = snapshot([quote('TD_XAMS:SAME', null, { exchange: null, currency: null })]);
    expect(mergeStripSnapshot(previous, incomplete).quotes[0].price).toBeNull();
  });

  it('does not move either listing backward to an older provider observation', () => {
    const previous = snapshot([quote('TD_XAMS:SAME', 111), quote('TD_XPAR:SAME', 222)]);
    const next = snapshot([quote('TD_XAMS:SAME', 999, { observedAt: new Date(now - 5000).toISOString() })]);
    expect(mergeStripSnapshot(previous, next).quotes[0]).toEqual(previous.quotes[0]);
  });

  it('gives repeated tickers separate remote focus targets in the price marquee', () => {
    const html = renderToStaticMarkup(<TvQuoteMarquee quotes={[quote('TD_XAMS:SAME', 111), quote('TD_XPAR:SAME', 222)]}
      language="en" now={now} paused speed={36} select={() => undefined} toggle={() => undefined}/>);
    expect(html.match(/data-tv-focus-key="ticker:TD_XAMS:SAME:EUR"/g)).toHaveLength(1);
    expect(html.match(/data-tv-focus-key="ticker:TD_XPAR:SAME:EUR"/g)).toHaveLength(1);
  });
});
