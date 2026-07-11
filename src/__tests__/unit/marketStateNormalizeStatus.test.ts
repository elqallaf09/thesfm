import { describe, expect, it } from 'vitest';
import {
  normalizeFeatureDataStatus,
  normalizeProviderConnectionStatus,
  normalizeResearchStatus,
} from '@/lib/market-state/normalizeStatus';

describe('normalizeProviderConnectionStatus', () => {
  it('maps not_configured to misconfigured regardless of other flags', () => {
    expect(normalizeProviderConnectionStatus({ configured: false, healthy: true, status: 'healthy' })).toBe('misconfigured');
    expect(normalizeProviderConnectionStatus({ status: 'not_configured' })).toBe('misconfigured');
  });

  it('maps rate limiting to rate_limited even when otherwise healthy', () => {
    expect(normalizeProviderConnectionStatus({ configured: true, healthy: true, rateLimited: true })).toBe('rate_limited');
    expect(normalizeProviderConnectionStatus({ status: 'rate_limited' })).toBe('rate_limited');
  });

  it('maps ProviderHealthResult vocabulary (healthy|not_configured|error)', () => {
    expect(normalizeProviderConnectionStatus({ configured: true, status: 'healthy' })).toBe('connected');
    expect(normalizeProviderConnectionStatus({ configured: true, status: 'error' })).toBe('disconnected');
  });

  it('maps FmpRuntimeStatus vocabulary (healthy|rate_limited|not_configured|degraded)', () => {
    expect(normalizeProviderConnectionStatus({ configured: true, healthy: false, rateLimited: false, status: 'degraded' })).toBe('degraded');
  });

  it('maps ProxyState vocabulary (connected|degraded|slow|not_configured|unavailable)', () => {
    expect(normalizeProviderConnectionStatus({ status: 'slow' })).toBe('degraded');
    expect(normalizeProviderConnectionStatus({ status: 'unavailable' })).toBe('disconnected');
    expect(normalizeProviderConnectionStatus({ status: 'connected' })).toBe('connected');
  });

  it('a text hint of degraded overrides a stale healthy:true flag', () => {
    expect(normalizeProviderConnectionStatus({ healthy: true, status: 'degraded' })).toBe('degraded');
  });

  it('falls back to unknown when nothing is known', () => {
    expect(normalizeProviderConnectionStatus({})).toBe('unknown');
  });

  it('does not misread "unhealthy" as connected via its "healthy" substring', () => {
    expect(normalizeProviderConnectionStatus({ status: 'unhealthy' })).toBe('disconnected');
  });

  it('maps an intentionally-off provider to disabled, never to disconnected/error (task scenario: forbidden/not_entitled text)', () => {
    expect(normalizeProviderConnectionStatus({ configured: true, status: 'disabled' })).toBe('disabled');
    expect(normalizeProviderConnectionStatus({ configured: true, status: 'not_entitled' })).toBe('disabled');
    expect(normalizeProviderConnectionStatus({ configured: true, healthy: false, status: 'forbidden' })).toBe('disabled');
  });
});

describe('normalizeFeatureDataStatus', () => {
  it('never shows empty while loading, even with a zero-result payload', () => {
    const status = normalizeFeatureDataStatus({ isLoading: true, hasError: false, providerStatus: 'connected', requested: 5, returned: 0 });
    expect(status).toBe('loading');
  });

  it('never conflates a connection error with insufficient/empty data', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: true, providerStatus: 'disconnected' });
    expect(status).toBe('error');
  });

  it('reports unavailable (not disconnected) when only this capability is misconfigured', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: false, providerStatus: 'misconfigured' });
    expect(status).toBe('unavailable');
  });

  it('reports empty for a successful zero-result response', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: false, providerStatus: 'connected', requested: 5, returned: 0 });
    expect(status).toBe('empty');
  });

  it('reports partial when fewer records returned than requested', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: false, providerStatus: 'connected', requested: 25, returned: 18 });
    expect(status).toBe('partial');
  });

  it('reports stale when flagged stale and otherwise complete', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: false, providerStatus: 'connected', requested: 5, returned: 5, isStale: true });
    expect(status).toBe('stale');
  });

  it('reports fresh for a complete, non-stale, successful response', () => {
    const status = normalizeFeatureDataStatus({ isLoading: false, hasError: false, providerStatus: 'connected', requested: 5, returned: 5, isStale: false });
    expect(status).toBe('fresh');
  });
});

describe('normalizeResearchStatus', () => {
  it('maps insufficient market data explicitly, never as a generic failure', () => {
    const status = normalizeResearchStatus({ ok: false, dataStatus: 'unavailable', code: 'INSUFFICIENT_MARKET_DATA' });
    expect(status).toBe('insufficient_data');
  });

  it('maps a successful marketAgent response to completed', () => {
    const status = normalizeResearchStatus({ ok: true, dataStatus: 'available' });
    expect(status).toBe('completed');
  });

  it('maps a loading request to running regardless of other fields', () => {
    const status = normalizeResearchStatus({ isLoading: true, ok: false });
    expect(status).toBe('running');
  });

  it('maps any other failure code to failed', () => {
    expect(normalizeResearchStatus({ ok: false, code: 'PROVIDER_UNAVAILABLE' })).toBe('failed');
    expect(normalizeResearchStatus({ ok: false, code: 'INVALID_SYMBOL' })).toBe('failed');
  });
});
