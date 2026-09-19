import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/markets-tv/catalog', () => ({ tvDirectoryAssets: vi.fn() }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { normalizeTvSelections } from '@/lib/markets-tv/selections';
import { localizeTvAsset } from '@/lib/server/markets-tv/names';
import { tvDirectoryAssets } from '@/lib/server/markets-tv/catalog';
import { GET } from '@/app/api/tv/instruments/route';
import { resolveAssetIdentity } from '@/lib/assetVisuals';
afterEach(() => vi.resetAllMocks());
describe('TV market instrument choices', () => {
  it('preserves 2,000 choices, empty choices, and market isolation through storage', () => {
    const selection = normalizeTvSelections(JSON.parse(JSON.stringify({ US: Array.from({ length: 2000 }, (_, i) => `QA${i}`), DFM: [], BOURSA_KUWAIT: ['NBK.KW','NBK.KW','<script>'] })));
    expect(selection.US).toHaveLength(2000); expect(selection.DFM).toEqual([]); expect(selection.BOURSA_KUWAIT).toEqual(['NBK.KW']);
    expect(selection.SSE).toBeUndefined(); expect(normalizeTvSelections(null)).toEqual({});
    expect(Object.hasOwn(normalizeTvSelections(JSON.parse('{"__proto__":["BAD"]}')), '__proto__')).toBe(false);
  });
  it('uses the Arabic company name and display ticker without losing its quote identity', () => {
    expect(localizeTvAsset({ symbol: 'NBK.KW', name: 'National Bank of Kuwait', nameAr: 'National Bank of Kuwait', region: 'BOURSA_KUWAIT' })).toMatchObject({ symbol: 'NBK.KW', displaySymbol: 'NBK', nameAr: 'بنك الكويت الوطني' });
    expect(localizeTvAsset({ symbol: 'NBK', name: 'Different issuer', region: 'US' }).nameAr).toBe('Different issuer');
    expect(resolveAssetIdentity({ symbol: 'NBK.KW', exchange: 'BOURSA_KUWAIT' }).verified?.logoUrl).toContain('www.nbk.com');
    expect(resolveAssetIdentity({ symbol: 'NBK', exchange: 'NYSE' }).verified).toBeNull();
  });
  it('paginates the full directory and searches Arabic names without loading quotes', async () => {
    vi.mocked(tvDirectoryAssets).mockResolvedValue([...Array.from({ length: 2000 }, (_, i) => ({ symbol: `QA${i}`, name: 'QA' })), { symbol: 'NBK.KW', name: 'National Bank of Kuwait', nameAr: 'بنك الكويت الوطني' }]);
    const page = await (await GET(new Request('https://www.the-sfm.com/api/tv/instruments?group=us&market=US&page=39'))).json();
    expect(page.total).toBe(2001); expect(page.items).toHaveLength(50); expect(page.items[49].symbol).toBe('QA1999');
    const query = new URLSearchParams({ group: 'gulf', market: 'BOURSA_KUWAIT', q: 'الكويت الوطني' });
    const result = await (await GET(new Request(`https://www.the-sfm.com/api/tv/instruments?${query}`))).json();
    expect(result.items.map((a: { symbol: string }) => a.symbol)).toEqual(['NBK.KW']);
    expect((await GET(new Request('https://www.the-sfm.com/api/tv/instruments?group=watchlist&market=US'))).status).toBe(400);
    expect((await GET(new Request('https://www.the-sfm.com/api/tv/instruments?group=us&market=US&page=-1'))).status).toBe(400);
  });
});
