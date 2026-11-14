import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/world-stocks/providerDirectory', () => ({ getProviderDirectory: async () => ({ rows: [], status: 'unavailable', asOf: null }) }));
import { searchWorldStocks } from '@/lib/world-stocks/search';
import { reconcileKuwaitDirectory } from '@/lib/world-stocks/kuwaitDirectory';

const request = { query: '', region: 'BOURSA_KUWAIT', assetType: null, page: 1, pageSize: 1000, locale: 'en' as const };
describe('Kuwait directory reconciliation', () => {
  it('includes the five verified listings without counting renamed or delisted companies', async () => {
    const result = await searchWorldStocks(request);
    const symbols = result.results.map(item => item.canonicalSymbol);
    for (const symbol of ['ALG', 'BEYOUT', 'ALFTAQA', 'TROLLEY', 'JTC', 'ALENMA', 'PHC', 'SHUAIBA']) expect(symbols).toContain(symbol);
    for (const symbol of ['ERESCO', 'KPPC', 'PAPER', 'DALQANRE']) expect(symbols).not.toContain(symbol);
    expect(new Set(symbols).size).toBe(result.totalCount);
    expect(result.totalCount).toBeGreaterThanOrEqual(138);
    expect(result.results.every(item => item.price === null && item.quoteTimestamp === null)).toBe(true);
  });
  it('finds added listings in Arabic and keeps old symbols searchable', async () => {
    const trolley = await searchWorldStocks({ ...request, query: 'ترولي', locale: 'ar' });
    expect(trolley.results.map(item => item.canonicalSymbol)).toEqual(['TROLLEY']);
    const renamed = await searchWorldStocks({ ...request, query: 'PAPER' });
    expect(renamed.results.map(item => item.canonicalSymbol)).toContain('SHUAIBA');
    expect(renamed.results.map(item => item.canonicalSymbol)).not.toContain('PAPER');
    const absent = await searchWorldStocks({ ...request, query: 'no-such-kuwait-company' });
    expect(absent.results).toEqual([]);
  });
  it('does not rewrite the same symbol on a different exchange', () => {
    const foreign = { symbol: 'PAPER', name: 'Foreign issuer', exchange: 'US', assetType: 'stock' as const };
    expect(reconcileKuwaitDirectory([foreign], 'PAPER')).toEqual([foreign]);
  });
});
