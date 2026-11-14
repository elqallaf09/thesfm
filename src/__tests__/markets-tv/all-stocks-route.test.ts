import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ directory: vi.fn(), snapshot: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/server/markets-tv/catalog', () => ({ tvDirectoryAssets: mocks.directory }));
vi.mock('@/lib/server/markets-tv/snapshot', () => ({ loadTvSnapshot: mocks.snapshot }));
vi.mock('@/lib/server/markets-tv/devices', () => ({ getTvDevice: vi.fn(), ownedTvData: vi.fn() }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: mocks.limit }));
import { GET as directory } from '@/app/api/tv/instruments/route';
import { GET as snapshot } from '@/app/api/tv/snapshot/route';
const request = (query: string) => new Request(`https://www.the-sfm.com/api/tv/instruments?${query}`);
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockReturnValue(null); mocks.directory.mockResolvedValue(Array.from({ length: 83 }, (_, i) => ({ symbol: `QA${i}`, name: `Company ${i}`, nameAr: i === 82 ? 'بنك الاختبار' : `شركة ${i}`, region: 'US' }))); mocks.snapshot.mockResolvedValue({ quotes: [], total: 0 }); });
describe('all stocks directory', () => {
  it('pages the complete directory and searches beyond the visible page', async () => {
    const page = await (await directory(request('group=world&page=13&pageSize=6'))).json();
    expect(page).toMatchObject({ total: 83, directoryTotal: 83, page: 13, pageSize: 6 });
    expect(page.items.map((item: { symbol: string }) => item.symbol)).toEqual(['QA78', 'QA79', 'QA80', 'QA81', 'QA82']);
    const found = await (await directory(request(`group=world&pageSize=6&q=${encodeURIComponent('بنك')}`))).json();
    expect(found.items.map((item: { symbol: string }) => item.symbol)).toEqual(['QA82']);
    expect(found.total).toBe(1); expect(found.directoryTotal).toBe(83);
  });
  it('preserves market picker defaults and rejects unbounded or malformed queries', async () => {
    expect((await (await directory(request('group=us&market=US'))).json()).pageSize).toBe(50);
    for (const query of ['group=world&pageSize=0', 'group=world&pageSize=51', 'group=world&pageSize=1.5', 'group=world&market=../secret', 'group=watchlist', 'group=us', 'group=world&page=-1']) expect((await directory(request(query))).status).toBe(400);
    mocks.directory.mockClear(); mocks.limit.mockReturnValue(new Response('Limited', { status: 429 }));
    expect((await directory(request('group=world'))).status).toBe(429); expect(mocks.directory).not.toHaveBeenCalled();
  });
  it('quotes only bounded public directory selections, never an anonymous watchlist', async () => {
    const params = new URLSearchParams({ group: 'world', pageSize: '6', symbols: JSON.stringify(['QA1', 'QA82']) });
    expect((await snapshot(request(params.toString()))).status).toBe(200);
    expect(mocks.snapshot).toHaveBeenCalledWith('world', [], expect.objectContaining({ symbols: ['QA1', 'QA82'], pageSize: 6 }));
    for (const symbols of [[], Array.from({ length: 13 }, (_, i) => `QA${i}`), ['<script>']]) { params.set('symbols', JSON.stringify(symbols)); expect((await snapshot(request(params.toString()))).status).toBe(400); }
    params.set('symbols', '["QA1"]'); params.set('group', 'watchlist');
    expect((await snapshot(request(params.toString()))).status).toBe(400);
  });
});
