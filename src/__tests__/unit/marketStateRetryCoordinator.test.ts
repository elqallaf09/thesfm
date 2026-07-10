import { describe, expect, it } from 'vitest';
import {
  beginRetry,
  cancelRetry,
  completeRetryFailure,
  completeRetrySuccess,
  computeNextRetryState,
  INITIAL_RETRY_STATE,
} from '@/lib/market-state/retryCoordinator';

describe('computeNextRetryState', () => {
  it('allows the first retry with exponential backoff starting at the base delay', () => {
    const next = computeNextRetryState(INITIAL_RETRY_STATE, 1_000_000);
    expect(next.canRetry).toBe(true);
    expect(next.attempt).toBe(1);
    expect(next.backoffMs).toBe(2_000);
  });

  it('doubles the backoff on each successive attempt, capped at the maximum', () => {
    const now = 1_000_000;
    const afterOne = completeRetryFailure(beginRetry(INITIAL_RETRY_STATE), 'network_error', { now });
    const second = computeNextRetryState(afterOne, now);
    expect(second.backoffMs).toBe(4_000);

    const afterTwo = completeRetryFailure(beginRetry(afterOne), 'network_error', { now });
    const third = computeNextRetryState(afterTwo, now);
    expect(third.backoffMs).toBeLessThanOrEqual(30_000);
  });

  it('refuses to retry past the max attempt count — never retries forever', () => {
    let state = INITIAL_RETRY_STATE;
    const now = 1_000_000;
    for (let i = 0; i < 3; i += 1) {
      state = completeRetryFailure(beginRetry(state), 'network_error', { now });
    }
    const next = computeNextRetryState(state, now, { maxAttempts: 3 });
    expect(next.canRetry).toBe(false);
    expect(next.reason).toBe('max_attempts_reached');
  });

  it('enforces a cooldown window after a rate-limited failure and reports next allowed retry time', () => {
    const now = 1_000_000;
    const rateLimitedUntil = now + 45_000;
    const afterFailure = completeRetryFailure(beginRetry(INITIAL_RETRY_STATE), 'provider_rate_limited', { rateLimited: true, rateLimitedUntil, now });
    const duringCooldown = computeNextRetryState(afterFailure, now + 1_000);
    expect(duringCooldown.canRetry).toBe(false);
    expect(duringCooldown.reason).toBe('cooldown_active');
    expect(duringCooldown.nextAllowedAt).toBe(rateLimitedUntil);

    const afterCooldown = computeNextRetryState(afterFailure, rateLimitedUntil + 1);
    expect(afterCooldown.canRetry).toBe(true);
  });

  it('rejects a duplicate concurrent retry while one is already in flight', () => {
    const inFlight = beginRetry(INITIAL_RETRY_STATE);
    const next = computeNextRetryState(inFlight, 1_000_000);
    expect(next.canRetry).toBe(false);
    expect(next.reason).toBe('already_in_flight');
  });

  it('resets fully on success, allowing a fresh full attempt budget afterward', () => {
    const afterSuccess = completeRetrySuccess();
    expect(afterSuccess).toEqual(INITIAL_RETRY_STATE);
    const next = computeNextRetryState(afterSuccess, 1_000_000);
    expect(next.attempt).toBe(1);
  });

  it('cancellation clears in-flight without incrementing the attempt count', () => {
    const inFlight = beginRetry(INITIAL_RETRY_STATE);
    const cancelled = cancelRetry(inFlight);
    expect(cancelled.inFlight).toBe(false);
    expect(cancelled.attempt).toBe(INITIAL_RETRY_STATE.attempt);
  });
});
