import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fmpQueuedFetch: vi.fn(),
}));

vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({
  fmpQueuedFetch: (...args: unknown[]) => mocks.fmpQueuedFetch(...args),
}));

const query = {
  from: '2026-07-01',
  to: '2026-09-30',
  symbols: [{ symbol: 'KO', name: 'Coca-Cola', market: 'US', currency: 'USD' }],
  force: true,
};

beforeEach(() => {
  vi.resetModules();
  mocks.fmpQueuedFetch.mockReset();
  vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
  vi.stubEnv('FINNHUB_API_KEY', '');
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('dividend calendar provider status', () => {
  it('keeps a configured but unobserved provider unknown', async () => {
    const { getDividendCalendarProviderStatus } = await import('@/lib/providers/dividend-calendar');

    expect(getDividendCalendarProviderStatus()).toMatchObject({
      configured: true,
      provider: 'fmp',
      status: 'unknown',
      lastFetchStatus: null,
      lastFetchTime: null,
      lastSuccessfulUpdate: null,
    });
    expect(mocks.fmpQueuedFetch).not.toHaveBeenCalled();
  });

  it('retains a measured success instead of reverting to configuration-only status', async () => {
    mocks.fmpQueuedFetch.mockResolvedValue(new Response(JSON.stringify([
      { symbol: 'KO', companyName: 'Coca-Cola', date: '2026-07-12', dividend: 0.51 },
    ]), { status: 200 }));
    const { getDividendCalendar, getDividendCalendarProviderStatus } = await import('@/lib/providers/dividend-calendar');

    await expect(getDividendCalendar(query)).resolves.toMatchObject({ status: 'success', provider: 'fmp' });

    expect(getDividendCalendarProviderStatus()).toMatchObject({
      configured: true,
      provider: 'fmp',
      status: 'success',
      lastFetchStatus: 'success',
    });
  });

  it('retains a measured provider error', async () => {
    mocks.fmpQueuedFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
    const { getDividendCalendar, getDividendCalendarProviderStatus } = await import('@/lib/providers/dividend-calendar');

    await expect(getDividendCalendar(query)).resolves.toMatchObject({ status: 'forbidden', provider: 'fmp' });

    expect(getDividendCalendarProviderStatus()).toMatchObject({
      configured: true,
      provider: 'fmp',
      status: 'provider_error',
      lastFetchStatus: 'forbidden',
    });
  });

  it('retains a measured rate-limit cooldown', async () => {
    mocks.fmpQueuedFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'rate limit reached' }), { status: 429 }));
    const { getDividendCalendar, getDividendCalendarProviderStatus } = await import('@/lib/providers/dividend-calendar');

    await expect(getDividendCalendar(query)).resolves.toMatchObject({ status: 'rate_limited', provider: 'fmp' });

    expect(getDividendCalendarProviderStatus()).toMatchObject({
      configured: true,
      provider: 'fmp',
      status: 'rate_limited',
      lastFetchStatus: 'rate_limited',
    });
  });
});
