import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTraderCalendarRoutePayload } from '@/lib/trader/providers/calendarRoutePayload';
import type { TraderDividendEvent, TraderEarningsEvent, TraderProviderResult } from '@/lib/trader/providers/types';

vi.mock('@/lib/trader/providers/providerStatus', () => ({
  buildTraderCalendarQuery: vi.fn((params: URLSearchParams) => ({
    from: '2026-01-01', to: '2026-04-01', range: '90',
    symbols: (params.get('symbols') ?? '').split(',').map(symbol => symbol.trim().toUpperCase()).filter(Boolean),
  })),
  getTraderCalendar: vi.fn(),
}));

import { getTraderCalendar } from '@/lib/trader/providers/providerStatus';
import { GET as getEarnings } from '@/app/api/trader/calendar/earnings/route';
import { GET as getDividends } from '@/app/api/trader/calendar/dividends/route';

// Isolated fixtures; these are not live company financial data.
function earnings(symbol: string): TraderEarningsEvent {
  return {
    id: `fixture-${symbol}`, symbol, companyName: symbol, reportDate: '2026-02-01',
    fiscalDateEnding: null, epsEstimate: 1, epsActual: 0, epsSurprise: -1,
    revenueActual: null, revenueEstimate: null, time: null, source: 'Test fixture', provider: 'fmp',
  };
}

function dividend(symbol: string): TraderDividendEvent {
  return {
    id: `fixture-dividend-${symbol}`, symbol, companyName: symbol,
    declarationDate: null, exDividendDate: '2026-02-01', recordDate: null, paymentDate: null,
    dividendAmount: null, dividendYield: null, currency: null, source: 'Test fixture', provider: 'fmp',
  };
}

function result<T>(data: T[]): TraderProviderResult<T> {
  return {
    status: 'success', provider: 'fmp', data, cached: false, stale: false,
    lastUpdated: '2026-01-01T00:00:00.000Z', lastSuccessfulUpdate: '2026-01-01T00:00:00.000Z',
    resultCount: data.length, messageCode: null, failureReason: null, providerStatusCode: 200,
    supportedFeatures: ['earnings', 'dividends'], range: { key: '90', from: '2026-01-01', to: '2026-04-01' },
  };
}

afterEach(() => vi.clearAllMocks());

describe('symbol-scoped calendar response', () => {
  it('filters every data alias and count, without mutating cached provider rows', () => {
    const provider = result([earnings('MSFT'), earnings('AAPL')]);
    provider.resultCount = 77;
    const payload = createTraderCalendarRoutePayload('earnings', provider, [' msft ', 'MSFT']);
    expect(payload.data.map(item => item.symbol)).toEqual(['MSFT']);
    expect(payload.items).toEqual(payload.data);
    expect(payload.events).toEqual(payload.data);
    expect(payload.count).toBe(1);
    expect(payload.resultCount).toBe(1);
    expect(payload.total).toBe(1);
    expect(payload.diagnostics.count).toBe(1);
    expect(provider.data).toHaveLength(2);
    expect(payload.data[0].epsActual).toBe(0);
    expect(payload.data[0].revenueActual).toBeNull();
  });

  it('uses exact symbols, not substrings or ambiguous exchange suffix aliases', () => {
    const payload = createTraderCalendarRoutePayload('earnings', result([
      earnings('MSFT'), earnings('MSFT.MX'), earnings('MSFTX'), earnings('BRK.B'), earnings('BRK-B'),
    ]), ['MSFT', 'BRK.B']);
    expect(payload.data.map(item => item.symbol)).toEqual(['MSFT', 'BRK.B']);
  });

  it('reports a successful calendar with no matching symbol as empty', () => {
    const payload = createTraderCalendarRoutePayload('earnings', result([earnings('AAPL')]), ['MSFT']);
    expect(payload.status).toBe('empty');
    expect(payload.data).toEqual([]);
    expect(payload.count).toBe(0);
    expect(payload.messageCode).toBe('earnings_calendar_no_events');
    expect(payload.failureReason).toBeNull();
  });

  it.each(['rate_limited', 'provider_error', 'not_entitled'] as const)('does not hide %s as an empty success', status => {
    const provider = { ...result([earnings('AAPL')]), status, messageCode: 'provider_access_denied', failureReason: 'fixture failure' };
    const payload = createTraderCalendarRoutePayload('earnings', provider, ['MSFT']);
    expect(payload.status).toBe(status === 'not_entitled' ? 'unauthorized' : status);
    expect(payload.success).toBe(false);
    expect(payload.messageCode).toBe('provider_access_denied');
    expect(payload.failureReason).toBe('fixture failure');
  });

  it('preserves stale provenance while excluding unrelated cached events', () => {
    const provider = { ...result([earnings('AAPL'), earnings('MSFT')]), cached: true, stale: true, status: 'rate_limited' as const };
    const payload = createTraderCalendarRoutePayload('earnings', provider, ['MSFT']);
    expect(payload.data.map(item => item.symbol)).toEqual(['MSFT']);
    expect(payload.status).toBe('rate_limited');
    expect(payload.cached).toBe(true);
    expect(payload.stale).toBe(true);
    expect(payload.lastSuccessfulUpdate).toBe(provider.lastSuccessfulUpdate);
  });

  it('keeps the full calendar when no nonempty symbol filter was requested', () => {
    const provider = result([earnings('MSFT'), earnings('AAPL')]);
    expect(createTraderCalendarRoutePayload('earnings', provider).count).toBe(2);
    expect(createTraderCalendarRoutePayload('earnings', provider, [' ']).count).toBe(2);
  });

  it('scopes dividends without inventing missing amounts or currencies', () => {
    const payload = createTraderCalendarRoutePayload('dividends', result([dividend('AAPL'), dividend('MSFT')]), ['msft']);
    expect(payload.data.map(item => item.symbol)).toEqual(['MSFT']);
    expect(payload.data[0].dividendAmount).toBeNull();
    expect(payload.data[0].currency).toBeNull();
  });

  it.each([
    ['earnings', getEarnings], ['dividends', getDividends],
  ] as const)('applies the requested symbol at the %s HTTP boundary', async (feature, handler) => {
    const rows: Array<TraderEarningsEvent | TraderDividendEvent> = feature === 'earnings'
      ? [earnings('MSFT'), earnings('AAPL')] : [dividend('MSFT'), dividend('AAPL')];
    vi.mocked(getTraderCalendar).mockResolvedValueOnce(result(rows));
    const response = await handler(new Request(`https://example.test/api/trader/calendar/${feature}?symbols=msft&range=90`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.map((item: { symbol: string }) => item.symbol)).toEqual(['MSFT']);
    expect(body.count).toBe(1);
    expect(body.diagnostics.count).toBe(1);
    expect(getTraderCalendar).toHaveBeenCalledWith(feature, expect.objectContaining({ symbols: ['MSFT'] }));
  });
});
