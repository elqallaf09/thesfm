import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sharia-stocks screening source connectivity', () => {
  const originalFmpKey = process.env.FMP_API_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalFmpKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalFmpKey;
    vi.resetModules();
  });

  it('does not present a configured but unobserved provider as connected', async () => {
    process.env.FMP_API_KEY = 'test-fmp-key';
    const { getShariahScreeningSourceStatus } = await import('@/lib/market/shariahUniverse');
    const status = getShariahScreeningSourceStatus();
    expect(status.connected).toBe(false);
    expect(status.source).toBeNull();
    expect(status.sourceName).toBeNull();
  });

  it('reflects an observed FMP success as connected', async () => {
    process.env.FMP_API_KEY = 'test-fmp-key';
    const { markFmpSuccess } = await import('@/lib/trader/providers/fmpRuntime');
    markFmpSuccess();
    const { getShariahScreeningSourceStatus } = await import('@/lib/market/shariahUniverse');
    const status = getShariahScreeningSourceStatus();
    expect(status.connected).toBe(true);
    expect(status.source).toBe('fmp');
    expect(status.sourceName).toBeTruthy();
  });

  it('reports disconnected (not a fabricated true) when no provider is configured', async () => {
    delete process.env.FMP_API_KEY;
    const { getShariahScreeningSourceStatus } = await import('@/lib/market/shariahUniverse');
    const status = getShariahScreeningSourceStatus();
    expect(status.connected).toBe(false);
    expect(status.source).toBeNull();
    expect(status.sourceName).toBeNull();
  });
});
