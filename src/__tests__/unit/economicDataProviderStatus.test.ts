import { afterEach, describe, expect, it, vi } from 'vitest';

function clearEconomicDataProviderKeys() {
  vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
  vi.stubEnv('FRED_API_KEY', '');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('economic data provider status', () => {
  it('keeps a configured but unobserved provider unknown', async () => {
    clearEconomicDataProviderKeys();
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-trading-economics-key');

    const { getEconomicDataProviderStatus } = await import('@/lib/providers/economic-data');

    expect(getEconomicDataProviderStatus()).toEqual({
      provider: 'tradingeconomics',
      configured: true,
      status: 'unknown',
      lastFetchStatus: null,
      lastFetchTime: null,
    });
  });

  it('marks a provider available only after an observed response', async () => {
    clearEconomicDataProviderKeys();
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-trading-economics-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));

    const { getEconomicCalendar, getEconomicDataProviderStatus } = await import('@/lib/providers/economic-data');
    const result = await getEconomicCalendar({ from: '2026-09-01', to: '2026-09-30' });

    expect(result).toEqual({ provider: 'tradingeconomics', data: [] });
    expect(getEconomicDataProviderStatus()).toMatchObject({
      provider: 'tradingeconomics',
      configured: true,
      status: 'available',
      lastFetchStatus: 'success',
      lastFetchTime: expect.any(String),
    });
  });

  it('retains an observed provider failure instead of reporting availability', async () => {
    clearEconomicDataProviderKeys();
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-trading-economics-key');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 })));

    const { getEconomicCalendar, getEconomicDataProviderStatus } = await import('@/lib/providers/economic-data');
    const result = await getEconomicCalendar({ from: '2026-09-01', to: '2026-09-30' });

    expect(result).toEqual({ provider: 'tradingeconomics', data: [] });
    expect(getEconomicDataProviderStatus()).toMatchObject({
      provider: 'tradingeconomics',
      configured: true,
      status: 'error',
      lastFetchStatus: 'TRADING_ECONOMICS_HTTP_503',
      lastFetchTime: expect.any(String),
    });
  });
});
