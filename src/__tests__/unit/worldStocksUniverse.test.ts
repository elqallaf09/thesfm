import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/market/usSymbolResolver', () => ({
  getUSSymbolUniverse: vi.fn(async () => ({ source: 'qa-directory', rows: Array.from({ length: 6101 }, (_, i) => ({ symbol: `QA${String(i).padStart(5,'0')}`, name: `QA company ${i}`, exchange: 'US', country: 'US', currency: 'USD', assetType: 'stock' })) })),
  searchUSSymbols: vi.fn(async () => ({ results: [], source: 'qa-directory' })),
}));
vi.mock('@/lib/world-stocks/providerDirectory', () => ({ getProviderDirectory: vi.fn(async () => ({ status: 'directory', asOf: '2026-09-19', rows: [
  { symbol: 'QA00001', name: 'Synthetic London listing', exchange: 'TD_XLON', exchangeName: 'London', country: 'GB', currency: 'GBP', assetType: 'stock' },
] })) }));
import { searchWorldStocks } from '@/lib/world-stocks/search';
const base = { query: '', region: null, assetType: null, page: 1, pageSize: 25, locale: 'en' as const };
describe('complete world stock discovery', () => {
  it('includes the US in all-markets browsing, independent of quote availability', async () => {
    const all = await searchWorldStocks({ ...base, pageSize: 1000000 });
    expect(all.results.filter(row => row.region === 'US')).toHaveLength(6101);
    expect(all.results.filter(row => row.region === 'SSE').length).toBeGreaterThan(2000);
    expect(all.results.filter(row => row.region === 'SZSE').length).toBeGreaterThan(2500);
    expect(all.results.filter(row => row.canonicalSymbol === 'QA00001')).toHaveLength(2);
    expect(all.results.every(row => row.price === null && row.quoteTimestamp === null)).toBe(true);
  });
  it('reaches the last page beyond the old 200-page cap without overlap', async () => {
    const last = await searchWorldStocks({ ...base, region: 'US', page: 245 });
    expect(last.totalCount).toBe(6101); expect(last.results).toHaveLength(1);
    const previous = await searchWorldStocks({ ...base, region: 'US', page: 244 });
    expect(previous.results.some(row => row.canonicalSymbol === last.results[0].canonicalSymbol)).toBe(false);
  });
  it('does not truncate search matches to the autocomplete limit', async () => {
    const found = await searchWorldStocks({ ...base, query: 'QA company', region: 'US' });
    expect(found.totalCount).toBe(6101); expect(found.results).toHaveLength(25);
  });
  it('scopes provider markets and their currencies', async () => {
    const found = await searchWorldStocks({ ...base, region: 'TD_XLON' });
    expect(found.results).toHaveLength(1);
    expect(found.results[0]).toMatchObject({ region: 'TD_XLON', exchangeName: 'London', currency: 'GBP' });
  });
});
