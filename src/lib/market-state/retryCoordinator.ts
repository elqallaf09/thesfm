export type RetryAction = 'retry_feature' | 'retry_failed_providers' | 'retry_all';

export type RetryState = {
  attempt: number;
  inFlight: boolean;
  lastFailureReason: string | null;
  cooldownUntil: number | null;
};

export type NextRetryState = {
  attempt: number;
  backoffMs: number;
  nextAllowedAt: number;
  cooldownUntil: number | null;
  canRetry: boolean;
  reason: 'ok' | 'max_attempts_reached' | 'cooldown_active' | 'already_in_flight';
};

export const INITIAL_RETRY_STATE: RetryState = {
  attempt: 0,
  inFlight: false,
  lastFailureReason: null,
  cooldownUntil: null,
};

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;

function backoffForAttempt(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
}

/**
 * Pure, framework-agnostic retry state machine — no fetch calls here. The React hooks (and,
 * potentially later, the vanilla-JS trader terminal) call this before firing a retry request.
 * Enforces: max attempt count, exponential backoff, cooldown after a known rate-limit window,
 * and rejection of concurrent duplicate retries. Never retries forever.
 */
export function computeNextRetryState(
  current: RetryState,
  now: number,
  options: { maxAttempts?: number; knownCooldownUntil?: number | null } = {},
): NextRetryState {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  if (current.inFlight) {
    return { attempt: current.attempt, backoffMs: 0, nextAllowedAt: now, cooldownUntil: current.cooldownUntil, canRetry: false, reason: 'already_in_flight' };
  }
  if (current.cooldownUntil !== null && current.cooldownUntil > now) {
    return { attempt: current.attempt, backoffMs: current.cooldownUntil - now, nextAllowedAt: current.cooldownUntil, cooldownUntil: current.cooldownUntil, canRetry: false, reason: 'cooldown_active' };
  }
  if (current.attempt >= maxAttempts) {
    return { attempt: current.attempt, backoffMs: 0, nextAllowedAt: now, cooldownUntil: current.cooldownUntil, canRetry: false, reason: 'max_attempts_reached' };
  }

  const nextAttempt = current.attempt + 1;
  const cooldownUntil = options.knownCooldownUntil ?? null;
  const backoffMs = cooldownUntil !== null ? Math.max(0, cooldownUntil - now) : backoffForAttempt(nextAttempt);

  return {
    attempt: nextAttempt,
    backoffMs,
    nextAllowedAt: now + backoffMs,
    cooldownUntil,
    canRetry: true,
    reason: 'ok',
  };
}

export function beginRetry(current: RetryState): RetryState {
  return { ...current, inFlight: true };
}

export function completeRetrySuccess(): RetryState {
  return { ...INITIAL_RETRY_STATE };
}

export function completeRetryFailure(
  current: RetryState,
  reason: string,
  options: { rateLimited?: boolean; rateLimitedUntil?: number | null; now?: number } = {},
): RetryState {
  const now = options.now ?? Date.now();
  const cooldownUntil = options.rateLimited ? (options.rateLimitedUntil ?? now + DEFAULT_RATE_LIMIT_COOLDOWN_MS) : null;
  return {
    attempt: current.attempt + 1,
    inFlight: false,
    lastFailureReason: reason,
    cooldownUntil,
  };
}

export function cancelRetry(current: RetryState): RetryState {
  return { ...current, inFlight: false };
}
