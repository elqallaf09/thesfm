import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), quote: vi.fn(), limit: vi.fn() }));
vi.mock('@/services/intelligence/assetResolver', () => ({ resolveCanonicalIntelligenceAsset: mocks.resolve }));
vi.mock('@/lib/market/marketDataProviders', () => ({ getQuoteWithFallback: mocks.quote }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.limit, getClientIp: () => '127.0.0.1' }));
import { GET } from '@/app/api/intelligence/asset-details/route';
const asset = { canonicalSymbol: 'NVDA', displaySymbol: 'NVDA', providerSymbol: 'NVDA', assetType: 'STOCK', name: 'NVIDIA Corporation', exchange: 'NASDAQ', market: 'NASDAQ', country: 'US', quoteCurrency: 'USD', logoUrl: null };
const req = (query = 'symbol=NVDA&assetType=STOCK') => new NextRequest(`https://example.test/api/intelligence/asset-details?${query}`);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.limit.mockReturnValue({ allowed: true });
  mocks.resolve.mockResolvedValue(asset);
  mocks.quote.mockResolvedValue({ ok: false, attempts: [], latestError: null });
});
describe('quote-only asset details', () => {
  it('rejects invalid symbols and unknown asset types before provider reads', async () => {
    expect((await GET(req('symbol=https://bad.test&assetType=STOCK'))).status).toBe(400);
    expect((await GET(req('symbol=NVDA&assetType=UNKNOWN'))).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('keeps verified identity when quotes are unavailable and never fills absent prices', async () => {
    const response = await GET(req());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, asset, quote: null, quoteStatus: 'unavailable' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('preserves null measurements, currency and provider timestamp without inventing indicators', async () => {
    mocks.quote.mockResolvedValue({ ok: true, data: { price: 100, currency: 'USD', change: null, changePercent: 0, open: null, volume: null, provider: 'finnhub', providerName: 'Finnhub', delayType: 'delayed', lastUpdated: '2026-09-15T10:00:00Z' } });
    const response = await GET(req());
    const body = await response.json();
    expect(body.quote).toMatchObject({ price: 100, change: null, changePercent: 0, open: null, volume: null, source: 'Finnhub', delay: 'delayed', observedAt: '2026-09-15T10:00:00.000Z' });
    expect(body.quote).not.toHaveProperty('indicators');
    expect(body.quote).not.toHaveProperty('risk');
    expect(body.quote).not.toHaveProperty('recommendation');
    expect(response.headers.get('x-correlation-id')).toBe(body.correlationId);
  });
  it('does not substitute fetch time for an unknown observation time', async () => {
    mocks.quote.mockResolvedValue({ ok: true, data: { price: 100, currency: 'USD', provider: 'yahoo', delayType: 'unknown', lastUpdated: 'invalid' } });
    expect((await (await GET(req())).json()).quote.observedAt).toBeNull();
  });
  it('enforces rate limits before any identity or market lookup', async () => {
    mocks.limit.mockReturnValue({ allowed: false, retryAfterSeconds: 25 });
    const response = await GET(req());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('25');
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
