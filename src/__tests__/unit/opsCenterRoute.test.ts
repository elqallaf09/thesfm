import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OperationsCenterState } from '@/lib/admin/opsCenter/types';

const mocks = vi.hoisted(() => ({
  requireAdminApiAccess: vi.fn(), requireSuperAdminApiAccess: vi.fn(), rateLimitRequest: vi.fn(),
  getOperationsCenterState: vi.fn(), getTraderMarketCatalog: vi.fn(), getEconomicCalendar: vi.fn(),
  getCalendarHealthMeasurement: vi.fn(),
}));

vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess: mocks.requireAdminApiAccess, requireSuperAdminApiAccess: mocks.requireSuperAdminApiAccess }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: mocks.rateLimitRequest }));
vi.mock('@/lib/admin/opsCenter/aggregateOperationsCenter', () => ({ getOperationsCenterState: mocks.getOperationsCenterState }));
vi.mock('@/lib/trader/marketCatalog', () => ({ getTraderMarketCatalog: mocks.getTraderMarketCatalog }));
vi.mock('@/lib/providers/economic-calendar', () => ({ getEconomicCalendar: mocks.getEconomicCalendar }));
vi.mock('@/lib/admin/opsCenter/calendarHealth', () => ({ getCalendarHealthMeasurement: mocks.getCalendarHealthMeasurement }));
vi.mock('@/lib/admin/opsCenter/healthTruth', () => ({ buildOperationsHealthSummary: (state: OperationsCenterState) => ({
  ...state,
  featureHealth: state.featureHealth.map(row => ({ ...row, ...state.featureMeasurements?.[row.feature] })),
}) }));

import { GET, POST } from '@/app/api/admin/ops-center/route';

const endpoint = 'https://example.test/api/admin/ops-center';
function request(action: string, headers: Record<string, string> = {}) {
  return new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test', ...headers }, body: JSON.stringify({ action }) });
}
function snapshot(status = 'healthy') {
  return {
    generatedAt: new Date().toISOString(), overview: { overall: 'healthy' },
    featureHealth: ['market_data', 'economic_calendar', 'ai_services', 'notifications', 'storage'].map(feature => ({ feature, status, detailKey: null })),
    featureMeasurements: {}, rootCause: [],
  };
}
function catalogFixture() {
  return {
    diagnostics: {
      generatedAt: new Date().toISOString(), totalSymbolsLoaded: 12, failedSymbols: [] as Array<{ provider: string; symbol: string; reason: string }>,
      cacheStatus: 'disabled', providerLatencyMs: { supabase: 8 as number | null }, summary: { failedSymbols: 0 },
    },
  };
}

describe('Operations Center administrative reads and actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: true, user: { id: 'test-admin' }, access: {}, admin: {} });
    mocks.rateLimitRequest.mockReturnValue(null);
    mocks.getOperationsCenterState.mockImplementation(async () => snapshot());
    mocks.getTraderMarketCatalog.mockImplementation(async () => catalogFixture());
    mocks.getEconomicCalendar.mockResolvedValue({ status: 'success', provider: 'sfm', data: [] });
    mocks.getCalendarHealthMeasurement.mockResolvedValue({ status: 'healthy', detailKey: null, evidence: [] });
  });

  it.each([401, 403])('preserves the %i access boundary for reads and actions before any probe', async status => {
    mocks.requireAdminApiAccess.mockResolvedValue({ ok: false, status, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' });
    expect((await GET(new Request(endpoint))).status).toBe(status);
    expect((await POST(request('check_service_health'))).status).toBe(status);
    expect(mocks.getOperationsCenterState).not.toHaveBeenCalled();
    expect(mocks.getTraderMarketCatalog).not.toHaveBeenCalled();
  });

  it('returns a private uncached canonical snapshot and forwards explicit read refresh', async () => {
    const response = await GET(new Request(`${endpoint}?forceFresh=1`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.requireAdminApiAccess).toHaveBeenCalledWith(expect.any(Request), 'admin_dashboard');
    expect(mocks.getOperationsCenterState).toHaveBeenCalledWith({ forceFresh: true });
    expect(await response.json()).toMatchObject({ ok: true, state: { featureHealth: expect.any(Array) } });
  });

  it('rejects cross-origin, malformed, and unsupported requests without executing anything', async () => {
    expect((await POST(request('check_service_health', { origin: 'https://other.test' }))).status).toBe(403);
    expect((await POST(request('check_service_health', { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect((await POST(request('check_service_health', { 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await POST(request('retry_shariah_job'))).status).toBe(400);
    expect((await POST(new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{invalid' }))).status).toBe(400);
    expect(mocks.getOperationsCenterState).not.toHaveBeenCalled();
  });

  it('rebuilds the symbol catalog before collecting its new snapshot', async () => {
    const response = await POST(request('refresh_symbol_catalog'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.getTraderMarketCatalog).toHaveBeenCalledWith({ forceFresh: true });
    expect(mocks.getTraderMarketCatalog.mock.invocationCallOrder[0]).toBeLessThan(mocks.getOperationsCenterState.mock.invocationCallOrder[0]);
    expect(mocks.getOperationsCenterState).toHaveBeenCalledWith({ forceFresh: true, forceServiceHealth: false, prefetchedCatalog: await mocks.getTraderMarketCatalog.mock.results[0].value });
    expect(body.result).toMatchObject({ actionId: 'refresh_symbol_catalog', messageKey: 'ops_center_action_catalog_refreshed', ok: true });
  });

  it('retains structured catalog source failures even when bundled symbols and the provider snapshot succeed', async () => {
    mocks.getTraderMarketCatalog.mockImplementation(async () => {
      const catalog = catalogFixture();
      catalog.diagnostics.failedSymbols = [{ provider: 'supabase', symbol: 'market_symbols', reason: 'supabase_market_symbols_query_failed' }];
      catalog.diagnostics.summary.failedSymbols = 1;
      return catalog;
    });
    const response = await POST(request('refresh_symbol_catalog'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({ ok: true, messageKey: 'ops_center_action_completed_with_findings' });
    expect(body.state.featureMeasurements.market_data).toMatchObject({ status: 'partial' });
    expect(body.state.featureMeasurements.market_data.evidence).toContainEqual(expect.objectContaining({
      provider: 'supabase', capability: 'symbols', status: 'failed', reason: 'supabase_market_symbols_query_failed',
      checkedAt: expect.any(String), lastSuccessAt: null,
    }));
  });

  it('reports an unmeasured catalog source when no live source query occurred', async () => {
    mocks.getTraderMarketCatalog.mockImplementation(async () => {
      const catalog = catalogFixture();
      catalog.diagnostics.providerLatencyMs.supabase = null;
      return catalog;
    });
    const body = await (await POST(request('refresh_symbol_catalog'))).json();
    expect(body.result.messageKey).toBe('ops_center_action_completed_measurements_missing');
    expect(body.state.featureMeasurements.market_data.evidence).toContainEqual(expect.objectContaining({
      provider: 'supabase', status: 'unmeasured', checkedAt: null, lastSuccessAt: null,
    }));
  });

  it('keeps the old timestamp when catalog refresh returns stale records', async () => {
    const oldSuccess = new Date(Date.now() - 60_000).toISOString();
    mocks.getTraderMarketCatalog.mockImplementation(async () => {
      const catalog = catalogFixture();
      catalog.diagnostics.generatedAt = oldSuccess;
      catalog.diagnostics.cacheStatus = 'stale';
      return catalog;
    });
    const body = await (await POST(request('refresh_symbol_catalog'))).json();
    expect(body.result.messageKey).toBe('ops_center_action_completed_measurements_missing');
    expect(body.state.featureMeasurements.market_data.evidence).toContainEqual(expect.objectContaining({
      status: 'unmeasured', lastSuccessAt: oldSuccess, reasonKey: 'ops_center_catalog_refresh_stale',
    }));
  });

  it('does not promote unrelated market capabilities after a successful catalog-only measurement', async () => {
    mocks.getOperationsCenterState.mockResolvedValue(snapshot('failed'));
    const body = await (await POST(request('refresh_symbol_catalog'))).json();
    expect(body.state.featureMeasurements.market_data.status).toBe('failed');
    expect(body.result.messageKey).toBe('ops_center_action_completed_with_findings');
  });

  it('redacts raw provider reasons before adding catalog evidence to the administrative response', async () => {
    mocks.getTraderMarketCatalog.mockImplementation(async () => {
      const catalog = catalogFixture();
      catalog.diagnostics.failedSymbols = [{ provider: 'supabase', symbol: 'market_symbols', reason: 'failed https://private.test?token=credential Bearer private-token user@example.test' }];
      return catalog;
    });
    const response = await POST(request('refresh_symbol_catalog'));
    const body = await response.text();
    for (const privateValue of ['private.test', 'credential', 'private-token', 'user@example.test']) expect(body).not.toContain(privateValue);
    expect(body).toContain('[redacted');
  });

  it('runs service checks without forcing an unrelated market catalog rebuild', async () => {
    const response = await POST(request('check_service_health'));
    expect(response.status).toBe(200);
    expect(mocks.getOperationsCenterState).toHaveBeenCalledWith({ forceFresh: false, forceServiceHealth: true });
    expect(mocks.getTraderMarketCatalog).not.toHaveBeenCalled();
    expect(mocks.getEconomicCalendar).not.toHaveBeenCalled();
  });

  it('keeps outstanding findings visible after a completed provider retry', async () => {
    mocks.getOperationsCenterState.mockResolvedValue(snapshot('partial'));
    const response = await POST(request('retry_market_providers'));
    expect(mocks.getOperationsCenterState).toHaveBeenCalledWith({ forceFresh: true, forceServiceHealth: false });
    expect(await response.json()).toMatchObject({ ok: true, result: { messageKey: 'ops_center_action_completed_with_findings' } });
  });

  it('reports missing measurements instead of claiming recovery', async () => {
    mocks.getOperationsCenterState.mockResolvedValue(snapshot('unmeasured'));
    const response = await POST(request('check_service_health'));
    expect(await response.json()).toMatchObject({ result: { messageKey: 'ops_center_action_completed_measurements_missing' } });
  });

  it('refreshes a broad calendar range and uses the actual returned source report', async () => {
    const actualReport = { status: 'success', provider: 'sfm', data: [], partial: true, checkedAt: new Date().toISOString() };
    mocks.getEconomicCalendar.mockResolvedValue(actualReport);
    const response = await POST(request('refresh_economic_calendar'));
    expect(response.status).toBe(200);
    const query = mocks.getEconomicCalendar.mock.calls[0][0];
    expect(query.force).toBe(true);
    expect(Date.parse(query.to) - Date.parse(query.from)).toBe(14 * 86_400_000);
    expect(query.currency).toBeUndefined();
    expect(mocks.getCalendarHealthMeasurement).toHaveBeenCalledWith(actualReport);
  });

  it('honors the action rate limit without probing or clearing provider cooldowns', async () => {
    mocks.rateLimitRequest.mockReturnValue(new Response('{}', { status: 429 }));
    expect((await POST(request('retry_market_providers'))).status).toBe(429);
    expect(mocks.getOperationsCenterState).not.toHaveBeenCalled();
    expect(mocks.requireAdminApiAccess).not.toHaveBeenCalled();
  });

  it('fails safely when a catalog refresh fails and does not claim completion', async () => {
    mocks.getTraderMarketCatalog.mockRejectedValue(new Error('upstream-secret-detail'));
    const response = await POST(request('refresh_symbol_catalog'));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('upstream-secret-detail');
    expect(text).not.toContain('ops_center_action_catalog_refreshed');
    expect(mocks.getOperationsCenterState).not.toHaveBeenCalled();
  });
});
