import { describe, expect, it } from 'vitest';
import { ProviderError } from '@/lib/providers/shared';
import { classifyProviderError } from '@/lib/market-state/errorClassification';

describe('classifyProviderError', () => {
  it('never leaks a raw HTTP status like "http_429" for a rate-limit error', () => {
    const classified = classifyProviderError(new ProviderError('rate_limited', 'provider_rate_limited', 429, 'Too Many Requests'));
    expect(classified.code).not.toMatch(/http_?429/i);
    expect(classified.category).toBe('rate_limit');
    expect(classified.retryable).toBe(true);
    expect(classified.messageKey).toBe('provider_rate_limited');
  });

  it('classifies a not_configured ProviderError as non-retryable', () => {
    const classified = classifyProviderError(new ProviderError('not_configured', 'provider_not_configured'));
    expect(classified.category).toBe('not_configured');
    expect(classified.retryable).toBe(false);
  });

  it('classifies a raw HTTP-like error object without leaking the numeric status as the code', () => {
    const classified = classifyProviderError({ status: 429, message: 'rate limited' });
    expect(classified.code).not.toBe('429');
    expect(classified.category).toBe('rate_limit');
  });

  it('classifies a timeout error message as retryable', () => {
    const classified = classifyProviderError(new Error('Request timeout after 10s'));
    expect(classified.category).toBe('timeout');
    expect(classified.retryable).toBe(true);
  });

  it.each([
    [401, 'authentication', false],
    [403, 'permission', false],
    [404, 'not_found', false],
    [429, 'rate_limit', true],
    [503, 'provider', true],
    [500, 'server', true],
  ] as const)('keeps HTTP %s distinct as %s', (status, category, retryable) => {
    const classified = classifyProviderError({ status });
    expect(classified.category).toBe(category);
    expect(classified.retryable).toBe(retryable);
  });

  it.each([
    [Object.assign(new Error('certificate verify failed'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), 'tls'],
    [Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' }), 'dns'],
    [Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }), 'provider'],
  ] as const)('classifies transport failures without collapsing them', (error, category) => {
    expect(classifyProviderError(error).category).toBe(category);
  });

  it('classifies a malformed/unknown error as a safe, retryable unknown category', () => {
    const classified = classifyProviderError('some unexpected non-error value');
    expect(classified.category).toBe('unknown');
    expect(classified.messageKey).toBe('provider_temporarily_unavailable');
  });
});
