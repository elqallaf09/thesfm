import { classifyRuntimeFailure } from '@/lib/runtime/reliability';

export type ScanFailureCategory =
  | 'auth'
  | 'not_found'
  | 'rate_limit'
  | 'transient'
  | 'no_data'
  | 'aborted'
  | 'unknown';

export type ClassifiedScanFailure = {
  category: ScanFailureCategory;
  retryable: boolean;
  httpStatus: number | null;
};

const HTTP_STATUS_PATTERN = /^provider_http_(\d{3})$/;

const NON_RETRYABLE_DATA_REASONS = new Set([
  'provider_returned_empty_quote',
  'insufficient_history',
  'provider_returned_empty_history',
  'no_provider_symbol_configured',
  'invalid_symbol',
]);

export function extractHttpStatus(reason?: string | null): number | null {
  if (!reason) return null;
  const match = HTTP_STATUS_PATTERN.exec(reason);
  return match ? Number(match[1]) : null;
}

export function classifyScanFailure(reason?: string | null): ClassifiedScanFailure {
  if (!reason) return { category: 'unknown', retryable: false, httpStatus: null };
  if (reason === 'deadline_exceeded' || reason === 'circuit_open') {
    return { category: 'aborted', retryable: false, httpStatus: null };
  }
  if (NON_RETRYABLE_DATA_REASONS.has(reason)) {
    return { category: 'no_data', retryable: false, httpStatus: extractHttpStatus(reason) };
  }

  const httpStatus = extractHttpStatus(reason);
  const classified = classifyRuntimeFailure(new Error(reason), { httpStatus });

  if (classified.category === 'authentication' || classified.category === 'permission') {
    return { category: 'auth', retryable: false, httpStatus };
  }
  if (classified.category === 'not_found') {
    return { category: 'not_found', retryable: false, httpStatus };
  }
  if (classified.category === 'rate_limit') {
    return { category: 'rate_limit', retryable: true, httpStatus };
  }
  if (classified.retryable) {
    return { category: 'transient', retryable: true, httpStatus };
  }
  return { category: 'unknown', retryable: false, httpStatus };
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Deadline = {
  expired(): boolean;
  remainingMs(): number;
};

export function createDeadline(budgetMs: number): Deadline {
  const startedAt = Date.now();
  const endsAt = startedAt + Math.max(0, budgetMs);
  return {
    expired: () => Date.now() >= endsAt,
    remainingMs: () => Math.max(0, endsAt - Date.now()),
  };
}

export type ConcurrencyRunResult<R> = {
  results: (R | undefined)[];
  processedCount: number;
  stopped: boolean;
};

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  options: { shouldStop?: () => boolean } = {},
): Promise<ConcurrencyRunResult<R>> {
  const results = new Array<R | undefined>(items.length);
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let cursor = 0;
  let processedCount = 0;
  let stopped = false;

  async function workerLoop() {
    for (;;) {
      if (options.shouldStop?.()) {
        stopped = true;
        return;
      }
      if (cursor >= items.length) return;
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
      processedCount += 1;
    }
  }

  await Promise.all(Array.from({ length: limit }, () => workerLoop()));
  return { results, processedCount, stopped };
}

export type RetryOptions<T> = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable: (result: T) => boolean;
  getRetryAfterMs?: (result: T) => number | null;
  shouldAbort?: () => boolean;
  onRetry?: (attempt: number, delayMs: number) => void;
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    const result = await fn();
    if (!options.isRetryable(result)) return result;
    if (attempt >= options.maxRetries) return result;
    if (options.shouldAbort?.()) return result;

    const backoff = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt);
    const jittered = backoff * (0.5 + Math.random() * 0.5);
    const retryAfterMs = options.getRetryAfterMs?.(result) ?? null;
    const delayMs = Math.min(options.maxDelayMs, retryAfterMs ?? jittered);

    attempt += 1;
    options.onRetry?.(attempt, delayMs);
    await sleep(delayMs);
  }
}

export type CircuitBreakerState = 'closed' | 'open';

export class ScanCircuitBreaker {
  private outcomes: boolean[] = [];
  private openedUntil = 0;

  constructor(
    private readonly windowSize = 20,
    private readonly openThreshold = 12,
    private readonly cooldownMs = 20_000,
  ) {}

  record(isBreakerRelevantFailure: boolean) {
    this.outcomes.push(isBreakerRelevantFailure);
    if (this.outcomes.length > this.windowSize) this.outcomes.shift();
    const failureCount = this.outcomes.filter(Boolean).length;
    if (this.outcomes.length >= this.windowSize && failureCount >= this.openThreshold) {
      this.openedUntil = Date.now() + this.cooldownMs;
    }
  }

  isOpen(): boolean {
    if (this.openedUntil === 0) return false;
    if (Date.now() >= this.openedUntil) {
      this.openedUntil = 0;
      this.outcomes = [];
      return false;
    }
    return true;
  }

  state(): CircuitBreakerState {
    return this.isOpen() ? 'open' : 'closed';
  }
}

export type RejectedSymbolReason = 'empty' | 'invalid_format' | 'duplicate';

export type RejectedSymbol = {
  symbol: string;
  reasonCode: RejectedSymbolReason;
};

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.$-]{0,9}$/;

export function normalizeAndDedupeSymbols<T extends { symbol: string }>(
  assets: T[],
): { accepted: T[]; rejected: RejectedSymbol[] } {
  const seen = new Set<string>();
  const accepted: T[] = [];
  const rejected: RejectedSymbol[] = [];

  for (const asset of assets) {
    const symbol = asset.symbol?.trim().toUpperCase();
    if (!symbol) {
      rejected.push({ symbol: asset.symbol || '', reasonCode: 'empty' });
      continue;
    }
    if (!SYMBOL_PATTERN.test(symbol)) {
      rejected.push({ symbol, reasonCode: 'invalid_format' });
      continue;
    }
    if (seen.has(symbol)) {
      rejected.push({ symbol, reasonCode: 'duplicate' });
      continue;
    }
    seen.add(symbol);
    accepted.push(asset);
  }

  return { accepted, rejected };
}

export function dedupeProviderCandidates(candidates: (string | null | undefined)[]): string[] {
  return Array.from(new Set(candidates.filter((value): value is string => Boolean(value))));
}
