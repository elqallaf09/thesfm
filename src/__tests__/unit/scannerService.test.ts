import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockAnalysisResult, TradableAsset } from '@/lib/trader/types';

const fetchYahooNormalizedQuote = vi.fn();
const fetchYahooHistory = vi.fn();
const analyzeStock = vi.fn();
const getUsStockUniverse = vi.fn();
const createServerSupabaseAdmin = vi.fn();
type LockResult = { acquired: true } | { acquired: false; existing: { runId: string; lockedAt: string } };
const acquireScanLock = vi.fn<(...args: unknown[]) => Promise<LockResult>>();
const releaseScanLock = vi.fn<(...args: unknown[]) => Promise<void>>();

const persistentStore = new Map<string, { value: unknown; expiresAt: number }>();
const getPersistentCache = vi.fn();
const setPersistentCache = vi.fn();

function installPersistentCacheFakes() {
  // vi.restoreAllMocks() in afterEach wipes any mockImplementation, so this
  // must be re-installed fresh in beforeEach rather than set once at module load.
  getPersistentCache.mockImplementation(async (key: string) => {
    const entry = persistentStore.get(key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.value;
  });
  setPersistentCache.mockImplementation(async (key: string, value: unknown, ttlMs: number) => {
    persistentStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  });
}

vi.mock('@/lib/market/fetchYahooQuote', () => ({
  fetchYahooNormalizedQuote: (...args: unknown[]) => fetchYahooNormalizedQuote(...args),
}));
vi.mock('@/lib/market/fetchYahooHistory', () => ({
  fetchYahooHistory: (...args: unknown[]) => fetchYahooHistory(...args),
}));
vi.mock('@/lib/trader/analysisEngine', () => ({
  analyzeStock: (...args: unknown[]) => analyzeStock(...args),
}));
vi.mock('@/lib/trader/usStockUniverse', () => ({
  getUsStockUniverse: (...args: unknown[]) => getUsStockUniverse(...args),
}));
vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args),
}));
vi.mock('@/lib/trader/scannerLock', () => ({
  acquireScanLock: (...args: unknown[]) => acquireScanLock(...args),
  releaseScanLock: (...args: unknown[]) => releaseScanLock(...args),
}));
vi.mock('@/lib/trader/persistentCache', () => ({
  getPersistentCache: (...args: unknown[]) => getPersistentCache(...args),
  setPersistentCache: (...args: unknown[]) => setPersistentCache(...args),
}));

function asset(symbol: string, providerSymbol = symbol): TradableAsset {
  return {
    symbol,
    providerSymbol,
    name: symbol,
    exchange: 'NASDAQ',
    market: 'US',
    currency: 'USD',
    sector: null,
    industry: null,
    logoUrl: null,
    active: true,
  };
}

function fakeCandles(count = 40) {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.now() - (count - i) * 86_400_000).toISOString(),
    close: 100 + i,
    open: 99 + i,
    high: 101 + i,
    low: 98 + i,
    volume: 1_000_000,
  }));
}

function stubHistorySuccess() {
  fetchYahooHistory.mockResolvedValue({ success: true, history: fakeCandles() });
}

function recordingSupabaseAdmin() {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  function table(name: string) {
    const chain = {
      upsert: (...args: unknown[]) => {
        calls.push({ table: name, op: 'upsert', args });
        return Promise.resolve({ error: null });
      },
      insert: (...args: unknown[]) => {
        calls.push({ table: name, op: 'insert', args });
        return Promise.resolve({ error: null });
      },
      then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
    };
    return chain;
  }
  return { calls, admin: { from: (name: string) => table(name) } };
}

beforeEach(() => {
  vi.resetModules();
  persistentStore.clear();
  fetchYahooNormalizedQuote.mockReset();
  fetchYahooHistory.mockReset();
  analyzeStock.mockReset();
  getUsStockUniverse.mockReset();
  createServerSupabaseAdmin.mockReset().mockReturnValue(null);
  acquireScanLock.mockReset().mockResolvedValue({ acquired: true });
  releaseScanLock.mockReset().mockResolvedValue(undefined);
  getPersistentCache.mockReset();
  setPersistentCache.mockReset();
  installPersistentCacheFakes();
  vi.stubEnv('SCANNER_CONCURRENCY', '3');
  vi.stubEnv('SCANNER_TIME_BUDGET_MS', '30000');
  vi.stubEnv('SCANNER_MAX_SLICE_SIZE', '');
  vi.stubEnv('SCANNER_MAX_RETRIES', '2');
  vi.stubEnv('SCANNER_RETRY_BASE_DELAY_MS', '5');
  vi.stubEnv('SCANNER_RETRY_MAX_DELAY_MS', '20');
  vi.stubEnv('SCANNER_LOCK_TTL_MS', '');

  analyzeStock.mockImplementation(({ asset: a, quote }: { asset: TradableAsset; quote: { price: number } }) => ({
    id: `${a.symbol}-1`,
    symbol: a.symbol,
    providerSymbol: a.providerSymbol,
    name: a.name,
    market: 'US',
    exchange: a.exchange,
    sector: a.sector,
    generatedAt: new Date().toISOString(),
    dataTimestamp: new Date().toISOString(),
    signal: 'hold',
    confidence: quote.price,
    currentPrice: quote.price,
    changePercent: 0,
    targetPrice: quote.price,
    stopLoss: quote.price,
    expectedTimeframe: 'weeks',
    expectedTimeframeLabel: 'weeks',
    riskLevel: 'medium',
    score: 0,
    scoreBreakdown: {},
    technicals: {},
    reasons: [],
    reasonsAr: [],
    warnings: [],
    analysisMethod: 'technical_rules',
    provider: 'Yahoo Finance',
    delayed: true,
    currency: 'USD',
  } as unknown as StockAnalysisResult));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('triggerScan concurrency + dedup + validation', () => {
  it('never issues more concurrent provider calls than SCANNER_CONCURRENCY and dedupes identical provider candidates', async () => {
    const symbols = ['SYM1', 'SYM2', 'SYM3', 'SYM4', 'SYM5', 'SYM6'];
    getUsStockUniverse.mockReturnValue(symbols.map((s) => asset(s)));
    stubHistorySuccess();

    let active = 0;
    let maxActive = 0;
    fetchYahooNormalizedQuote.mockImplementation(async (options: { symbols: string[] }) => {
      expect(new Set(options.symbols).size).toBe(options.symbols.length);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { available: true, price: 100, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true };
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(run.status).toBe('completed');
    expect(run.succeeded).toBe(6);
  });
});

describe('triggerScan failure classification and cache truthfulness', () => {
  it('drops a permanently not-found symbol from results but keeps a transient failure symbol out without fabricating data', async () => {
    const symbols = ['GOOD1', 'GOOD2', 'DEAD404', 'FLAKY500'];
    getUsStockUniverse.mockReturnValue(symbols.map((s) => asset(s)));
    stubHistorySuccess();

    fetchYahooNormalizedQuote.mockImplementation(async (options: { requestedSymbol: string }) => {
      if (options.requestedSymbol === 'DEAD404') {
        return { available: false, unavailableReason: 'provider_http_404', price: null, change: null, changePercent: null, currency: null, marketTime: null, source: 'Yahoo Finance', delayed: true };
      }
      if (options.requestedSymbol === 'FLAKY500') {
        return { available: false, unavailableReason: 'provider_http_500', price: null, change: null, changePercent: null, currency: null, marketTime: null, source: 'Yahoo Finance', delayed: true };
      }
      return { available: true, price: 50, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true };
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { results, run } = await triggerScan({ market: 'US' }, { force: true });

    expect(results.map((r) => r.symbol).sort()).toEqual(['GOOD1', 'GOOD2']);
    expect(run.succeeded).toBe(2);
    expect(run.failed).toBe(2);
    expect(results.every((r) => r.currentPrice > 0)).toBe(true);
  });

  it('never returns a fabricated/placeholder result for a symbol that failed', async () => {
    getUsStockUniverse.mockReturnValue([asset('ONLYFAIL')]);
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: false, unavailableReason: 'provider_http_404', price: null, change: null, changePercent: null, currency: null, marketTime: null, source: 'Yahoo Finance', delayed: true });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { results } = await triggerScan({ market: 'US' }, { force: true });
    expect(results).toHaveLength(0);
  });
});

describe('triggerScan retry behavior', () => {
  it('does not retry 404s (single attempt) and returns a valid structured response', async () => {
    getUsStockUniverse.mockReturnValue([asset('DEAD')]);
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: false, unavailableReason: 'provider_http_404', price: null, change: null, changePercent: null, currency: null, marketTime: null, source: 'Yahoo Finance', delayed: true });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(fetchYahooNormalizedQuote).toHaveBeenCalledTimes(1);
    expect(run.status).toBe('completed');
    expect(typeof run.durationMs).toBe('number');
  });

  it('retries a transient 5xx with bounded attempts before giving up', async () => {
    getUsStockUniverse.mockReturnValue([asset('FLAKY')]);
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: false, unavailableReason: 'provider_http_503', price: null, change: null, changePercent: null, currency: null, marketTime: null, source: 'Yahoo Finance', delayed: true });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    await triggerScan({ market: 'US' }, { force: true });

    // 1 initial attempt + SCANNER_MAX_RETRIES(2) retries = 3 total
    expect(fetchYahooNormalizedQuote).toHaveBeenCalledTimes(3);
  });
});

describe('triggerScan cursor persistence and resumability', () => {
  it('persists a partial cursor and resumes the next slice instead of restarting from the beginning', async () => {
    const symbols = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
    getUsStockUniverse.mockReturnValue(symbols.map((s) => asset(s)));
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: true, price: 10, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true });
    vi.stubEnv('SCANNER_MAX_SLICE_SIZE', '3');

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const first = await triggerScan({ market: 'US' }, { force: true });
    expect(first.run.status).toBe('partial');
    expect(first.run.processed).toBe(3);
    expect(first.run.nextCursor).toBe(3);

    // Advance past the force-scan cooldown so the next cron tick is allowed to
    // run, then confirm only the *remaining* 3 symbols are requested — proving
    // the second invocation resumes from the persisted cursor instead of
    // restarting the whole universe from symbol #1.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    fetchYahooNormalizedQuote.mockClear();
    const second = await triggerScan({ market: 'US' }, { force: true });
    vi.useRealTimers();

    const requested = fetchYahooNormalizedQuote.mock.calls.map((call) => (call[0] as { requestedSymbol: string }).requestedSymbol);
    expect(requested.sort()).toEqual(['A4', 'A5', 'A6']);
    expect(second.run.status).toBe('completed');
    expect(second.run.nextCursor).toBeNull();
  });
});

describe('triggerScan overlapping-run protection', () => {
  it('returns already_running and performs no provider work when the distributed lock is held', async () => {
    getUsStockUniverse.mockReturnValue([asset('SHOULD_NOT_BE_CALLED')]);
    stubHistorySuccess();
    acquireScanLock.mockResolvedValue({ acquired: false, existing: { runId: 'other-run', lockedAt: new Date().toISOString() } });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(run.status).toBe('already_running');
    expect(run.runId).toBe('other-run');
    expect(fetchYahooNormalizedQuote).not.toHaveBeenCalled();
  });
});

describe('triggerScan observability', () => {
  it('reports cacheHits in the structured run-completed log when the history provider serves a cached response', async () => {
    getUsStockUniverse.mockReturnValue([asset('CACHED1'), asset('FRESH1')]);
    fetchYahooHistory.mockImplementation(async (providerSymbol: string) => {
      if (providerSymbol === 'CACHED1') {
        return { success: true, history: fakeCandles(), cached: true, cacheAgeSeconds: 42 };
      }
      return { success: true, history: fakeCandles() };
    });
    fetchYahooNormalizedQuote.mockResolvedValue({ available: true, price: 10, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true });

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { triggerScan } = await import('@/lib/trader/scannerService');
    await triggerScan({ market: 'US' }, { force: true });

    const logCall = infoSpy.mock.calls.find((call) => String(call[0]).includes('trader_scanner.run_completed'));
    expect(logCall).toBeDefined();
    const logged = JSON.parse(String(logCall?.[0]));
    expect(logged.cacheHits).toBe(1);
  });
});

describe('triggerScan failure recovery', () => {
  it('resolves with status "failed" and releases the lock when the run throws unexpectedly', async () => {
    getUsStockUniverse.mockImplementation(() => {
      throw new Error('simulated catastrophic failure building the universe');
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(run.status).toBe('failed');
    expect(releaseScanLock).toHaveBeenCalledTimes(1);
  });

  it('still resolves gracefully (never an unhandled rejection) when persisting the failure itself also throws', async () => {
    getUsStockUniverse.mockImplementation(() => {
      throw new Error('simulated catastrophic failure building the universe');
    });
    createServerSupabaseAdmin.mockReturnValue({
      from: () => {
        throw new Error('simulated Supabase client failure while recording the failed run');
      },
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(run.status).toBe('failed');
    expect(releaseScanLock).toHaveBeenCalledTimes(1);
  });

  it('does not leave the scanner permanently locked after a failed run', async () => {
    getUsStockUniverse.mockImplementationOnce(() => {
      throw new Error('simulated catastrophic failure building the universe');
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const first = await triggerScan({ market: 'US' }, { force: true });
    expect(first.run.status).toBe('failed');

    getUsStockUniverse.mockReturnValue([asset('RECOVERED')]);
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: true, price: 10, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true });

    const second = await triggerScan({ market: 'US' }, { force: true });
    expect(second.run.status).not.toBe('already_running');
  });
});

describe('triggerScan database idempotency', () => {
  it('upserts scan runs and results (never a plain insert that would duplicate on retry)', async () => {
    getUsStockUniverse.mockReturnValue([asset('ONE')]);
    stubHistorySuccess();
    fetchYahooNormalizedQuote.mockResolvedValue({ available: true, price: 42, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true });

    const { calls, admin } = recordingSupabaseAdmin();
    createServerSupabaseAdmin.mockReturnValue(admin);

    const { triggerScan } = await import('@/lib/trader/scannerService');
    await triggerScan({ market: 'US' }, { force: true });

    const runWrite = calls.find((c) => c.table === 'trader_scan_runs');
    const resultWrite = calls.find((c) => c.table === 'trader_scan_results');
    expect(runWrite?.op).toBe('upsert');
    expect(resultWrite?.op).toBe('upsert');
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });
});

describe('triggerScan deadline behavior', () => {
  it('stops before the deadline and reports a truthful partial completion instead of hanging', async () => {
    const symbols = Array.from({ length: 20 }, (_, i) => `SYM${i}`);
    getUsStockUniverse.mockReturnValue(symbols.map((s) => asset(s)));
    stubHistorySuccess();
    vi.stubEnv('SCANNER_TIME_BUDGET_MS', '30000');
    fetchYahooNormalizedQuote.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return { available: true, price: 10, change: 1, changePercent: 1, currency: 'USD', marketTime: null, source: 'Yahoo Finance', delayed: true };
    });

    vi.doMock('@/lib/trader/scannerExecutor', async () => {
      const actual = await vi.importActual<typeof import('@/lib/trader/scannerExecutor')>('@/lib/trader/scannerExecutor');
      return {
        ...actual,
        createDeadline: () => {
          let calls = 0;
          return {
            expired: () => { calls += 1; return calls > 6; },
            remainingMs: () => 0,
          };
        },
      };
    });

    const { triggerScan } = await import('@/lib/trader/scannerService');
    const { run } = await triggerScan({ market: 'US' }, { force: true });

    expect(run.status).toBe('partial');
    expect(run.processed).toBeLessThan(20);
    expect(run.remaining).toBeGreaterThan(0);
  });
});
