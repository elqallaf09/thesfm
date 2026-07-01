import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTraderProviderStateForTests,
  getTraderCalendar,
  getTraderProviderStatus,
} from '@/lib/trader/providers/providerStatus';

const query = {
  from: '2026-07-01',
  to: '2026-07-31',
  range: '30' as const,
  force: true,
  symbols: ['AAPL', 'MSFT'],
};

function clearProviderEnvs() {
  vi.stubEnv('FMP_API_KEY', '');
  vi.stubEnv('FINNHUB_API_KEY', '');
  vi.stubEnv('TRADING_ECONOMICS_API_KEY', '');
}

afterEach(() => {
  __resetTraderProviderStateForTests();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('trader calendar providers', () => {
  it('returns a clean missing-provider state when FMP and Finnhub are absent', async () => {
    clearProviderEnvs();

    const result = await getTraderCalendar('earnings', query);

    expect(result.status).toBe('not_configured');
    expect(result.provider).toBeNull();
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_not_configured');
  });

  it('uses FMP first for earnings and normalizes earnings fields', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        date: '2026-07-15',
        fiscalDateEnding: '2026-06-30',
        epsEstimated: 1.48,
        eps: 1.52,
        revenueEstimated: 95000000000,
        time: 'amc',
      },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTraderCalendar('earnings', query);

    expect(result.status).toBe('success');
    expect(result.provider).toBe('fmp');
    expect(result.resultCount).toBe(1);
    expect(result.data[0]).toMatchObject({
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      reportDate: '2026-07-15',
      fiscalDateEnding: '2026-06-30',
      epsEstimate: 1.48,
      epsActual: 1.52,
      revenueEstimate: 95000000000,
      provider: 'fmp',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('financialmodelingprep.com/stable/earnings-calendar');
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('test-fmp-key');
  });

  it('treats a provider empty array as connected with no current events', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })));

    const result = await getTraderCalendar('dividends', query);

    expect(result.status).toBe('success');
    expect(result.provider).toBe('fmp');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('dividends_calendar_no_events');
  });

  it('reports provider plan blocks without fabricated IPOs', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'This endpoint is not included in your current plan',
    }), { status: 403 })));

    const result = await getTraderCalendar('ipos', query);

    expect(result.status).toBe('not_entitled');
    expect(result.provider).toBe('fmp');
    expect(result.data).toEqual([]);
    expect(result.messageCode).toBe('provider_access_denied');
  });

  it('falls back from FMP earnings to Finnhub when FMP is blocked', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'plan access required' }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        earningsCalendar: [
          {
            symbol: 'MSFT',
            date: '2026-07-20',
            epsEstimate: 2.91,
            epsActual: 2.97,
            revenueEstimate: 72000000000,
            hour: 'bmo',
          },
        ],
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTraderCalendar('earnings', query);

    expect(result.status).toBe('success');
    expect(result.provider).toBe('finnhub');
    expect(result.data[0]).toMatchObject({
      symbol: 'MSFT',
      reportDate: '2026-07-20',
      provider: 'finnhub',
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('finnhub.io/api/v1/calendar/earnings');
  });

  it('uses Trading Economics before FMP and Finnhub for economic events', async () => {
    clearProviderEnvs();
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-te-key');
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('FINNHUB_API_KEY', 'test-finnhub-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      {
        CalendarId: 'te-1',
        Date: '2026-07-05T12:30:00',
        Country: 'United States',
        Event: 'Non Farm Payrolls',
        Importance: 3,
        Previous: '142K',
        Forecast: '175K',
        Actual: '178K',
      },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTraderCalendar('economic', query);

    expect(result.status).toBe('success');
    expect(result.provider).toBe('tradingeconomics');
    expect(result.data[0]).toMatchObject({
      event: 'Non Farm Payrolls',
      country: 'United States',
      impact: 'high',
      provider: 'tradingeconomics',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('api.tradingeconomics.com/calendar');
  });

  it('keeps short cache entries to avoid over-calling providers', async () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { symbol: 'AAPL', companyName: 'Apple Inc.', date: '2026-07-15' },
    ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await getTraderCalendar('earnings', { ...query, force: false });
    const second = await getTraderCalendar('earnings', { ...query, force: false });

    expect(first.status).toBe('success');
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports configured provider status without returning secrets', () => {
    clearProviderEnvs();
    vi.stubEnv('FMP_API_KEY', 'test-fmp-key');
    vi.stubEnv('TRADING_ECONOMICS_API_KEY', 'test-te-key');

    const status = getTraderProviderStatus();

    expect(status.providers).toMatchObject({
      fmpConfigured: true,
      finnhubConfigured: false,
      tradingEconomicsConfigured: true,
    });
    expect(status.features.earnings.status).toBe('available');
    expect(status.features.economic.provider).toBe('tradingeconomics');
    expect(JSON.stringify(status)).not.toContain('test-fmp-key');
    expect(JSON.stringify(status)).not.toContain('test-te-key');
  });
});
