import { describe, expect, it, vi } from 'vitest';
import { collectScreenerPages, assertSameListings, listingIdentity, uniqueSymbolListings } from '@/lib/market/screenerPagination';
import { prepareSymbolSync, syncMarketSymbols } from '../../../scripts/lib/market-symbol-sync.mjs';
const row = (symbol: string, exchange = 'LSE') => ({ symbol, exchange, name: symbol });

describe('Screener page integrity', () => {
  it('walks several pages and preserves both sides of every boundary in stable order', async () => {
    const pages = [[row('C'), row('A')], [row('D'), row('B')], [row('E')], []];
    const fetchPage = vi.fn(async ({ page }: { page: number }) => pages[page]);
    const result = await collectScreenerPages(fetchPage, { exchange: 'LSE', pageSize: 2 });
    expect(result.rows.map(x => x.symbol)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.pageCounts).toEqual([2, 2, 1, 0]);
    expect(fetchPage.mock.calls.map(([p]) => p.page)).toEqual([0, 1, 2, 3]);
  });
  it.each([
    ['duplicate', [[row('A'), row('B')], [row('B')]], 'duplicate_listing'],
    ['short middle page', [[row('A')], [row('B')]], 'short_nonterminal_page'],
    ['ignored limit', [[row('A'), row('B'), row('C')]], 'page_limit_ignored'],
    ['missing exchange', [[{ symbol: 'A' }]], 'missing_listing_identity'],
    ['error object', [{ error: 'quota' }], 'invalid_page'],
  ])('rejects %s', async (_, pages, error) => {
    await expect(collectScreenerPages(async ({ page }) => pages[page], { exchange: 'LSE', pageSize: 2 })).rejects.toThrow(String(error));
  });
  it('rejects truncation at the safety cap and later-page provider failures', async () => {
    await expect(collectScreenerPages(async ({ page }) => [row(String(page))], { exchange: 'LSE', pageSize: 1, maxPages: 2 })).rejects.toThrow('page_cap');
    await expect(collectScreenerPages(async ({ page }) => { if (page) throw new Error('429'); return [row('A')]; }, { exchange: 'LSE', pageSize: 1 })).rejects.toThrow('429');
  });
  it('detects lost symbols even when counts are unchanged', () => {
    expect(() => assertSameListings([row('A'), row('B')], [row('A'), row('C')])).toThrow('listing_set_changed');
    expect(() => assertSameListings([row('B'), row('A')], [row('A'), row('B')])).not.toThrow();
  });
  it.each(['KUWAIT', 'SAU', 'DFM', 'DOH', 'LSE', 'XETRA'])('keeps requested, actual and primary exchange separate: %s', exchange => {
    expect(listingIdentity({ symbol: 'cross', exchange: 'NYSE', primaryExchange: 'LSE' }, exchange))
      .toEqual({ symbol: 'CROSS', exchange: 'NYSE', primaryExchange: 'LSE', requestedExchange: exchange });
    expect(listingIdentity({ symbol: 'local', exchange }, exchange).primaryExchange).toBeNull();
  });
  it('retains the same ticker on different exchanges and all share classes when requested', async () => {
    const fetchPage = vi.fn(async ({ page }) => page ? [] : [row('ABC', 'LSE'), row('ABC', 'NYSE')]);
    const result = await collectScreenerPages(fetchPage, { exchange: 'LSE', includeAllShareClasses: true });
    expect(result.rows).toHaveLength(2);
    expect(fetchPage.mock.calls[0][0].includeAllShareClasses).toBe(true);
  });
});

describe('checked symbol sync', () => {
  it('rejects ambiguous symbol-only enrichment', () => {
    expect([...uniqueSymbolListings([row('A', 'LSE'), row('A', 'NYSE'), row('B')])]).toEqual(['B']);
  });
  it('canonicalizes existing Kuwait aliases before detecting duplicates', () => {
    expect(() => prepareSymbolSync([row('NBK', 'BOURSA_KUWAIT'), row('NBK', 'Boursa Kuwait')])).toThrow('duplicate_listing');
  });
  it('sorts before writing and refuses missing or duplicate composite identities', () => {
    expect(prepareSymbolSync([row('B'), row('A')]).map(x => x.symbol)).toEqual(['A', 'B']);
    expect(() => prepareSymbolSync([row('A'), row(' a ')])).toThrow('duplicate_listing');
    expect(() => prepareSymbolSync([{ symbol: 'A', name: 'A' }])).toThrow('missing_identity');
    expect(prepareSymbolSync([row('A', 'LSE'), row('A', 'NYSE')])).toHaveLength(2);
  });
  it('sends all rows in a single atomic RPC and verifies before/after counts', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ input_count: 2, before_count: 10, after_count: 11, inserted_count: 1, matched_after: 2 })));
    const result = await syncMarketSymbols([row('B'), row('A')], { url: 'https://example.test', serviceRoleKey: 'fixture', fetchImpl });
    expect(result.after_count).toBe(11);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).p_rows.map((x: { symbol: string }) => x.symbol)).toEqual(['A', 'B']);
  });
  it('fails on database failure or inconsistent reconciliation', async () => {
    await expect(syncMarketSymbols([row('A')], { url: 'https://example.test', serviceRoleKey: 'fixture', fetchImpl: vi.fn().mockResolvedValue(new Response('', { status: 409 })) })).rejects.toThrow('http_409');
    await expect(syncMarketSymbols([row('A')], { url: 'https://example.test', serviceRoleKey: 'fixture', fetchImpl: vi.fn().mockResolvedValue(new Response('{}')) })).rejects.toThrow('count_mismatch');
  });
});
