import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], search: vi.fn(), proxy: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => {
  const chain = { select: () => chain, or: () => chain, eq: () => chain, in: () => chain,
    order: () => chain, limit: () => chain,
    then: (resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) => Promise.resolve(resolve({ data: mocks.rows, error: null })) };
  return chain;
} }) }));
vi.mock('@/lib/market/usSymbolResolver', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/market/usSymbolResolver')>();
  return { ...original, searchUSSymbols: mocks.search };
});
vi.mock('@/lib/market/marketDataProvider', () => ({ proxySearch: mocks.proxy }));
import { GET } from '@/app/api/market/search/route';

beforeEach(() => {
  vi.clearAllMocks(); mocks.rows = [];
  mocks.search.mockResolvedValue({ results: [], source: 'fixture' }); mocks.proxy.mockResolvedValue({ results: [] });
});
describe('Arabic search route', () => {
  it.each([['ذهب', 'XAUUSD'], ['سهم أبل', 'AAPL'], ['عملة إيثريوم', 'ETH/USD']])('resolves %s before optional directory requests', async (query, symbol) => {
    const payload = await (await GET(new NextRequest(`http://localhost/api/market/search?q=${encodeURIComponent(query)}&resolve=1`))).json();
    expect(payload.resolved.symbol).toBe(symbol); expect(payload.results[0].symbol).toBe(symbol);
    expect(mocks.search).not.toHaveBeenCalled(); expect(mocks.proxy).not.toHaveBeenCalled();
  });
  it('keeps the database Arabic company name during result ranking', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture');
    try {
      mocks.rows = [{ symbol: 'TEST.KW', company_name_ar: 'شركة الاختبار العربية', company_name_en: 'Test Company', asset_type: 'stock', exchange: 'Boursa Kuwait', country: 'Kuwait', currency: 'KWD' }];
      const payload = await (await GET(new NextRequest(`http://localhost/api/market/search?q=${encodeURIComponent('الاختبار العربية')}`))).json();
      expect(payload.results).toEqual(expect.arrayContaining([expect.objectContaining({ symbol: 'TEST.KW', aliases: expect.arrayContaining(['شركة الاختبار العربية']) })]));
    } finally { vi.unstubAllEnvs(); }
  });
  it('does not invent a ticker for an unknown Arabic name', async () => {
    const payload = await (await GET(new NextRequest(`http://localhost/api/market/search?q=${encodeURIComponent('اسم غير معروف نهائيا')}&resolve=1`))).json();
    expect(payload.resolved).toBeNull(); expect(payload.results).toEqual([]);
  });
});
