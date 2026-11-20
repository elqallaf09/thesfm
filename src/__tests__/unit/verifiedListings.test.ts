import { afterEach, describe, expect, it, vi } from 'vitest';
import { eligibleListings, listingTickerItems, safeListingSource, type VerifiedListing } from '@/lib/market-news/verifiedListings';
import type { SpecialQuote } from '@/lib/market-news/specialQuotes';
const mocks = vi.hoisted(() => ({ quotes: vi.fn() }));
vi.mock('@/lib/market-news/specialQuotes', () => ({ fetchSpecialQuotes: mocks.quotes }));
import { newListingTicker } from '@/lib/market-news/newListingTicker.server';
const now = Date.parse('2026-11-16T12:00:00Z');
const row: VerifiedListing = { symbol: 'TEST', name: 'Test Inc.', exchange: 'NASDAQ', cik: '123',
  securityType: 'common-stock', listingType: 'ipo', firstTradeDate: '2026-11-01',
  evidence: 'completed-first-trade', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/123/000000012326000001/test.htm',
  sourceLabel: 'SEC EDGAR', sourceSection: 'Trading', verifiedAt: '2026-11-16', reviewAfter: '2026-12-16' };
const quote: SpecialQuote = { symbol: 'TEST', name: 'Test Inc.', exchange: 'NMS', currency: 'USD', assetType: 'EQUITY',
  available: true, price: 20, change: 1, changePercent: 5, source: 'Yahoo Finance', delayed: true, asOf: '2026-11-13T21:00:00Z' };
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });
describe('reviewed completed US listings', () => {
  it('retains exact sourced dates and distinguishes listing types', () => {
    expect(eligibleListings(now).map(x => [x.symbol, x.firstTradeDate, x.listingType])).toEqual([
      ['AGLT', '2026-11-05', 'business-combination'], ['AMRO', '2026-10-15', 'new-us-listing'], ['ADRX', '2026-09-25', 'ipo'],
    ]);
  });
  it.each([
    { evidence: 'expected' }, { evidence: 'priced' }, { securityType: 'unit' }, { securityType: 'warrant' },
    { securityType: 'etf' }, { listingType: 'split' }, { listingType: 'rename' }, { exchange: 'LSE' },
    { firstTradeDate: '2026-12-01' }, { firstTradeDate: '2026-08-17' }, { firstTradeDate: '2026-02-30' },
    { verifiedAt: '2026-11-17' }, { reviewAfter: '2026-11-16' }, { reviewAfter: '2027-01-01' },
    { sourceUrl: 'https://www.sec.gov.evil.test/Archives/edgar/data/123/000000012326000001/test.htm' },
    { cik: '999' }, { symbol: 'TEST<script>' },
  ])('rejects ineligible evidence %j', patch => expect(eligibleListings(now, [{ ...row, ...patch }])).toEqual([]));
  it('deduplicates matching evidence but rejects ambiguous symbol identity', () => {
    expect(eligibleListings(now, [row, row])).toHaveLength(1);
    expect(eligibleListings(now, [row, { ...row, firstTradeDate: '2026-10-20' }])).toEqual([]);
  });
  it('rejects unsafe source links', () => {
    expect(safeListingSource({ ...row, sourceUrl: row.sourceUrl + '?redirect=evil' })).toBe(false);
  });
  it('omits missing quotes and keeps valid quote provenance', () => {
    expect(listingTickerItems([row], new Map(), now)).toEqual([]);
    expect(listingTickerItems([row], new Map([['TEST', quote]]), now)[0]).toMatchObject({ symbol: 'TEST', price: 20, asOf: quote.asOf, listingSourceUrl: row.sourceUrl });
  });
  it.each([
    { available: false }, { price: 0 }, { price: NaN }, { asOf: null }, { asOf: '2026-11-01T12:00:00Z' },
    { asOf: '2026-11-17T12:00:00Z' }, { currency: 'EUR' }, { assetType: 'ETF' },
    { symbol: 'OTHER' }, { name: 'Different Issuer' }, { exchange: 'NYQ' },
  ])('rejects unsuitable price %j', patch => expect(listingTickerItems([row], new Map([['TEST', { ...quote, ...patch }]]), now)).toEqual([]));
  it('rejects predecessor quotes from before the new first trading date', () => {
    expect(listingTickerItems([{ ...row, firstTradeDate: '2026-11-16' }], new Map([['TEST', quote]]), now)).toEqual([]);
  });
  it('does not request or publish quotes without independently confirmed rights', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv('NEW_LISTING_QUOTES_RIGHTS_CONFIRMED', 'false');
    const data = await newListingTicker();
    expect(data.listings).toHaveLength(3); expect(data.tickerItems).toEqual([]);
    expect(data.quoteStatus).toBe('rights-unverified'); expect(mocks.quotes).not.toHaveBeenCalled();
  });
  it('fails closed to no records after review expiry', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-16')); vi.stubEnv('NEW_LISTING_QUOTES_RIGHTS_CONFIRMED', 'false');
    expect((await newListingTicker()).listings).toEqual([]);
  });
});
