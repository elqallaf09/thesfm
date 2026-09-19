import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/market/growthFundamentals', () => ({ loadGrowthFundamentalsBatch: mocks.load }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: mocks.limit }));
import { GET } from '@/app/api/growth-stocks/fundamentals/route';
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockReturnValue(null); mocks.load.mockResolvedValue([{ symbol: 'NVDA', status: 'partial' }]); });
afterEach(() => { vi.restoreAllMocks(); });
it.each(['', 'A,B,C,D,E,F,G', '../etc/passwd', 'https://example.test'])('rejects invalid/bulk input without provider work: %s', async symbols => {
  const response = await GET(new Request(`https://local.test/api/growth-stocks/fundamentals?symbols=${encodeURIComponent(symbols)}`));
  expect(response.status).toBe(400); expect(mocks.load).not.toHaveBeenCalled();
});
describe('fundamentals route boundaries', () => {
  it('normalizes and deduplicates a bounded batch', async () => {
    const response = await GET(new Request('https://local.test/api/growth-stocks/fundamentals?symbols=nvda,NVDA,MSFT'));
    expect(mocks.load).toHaveBeenCalledWith(['NVDA', 'MSFT']); expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
  });
  it('backs off failures briefly and honours rate limiting', async () => {
    mocks.load.mockResolvedValue([{ symbol: 'NVDA', status: 'unavailable' }]);
    const response = await GET(new Request('https://local.test/api/growth-stocks/fundamentals?symbols=NVDA'));
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
    mocks.limit.mockReturnValue(new Response(null, { status: 429 })); mocks.load.mockClear();
    expect((await GET(new Request('https://local.test/api/growth-stocks/fundamentals?symbols=NVDA'))).status).toBe(429);
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
