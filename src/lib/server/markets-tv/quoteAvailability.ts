import type { ProviderAttemptFailure } from '@/lib/market/marketDataProviders';
import type { TvQuote } from '@/lib/markets-tv/types';

export function tvProviderFailure(attempts: ProviderAttemptFailure[]): Pick<TvQuote, 'issue' | 'retryAt'> {
  const limited = attempts.filter(attempt => attempt.code === 'RATE_LIMITED');
  if (limited.length) {
    // A long FMP cooldown must not hide Twelve Data's earlier recovery window.
    const retries = limited.map(attempt => Date.parse(attempt.retryAt || '')).filter(time => Number.isFinite(time) && time > Date.now());
    return { issue: 'rate_limited', retryAt: retries.length ? new Date(Math.min(...retries)).toISOString() : undefined };
  }
  const denied = attempts.find(attempt => ['NOT_ENTITLED', 'FORBIDDEN', 'UNAUTHORIZED', 'AUTHENTICATION_EXPIRED'].includes(attempt.code));
  if (denied) return { issue: 'access_denied', retryAt: denied.retryAt };
  if (attempts.some(attempt => attempt.code === 'TIMEOUT')) return { issue: 'timeout' };
  if (attempts.length && attempts.every(attempt => attempt.code === 'NOT_CONFIGURED')) return { issue: 'not_configured' };
  return { issue: 'provider_unavailable' };
}

/** A blocked source cannot suspend another provider's healthy quote stream. */
export function tvSnapshotRetryAt(quotes: TvQuote[], now = Date.now()): string | undefined {
  if (quotes.some(quote => !quote.issue && quote.price !== null && Number.isFinite(quote.price) && quote.price > 0)) return undefined;
  const next = quotes.map(quote => Date.parse(quote.retryAt || '')).filter(time => Number.isFinite(time) && time > now);
  return next.length ? new Date(Math.min(...next)).toISOString() : undefined;
}
