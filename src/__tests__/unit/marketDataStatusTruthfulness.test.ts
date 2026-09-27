import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getConfiguredProviderDescriptors = vi.fn();
const getEconomicCalendarProviderStatus = vi.fn();
const getEconomicDataProviderStatus = vi.fn();
const getMarketSystemState = vi.fn();

vi.mock('@/lib/market-news/registry', () => ({
  getConfiguredProviderDescriptors: (...args: unknown[]) => getConfiguredProviderDescriptors(...args),
}));
vi.mock('@/lib/providers/economic-calendar', () => ({
  getEconomicCalendarProviderStatus: (...args: unknown[]) => getEconomicCalendarProviderStatus(...args),
}));
vi.mock('@/lib/providers/economic-data', () => ({
  getEconomicDataProviderStatus: (...args: unknown[]) => getEconomicDataProviderStatus(...args),
}));
vi.mock('@/lib/market-state/aggregateMarketState', () => ({
  getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args),
}));
vi.mock('@/lib/market-state/publicState', () => ({
  sanitizeMarketSystemStateForPublic: (state: unknown) => state,
}));

function newsDescriptor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rss-yahoo-us-market',
    name: 'Yahoo Finance U.S. Market RSS',
    enabled: true,
    configured: true,
    sourceNetworkId: 'yahoo.com',
    sourceDomain: 'finance.yahoo.com',
    officialSource: false,
    supportedMarkets: ['US'],
    ...overrides,
  };
}

function stateWithNews(status: string, configured = true) {
  return {
    capabilityMatrix: [{
      provider: 'rss',
      capability: 'news',
      status,
      configured,
      healthy: status === 'connected',
    }],
  };
}

describe('market-data status news truthfulness', () => {
  beforeEach(() => {
    vi.resetModules();
    getConfiguredProviderDescriptors.mockReset().mockReturnValue([newsDescriptor()]);
    getEconomicCalendarProviderStatus.mockReset().mockReturnValue({ status: 'unknown' });
    getEconomicDataProviderStatus.mockReset().mockReturnValue({ status: 'unknown' });
    getMarketSystemState.mockReset().mockResolvedValue(stateWithNews('unknown'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('keeps configured but unobserved news sources unknown', async () => {
    const { GET } = await import('@/app/api/market-data/status/route');
    const response = await GET();
    const body = await response.json();

    expect(body.news).toMatchObject({
      configured: true,
      status: 'unknown',
      providerCount: 1,
    });
  });

  it('reports available only after the unified state contains a successful news observation', async () => {
    getMarketSystemState.mockResolvedValue(stateWithNews('connected'));

    const { GET } = await import('@/app/api/market-data/status/route');
    const body = await (await GET()).json();

    expect(body.news.status).toBe('available');
  });

  it('does not treat disabled or absent sources as configured', async () => {
    getConfiguredProviderDescriptors.mockReturnValue([newsDescriptor({ enabled: false, configured: true })]);

    const { GET } = await import('@/app/api/market-data/status/route');
    const body = await (await GET()).json();

    expect(body.news).toMatchObject({ configured: false, status: 'not_configured', providerCount: 0 });
  });
});

describe('legacy Finnhub news status', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not call a configured API key available before it has observed a request', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.resetModules();

    const { getMarketNewsProviderStatus } = await import('@/lib/providers/news');

    expect(getMarketNewsProviderStatus()).toEqual({
      configured: true,
      provider: 'finnhub',
      status: 'unknown',
    });
  });
});
