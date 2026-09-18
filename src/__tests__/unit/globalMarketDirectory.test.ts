import { beforeEach, describe, expect, it, vi } from 'vitest';
import snapshot from '@/data/market-symbols/global-directory-snapshot.json';
import usSymbols from '@/data/us-symbols.json';
import { parseKuwaitListings, parseShanghaiListings, parseShenzhenListings } from '@/lib/market/marketListingParsers';

vi.mock('@/lib/server/globalMarketListingSources', () => ({
  getGlobalMarketListings: vi.fn(async (source: string) => ({
    rows: source === 'us' ? usSymbols : snapshot[source as 'kuwait' | 'shanghai' | 'shenzhen'].rows,
    source: 'https://example.com/exchange-directory', asOf: snapshot.asOf, status: 'snapshot',
  })),
}));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: vi.fn(() => null) }));
vi.mock('@/lib/server/regionalMarketDirectory', () => ({ getRegionalMarketDirectory: vi.fn(async () => ({ rows: [], source: 'https://api.twelvedata.com/stocks', status: 'unavailable', reason: 'source_unavailable', checkedAt: '2026-09-18T00:00:00Z', lastSyncAt: null, sourceRecords: null, excludedRecords: null })) }));
import { loadGlobalDirectory, paginateGlobalDirectory } from '@/lib/server/globalMarketDirectory';
import { GET } from '@/app/api/market-directory/route';
import { getRegionalMarketDirectory } from '@/lib/server/regionalMarketDirectory';

describe('Official exchange listing parsers', () => {
  it('uses the supplied sector dictionary, not obsolete numeric sector assumptions', () => {
    const row = Array<string>(49).fill('');
    Object.assign(row, { 1: 'MABANEE`R', 3: 'Mabanee Co', 4: '26', 5: 'KWD', 6: 'MABANEE', 9: '1', 48: 'R' });
    const inactive = [...row]; inactive[9] = '0'; inactive[6] = 'INACTIVE';
    const payload = { DAT: { WL: { TD: [row.join('|'), row.join('|'), inactive.join('|')] }, SRC: { SCTD: ['26|Real Estate'] } } };
    expect(parseKuwaitListings(payload)).toEqual([{ symbol: 'MABANEE', providerSymbol: 'MABANEE.KW', name: 'Mabanee Co', sector: 'real_estate', currency: 'KWD', priceUnit: 'fils' }]);
  });
  it('parses ordinary Shanghai A/B shares and STAR receipts without executing source code', () => {
    const rows = parseShanghaiListings('_t.push({val:"600000",val2:"浦发银行",val3:"pfyx"}); _t.push({val:"900901",val2:"云赛B股"}); _t.push({val:"360001",val2:"农行优1"}); throw new Error("must not execute");');
    expect(rows.map(row => [row.providerSymbol, row.currency])).toEqual([['600000.SS', 'CNY'], ['900901.SS', 'USD']]);
    expect(parseShanghaiListings('<html>Service unavailable</html>')).toEqual([]);
  });
  it('preserves leading zeroes and the different Shenzhen A/B quote currencies', () => {
    const rows = parseShenzhenListings([{ 'A股代码': '000012', 'A股简称': '南玻A', 'B股代码': '200012', 'B股 简 称': '南玻B', '英文名称': 'CSG Holding' }]);
    expect(rows.map(row => [row.providerSymbol, row.currency])).toEqual([['000012.SZ', 'CNY'], ['200012.SZ', 'HKD']]);
  });
});

describe('Global Markets directory', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each([
    ['kuwait_boursa', 100, 'BOUBYAN.KW'], ['us_nasdaq', 3000, 'AMD'], ['us_nyse', 2000, 'IBM'],
    ['china_sse', 2000, '600000.SS'], ['china_szse', 2500, '000002.SZ'],
  ])('searches beyond the ticker selection in %s', async (exchange, minimum, symbol) => {
    const { rows, coverage } = await loadGlobalDirectory(String(exchange));
    expect(rows.length).toBeGreaterThan(Number(minimum));
    const result = paginateGlobalDirectory(rows, coverage, new URLSearchParams({ q: String(symbol) }));
    expect(result.items[0]?.symbol).toBe(symbol);
    expect(result.items[0]?.stripId).toBe(exchange);
    expect(result.coverage[0].count).toBe(rows.length);
    expect(result.coverage[0].status).toBe('snapshot');
  });
  it('keeps NASDAQ and NYSE separate and pages through every returned Kuwait instrument once', async () => {
    const { rows: nasdaq } = await loadGlobalDirectory('us_nasdaq');
    expect(nasdaq.some(row => row.symbol === 'IBM')).toBe(false);
    const { rows, coverage } = await loadGlobalDirectory('kuwait_boursa');
    const collected: string[] = [];
    let offset: number | null = 0;
    do {
      const result = paginateGlobalDirectory(rows, coverage, new URLSearchParams({ offset: String(offset), limit: '24' }));
      expect(result.items.length).toBeLessThanOrEqual(24);
      collected.push(...result.items.map(row => row.id)); offset = result.nextOffset;
    } while (offset !== null);
    expect(new Set(collected).size).toBe(rows.length);
    expect(collected).toHaveLength(rows.length);
  });
  it('applies country, sector and asset filters on the server and bounds oversized pages', async () => {
    const { rows, coverage } = await loadGlobalDirectory('all', 'KW');
    const result = paginateGlobalDirectory(rows, coverage, new URLSearchParams({ sector: 'bank', assetType: 'equity', limit: '1000000' }));
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(24);
    expect(result.items.every(row => row.countryCode === 'KW' && row.sector === 'bank')).toBe(true);
    expect(result.items.every(row => row.priceUnit === 'fils')).toBe(true);
  });
  it('reports incomplete and unconnected markets without manufacturing a full directory', async () => {
    const partial = await loadGlobalDirectory('saudi_tadawul');
    expect(partial.coverage[0].status).toBe('selected');
    const absent = await loadGlobalDirectory('egypt_egx');
    expect(absent.rows).toEqual([]);
    expect(absent.coverage[0]).toMatchObject({ count: 0, status: 'unavailable' });
  });
  it('expands regional directories while keeping proven quote mappings and unknown exchange totals', async () => {
    vi.mocked(getRegionalMarketDirectory).mockResolvedValueOnce({ rows: [
      { symbol: '2222', providerSymbol: 'TD:XSAU:2222', name: 'Saudi Aramco', currency: 'SAR' },
      { symbol: '1010', providerSymbol: 'TD:XSAU:1010', name: 'Riyad Bank', currency: 'SAR' },
    ], source: 'https://api.twelvedata.com/stocks?mic_code=XSAU', status: 'directory', checkedAt: '2026-09-18T00:00:00Z', lastSyncAt: '2026-09-18T00:00:00Z', sourceRecords: 2, excludedRecords: 0 });
    const result = await loadGlobalDirectory('saudi_tadawul');
    expect(result.rows.map(row => row.providerSymbol)).toEqual(['2222.SR', 'TD:XSAU:1010']);
    expect(result.rows[0].nameAr).toBe('أرامكو السعودية');
    expect(result.coverage[0]).toMatchObject({ count: 2, status: 'directory', expectedCount: null, asOf: null });
  });
  it('the API returns a bounded page and rejects unknown exchanges', async () => {
    const response = await GET(new Request('https://example.com/api/market-directory?exchange=china_szse&limit=12'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(12);
    expect(data.total).toBeGreaterThan(2500);
    expect(data.nextOffset).toBe(12);
    expect(JSON.stringify(data)).not.toContain('FINNHUB_API_KEY');
    const invalid = await GET(new Request('https://example.com/api/market-directory?exchange=made-up'));
    expect(invalid.status).toBe(400);
  });
});
