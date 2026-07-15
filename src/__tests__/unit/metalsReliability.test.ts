import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, __resetMetalsCacheForTests } from '@/app/api/market/metals/route';

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('metals provider resilience', () => {
  beforeEach(() => {
    __resetMetalsCacheForTests();
    vi.stubEnv('METALS_API_URL', 'https://primary.example/metals');
    vi.stubEnv('METALS_API_KEY', 'test-key');
    vi.stubEnv('EXCHANGE_API_URL', '');
    vi.stubEnv('EXCHANGE_API_KEY', '');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('retries a rate-limited primary, then uses the secondary provider without fabricating prices', async () => {
    let primaryCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('primary.example')) {
        primaryCalls += 1;
        return jsonResponse({ error: 'rate limited' }, 429, { 'retry-after': '0' });
      }
      if (url.includes('metals.live')) return jsonResponse([{ gold: 2400 }, { silver: 30 }]);
      if (url.includes('open.er-api.com')) return jsonResponse({ rates: { KWD: 0.307 } });
      throw new Error(`Unexpected request: ${url}`);
    });

    const response = await GET(new Request('http://localhost/api/market/metals?currency=KWD'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(primaryCalls).toBe(2);
    expect(payload.success).toBe(true);
    expect(payload.source).toBe('api');
    expect(payload.gold.price).toBeGreaterThan(0);
    expect(payload.silver.price).toBeGreaterThan(0);
  });

  it('returns stale cached prices after every live provider fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T10:00:00.000Z'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('primary.example')) return jsonResponse({ gold: { pricePerOunce: 2400 }, silver: { pricePerOunce: 30 }, currency: 'USD' });
      if (url.includes('open.er-api.com')) return jsonResponse({ rates: { KWD: 0.307 } });
      return jsonResponse({ error: 'not found' }, 404);
    });

    const first = await GET(new Request('http://localhost/api/market/metals?currency=KWD'));
    expect(first.status).toBe(200);
    vi.setSystemTime(new Date('2026-07-16T10:06:00.000Z'));
    fetchSpy.mockResolvedValue(jsonResponse({ error: 'not found' }, 404));

    const fallback = await GET(new Request('http://localhost/api/market/metals?currency=KWD'));
    const payload = await fallback.json();
    expect(fallback.status).toBe(200);
    expect(payload.source).toBe('cache');
    expect(payload.cached).toBe(true);
    expect(payload.stale).toBe(true);
    expect(payload.gold.price).toBeGreaterThan(0);
    expect(payload.silver.price).toBeGreaterThan(0);
  });

  it('returns an honest unavailable response when providers and cache are empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'not found' }, 404));
    const response = await GET(new Request('http://localhost/api/market/metals?currency=KWD'));
    const payload = await response.json();
    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.gold).toBeUndefined();
    expect(payload.silver).toBeUndefined();
    expect(payload.error).not.toContain('404');
  });
});
