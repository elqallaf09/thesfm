import { describe, expect, it } from 'vitest';
import { createTvListingQuoteLookup } from '@/lib/markets-tv/listingIdentity';
import type { TvInstrument } from '@/lib/markets-tv/selections';
import type { TvQuote } from '@/lib/markets-tv/types';

const listings: TvInstrument[] = [
  { symbol: 'SAME', name: 'Amsterdam', region: 'TD_XAMS', listingKey: 'TD_XAMS:SAME' },
  { symbol: 'SAME', name: 'Paris', region: 'TD_XPAR', listingKey: 'TD_XPAR:SAME' },
];
const quote = (listingKey: string | undefined, price = 111): TvQuote => ({
  symbol: 'SAME', name: 'Synthetic listing', nameAr: 'Synthetic listing', listingKey,
  price, currency: 'EUR', exchange: null, country: null, changePercent: 1,
  source: 'Synthetic QA', observedAt: '2026-11-20T10:00:00Z',
  receivedAt: '2026-11-20T10:00:00Z', status: 'delayed',
});

describe('TV directory row and coverage quote identity', () => {
  it('keeps same-symbol listings distinct and does not count an off-page venue', () => {
    const amsterdam = quote('TD_XAMS:SAME'), paris = quote('TD_XPAR:SAME', 222);
    const lookup = createTvListingQuoteLookup(listings, [paris, quote('TD_XETR:SAME', 333), amsterdam]);
    expect(listings.map(lookup)).toEqual([amsterdam, paris]);
    expect(listings.filter(item => createTvListingQuoteLookup(listings, [quote('TD_XETR:SAME')])(item))).toHaveLength(0);
  });

  it('never attaches an ambiguous legacy quote to either exchange', () => {
    expect(listings.map(createTvListingQuoteLookup(listings, [quote(undefined)]))).toEqual([undefined, undefined]);
  });

  it('rejects conflicting duplicate listing responses instead of choosing a price', () => {
    const lookup = createTvListingQuoteLookup(listings, [quote('TD_XAMS:SAME'), quote('TD_XAMS:SAME', 999)]);
    expect(lookup(listings[0])).toBeUndefined();
  });

  it('accepts an unambiguous legacy response only on the matching exchange', () => {
    const legacy = { ...quote(undefined), exchange: 'TD_XAMS' };
    expect(createTvListingQuoteLookup([listings[0]], [legacy])(listings[0])).toBe(legacy);
    expect(createTvListingQuoteLookup([listings[1]], [legacy])(listings[1])).toBeUndefined();
    expect(createTvListingQuoteLookup([listings[0]], [legacy, legacy])(listings[0])).toBeUndefined();
  });
});
