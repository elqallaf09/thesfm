import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyRuntimeFailure, logReliabilityEvent } from '@/lib/runtime/reliability';

describe('runtime reliability diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [{ status: 401 }, 'UNAUTHORIZED'],
    [{ status: 403 }, 'FORBIDDEN'],
    [{ status: 404 }, 'NOT_FOUND'],
    [{ status: 429 }, 'RATE_LIMITED'],
    [{ status: 503 }, 'PROVIDER_MAINTENANCE'],
    [Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' }), 'TIMEOUT'],
    [Object.assign(new Error('certificate error'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), 'TLS_FAILURE'],
    [Object.assign(new Error('dns resolution'), { code: 'ENOTFOUND' }), 'DNS_FAILURE'],
    [Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }), 'PROVIDER_UNAVAILABLE'],
  ] as const)('classifies a failure as %s', (error, expected) => {
    expect(classifyRuntimeFailure(error).code).toBe(expected);
  });

  it('distinguishes semantic no-data, invalid-symbol, and guest restrictions', () => {
    expect(classifyRuntimeFailure(null, { noData: true }).code).toBe('NO_MARKET_DATA');
    expect(classifyRuntimeFailure(null, { invalidSymbol: true }).code).toBe('INVALID_SYMBOL');
    expect(classifyRuntimeFailure(null, { guestRestriction: true }).code).toBe('GUEST_RESTRICTION');
  });

  it('redacts sensitive metadata and truncates unbounded text', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logReliabilityEvent('error', 'provider_failed', {
      provider: 'primary',
      authorization: 'Bearer secret',
      apiKey: 'secret-key',
      detail: 'x'.repeat(400),
    });
    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(payload.provider).toBe('primary');
    expect(payload.authorization).toBeUndefined();
    expect(payload.apiKey).toBeUndefined();
    expect(payload.detail).toHaveLength(240);
  });
});
