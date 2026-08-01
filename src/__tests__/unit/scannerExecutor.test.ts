import { describe, expect, it, vi } from 'vitest';
import {
  classifyScanFailure,
  createDeadline,
  dedupeProviderCandidates,
  normalizeAndDedupeSymbols,
  runWithConcurrency,
  ScanCircuitBreaker,
  withRetry,
} from '@/lib/trader/scannerExecutor';

describe('runWithConcurrency', () => {
  it('never exceeds the configured concurrency limit', async () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    let active = 0;
    let maxActive = 0;

    const { processedCount, stopped } = await runWithConcurrency(items, 5, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return item * 2;
    });

    expect(maxActive).toBeLessThanOrEqual(5);
    expect(processedCount).toBe(30);
    expect(stopped).toBe(false);
  });

  it('stops dispatching new work once the deadline/shouldStop signal trips', async () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    let processed = 0;
    const { processedCount, stopped } = await runWithConcurrency(items, 4, async (item) => {
      processed += 1;
      await new Promise((resolve) => setTimeout(resolve, 2));
      return item;
    }, {
      shouldStop: () => processed >= 8,
    });

    expect(stopped).toBe(true);
    expect(processedCount).toBeLessThan(50);
    expect(processedCount).toBeGreaterThan(0);
  });
});

describe('dedupeProviderCandidates', () => {
  it('collapses an identical provider/display symbol pair into a single candidate', () => {
    expect(dedupeProviderCandidates(['AAPL', 'AAPL'])).toEqual(['AAPL']);
  });

  it('keeps distinct provider mappings (e.g. preferred share suffixes)', () => {
    expect(dedupeProviderCandidates(['ABR-D', 'ABR$D'])).toEqual(['ABR-D', 'ABR$D']);
  });

  it('drops empty/null candidates', () => {
    expect(dedupeProviderCandidates(['AAPL', null, undefined, ''])).toEqual(['AAPL']);
  });
});

describe('normalizeAndDedupeSymbols', () => {
  it('rejects malformed symbols before they would reach the provider', () => {
    const { accepted, rejected } = normalizeAndDedupeSymbols([
      { symbol: 'AAPL' },
      { symbol: 'bad symbol!!' },
      { symbol: '' },
    ]);
    expect(accepted.map((a) => a.symbol)).toEqual(['AAPL']);
    expect(rejected).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: 'BAD SYMBOL!!', reasonCode: 'invalid_format' }),
      expect.objectContaining({ reasonCode: 'empty' }),
    ]));
  });

  it('deduplicates repeated symbols with a structured reason code', () => {
    const { accepted, rejected } = normalizeAndDedupeSymbols([
      { symbol: 'AAPL' },
      { symbol: 'aapl' },
    ]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toEqual([{ symbol: 'AAPL', reasonCode: 'duplicate' }]);
  });
});

describe('classifyScanFailure', () => {
  it('classifies 401 as permanent auth failure', () => {
    expect(classifyScanFailure('provider_http_401')).toEqual({ category: 'auth', retryable: false, httpStatus: 401 });
  });

  it('classifies 403 as permanent auth failure', () => {
    const result = classifyScanFailure('provider_http_403');
    expect(result.category).toBe('auth');
    expect(result.retryable).toBe(false);
  });

  it('classifies 404 as permanent not_found failure', () => {
    expect(classifyScanFailure('provider_http_404')).toEqual({ category: 'not_found', retryable: false, httpStatus: 404 });
  });

  it('classifies 429 as retryable rate_limit failure', () => {
    expect(classifyScanFailure('provider_http_429')).toEqual({ category: 'rate_limit', retryable: true, httpStatus: 429 });
  });

  it('classifies 5xx as retryable transient failure', () => {
    const result = classifyScanFailure('provider_http_503');
    expect(result.category).toBe('transient');
    expect(result.retryable).toBe(true);
  });

  it('classifies empty-data reasons as permanent no_data (not retryable)', () => {
    expect(classifyScanFailure('provider_returned_empty_quote').retryable).toBe(false);
    expect(classifyScanFailure('insufficient_history').retryable).toBe(false);
  });
});

describe('withRetry', () => {
  it('does not retry a permanent 404 failure', async () => {
    const fn = vi.fn(async () => ({ ok: false as const, reason: 'provider_http_404' }));
    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 5,
      maxDelayMs: 20,
      isRetryable: (r) => !r.ok && classifyScanFailure(r.reason).retryable,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
  });

  it('does not retry a permanent 401 failure', async () => {
    const fn = vi.fn(async () => ({ ok: false as const, reason: 'provider_http_401' }));
    await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 5,
      maxDelayMs: 20,
      isRetryable: (r) => !r.ok && classifyScanFailure(r.reason).retryable,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient 429/5xx failure up to the configured max, with bounded backoff', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) return { ok: false as const, reason: 'provider_http_429' };
      return { ok: true as const };
    });
    const delays: number[] = [];
    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 5,
      maxDelayMs: 40,
      isRetryable: (r) => !r.ok && classifyScanFailure(r.reason).retryable,
      onRetry: (_attempt, delayMs) => delays.push(delayMs),
    });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
    expect(delays.every((d) => d <= 40)).toBe(true);
  });

  it('stops retrying once the deadline/abort signal trips', async () => {
    const fn = vi.fn(async () => ({ ok: false as const, reason: 'provider_http_500' }));
    await withRetry(fn, {
      maxRetries: 5,
      baseDelayMs: 5,
      maxDelayMs: 20,
      isRetryable: (r) => !r.ok && classifyScanFailure(r.reason).retryable,
      shouldAbort: () => true,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('createDeadline', () => {
  it('reports expired once the budget elapses', async () => {
    const deadline = createDeadline(10);
    expect(deadline.expired()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(deadline.expired()).toBe(true);
    expect(deadline.remainingMs()).toBe(0);
  });
});

describe('ScanCircuitBreaker', () => {
  it('stays closed under a healthy success rate', () => {
    const breaker = new ScanCircuitBreaker(20, 12, 1000);
    for (let i = 0; i < 20; i += 1) breaker.record(false);
    expect(breaker.isOpen()).toBe(false);
  });

  it('opens once the failure rate crosses the threshold within the window', () => {
    const breaker = new ScanCircuitBreaker(20, 12, 1000);
    for (let i = 0; i < 15; i += 1) breaker.record(true);
    for (let i = 0; i < 5; i += 1) breaker.record(false);
    expect(breaker.isOpen()).toBe(true);
  });

  it('closes again after the cooldown window passes', async () => {
    const breaker = new ScanCircuitBreaker(5, 3, 15);
    for (let i = 0; i < 5; i += 1) breaker.record(true);
    expect(breaker.isOpen()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(breaker.isOpen()).toBe(false);
  });
});
