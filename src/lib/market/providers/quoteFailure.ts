import type { ProviderAttemptFailure } from '@/lib/market/marketDataProviders';
/** Carries sanitized transport metadata through the fallback engine. */
export class QuoteProviderError extends Error {
  constructor(readonly status: number, message = 'provider_error', readonly retryAt?: string | null, readonly providerSymbol?: string) {
    super(message); this.name = 'QuoteProviderError';
  }
}

const failures = new Map<string, { until: number; failure: ProviderAttemptFailure }>();
export function cachedQuoteFailure(key: string): ProviderAttemptFailure | null {
  const entry = failures.get(key);
  if (entry && entry.until > Date.now()) return entry.failure;
  if (entry) failures.delete(key);
  return null;
}
export function rememberQuoteFailure(key: string, failure: ProviderAttemptFailure) {
  const retry = Date.parse(failure.retryAt || '');
  const until = Number.isFinite(retry) && retry > Date.now() ? retry
    : ['NOT_ENTITLED', 'FORBIDDEN', 'UNAUTHORIZED', 'INVALID_SYMBOL'].includes(failure.code) ? Date.now() + 300_000 : null;
  if (!until) return;
  if (failures.size >= 500) failures.delete(failures.keys().next().value!);
  failures.set(key, { until, failure: { ...failure, retryAt: new Date(until).toISOString() } });
  failure.retryAt = new Date(until).toISOString();
}
