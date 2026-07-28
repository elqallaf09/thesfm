import { randomUUID } from 'crypto';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { analyzeStock } from '@/lib/trader/analysisEngine';
import { getUsStockUniverse } from '@/lib/trader/usStockUniverse';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
import { acquireScanLock, releaseScanLock } from '@/lib/trader/scannerLock';
import {
  classifyScanFailure,
  createDeadline,
  dedupeProviderCandidates,
  normalizeAndDedupeSymbols,
  runWithConcurrency,
  ScanCircuitBreaker,
  withRetry,
} from '@/lib/trader/scannerExecutor';
import { logReliabilityEvent } from '@/lib/runtime/reliability';
import type {
  MarketCandle,
  MarketQuote,
  ScannerFilters,
  ScannerStatus,
  ScanRunSummary,
  StockAnalysisResult,
  TraderStatus,
  TradableAsset,
} from '@/lib/trader/types';

const SCAN_FRESHNESS_MS = 10 * 60 * 1000;
const FORCE_SCAN_COOLDOWN_MS = 5 * 60 * 1000;
const CURSOR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function envInt(name: string, fallback: number, min: number, max: number) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

const SCANNER_CONCURRENCY = envInt('SCANNER_CONCURRENCY', 10, 1, 15);
const SCANNER_TIME_BUDGET_MS = envInt('SCANNER_TIME_BUDGET_MS', 240_000, 30_000, 280_000);
const SCANNER_MAX_SLICE_SIZE = envInt('SCANNER_MAX_SLICE_SIZE', 6000, 1, 50_000);
const SCANNER_MAX_RETRIES = envInt('SCANNER_MAX_RETRIES', 2, 0, 5);
const SCANNER_RETRY_BASE_DELAY_MS = envInt('SCANNER_RETRY_BASE_DELAY_MS', 300, 50, 5_000);
const SCANNER_RETRY_MAX_DELAY_MS = envInt('SCANNER_RETRY_MAX_DELAY_MS', 4_000, 200, 15_000);
const SCANNER_LOCK_TTL_MS = envInt('SCANNER_LOCK_TTL_MS', 8 * 60 * 1000, 60_000, 20 * 60 * 1000);

const lockKey = (market: string) => `scanner:lock:${market}`;
const cursorKey = (market: string) => `scanner:cursor:${market}`;

type PersistedCursor = {
  offset: number;
  cycleId: string;
  cycleStartedAt: string;
  universeSize: number;
};

type AssetOutcome =
  | { ok: true; symbol: string; result: StockAnalysisResult; cacheHit: boolean }
  | { ok: false; symbol: string; reason: string; cacheHit: boolean };

type ScanCache = {
  results: StockAnalysisResult[];
  status: ScannerStatus;
  providerConnected: boolean;
  providerLastSuccess: string | null;
  delayed: boolean;
};

const cache: ScanCache = {
  results: [],
  status: {
    running: false,
    lastScanStartedAt: null,
    lastScanCompletedAt: null,
    scannedAssets: 0,
    generatedSignals: 0,
    lastErrorCode: null,
  },
  providerConnected: false,
  providerLastSuccess: null,
  delayed: true,
};

let activeScan: Promise<{ results: StockAnalysisResult[]; run: ScanRunSummary }> | null = null;
let lastForcedScanAt = 0;

function isFresh() {
  if (!cache.status.lastScanCompletedAt) return false;
  return Date.now() - new Date(cache.status.lastScanCompletedAt).getTime() < SCAN_FRESHNESS_MS;
}

function toMarketQuote(asset: TradableAsset, quote: Awaited<ReturnType<typeof fetchYahooNormalizedQuote>>): MarketQuote | null {
  if (!quote.available || quote.price === null || quote.price <= 0) return null;
  const previousClose = quote.change !== null ? quote.price - quote.change : null;
  return {
    symbol: asset.symbol,
    price: quote.price,
    open: null,
    high: null,
    low: null,
    previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    volume: null,
    timestamp: quote.marketTime || new Date().toISOString(),
    currency: quote.currency || asset.currency,
    delayed: quote.delayed,
    provider: quote.source,
  };
}

function toCandles(history: Awaited<ReturnType<typeof fetchYahooHistory>>): MarketCandle[] {
  if (!history.success) return [];
  return history.history
    .map((point) => {
      const close = Number(point.close);
      if (!Number.isFinite(close) || close <= 0) return null;
      const open = Number.isFinite(Number(point.open)) && Number(point.open) > 0 ? Number(point.open) : close;
      const high = Number.isFinite(Number(point.high)) && Number(point.high) > 0 ? Number(point.high) : Math.max(open, close);
      const low = Number.isFinite(Number(point.low)) && Number(point.low) > 0 ? Number(point.low) : Math.min(open, close);
      return {
        timestamp: point.date,
        open,
        high,
        low,
        close,
        volume: typeof point.volume === 'number' && Number.isFinite(point.volume) ? point.volume : null,
      };
    })
    .filter((point): point is MarketCandle => point !== null);
}

async function analyzeAssetOnce(asset: TradableAsset): Promise<AssetOutcome> {
  const candidateSymbols = dedupeProviderCandidates([asset.providerSymbol, asset.symbol]);
  const [quoteResult, historyResult] = await Promise.all([
    fetchYahooNormalizedQuote({
      requestedSymbol: asset.symbol,
      symbols: candidateSymbols,
      name: asset.name,
      debugContext: { service: 'thesfm-trader-scanner', market: 'US' },
    }),
    fetchYahooHistory(asset.providerSymbol, 'stock', '2y', '1d'),
  ]);

  const quote = toMarketQuote(asset, quoteResult);
  const candles = toCandles(historyResult);
  const cacheHit = historyResult.success ? historyResult.cached === true : false;
  if (!quote) {
    return { ok: false, symbol: asset.symbol, reason: quoteResult.unavailableReason || 'quote_unavailable', cacheHit };
  }
  if (candles.length < 30) {
    return { ok: false, symbol: asset.symbol, reason: historyResult.success ? 'insufficient_history' : historyResult.unavailableReason, cacheHit };
  }
  return { ok: true, symbol: asset.symbol, result: analyzeStock({ asset, quote, candles }), cacheHit };
}

async function persistScan(input: {
  runId: string;
  market: string;
  status: 'completed' | 'partial';
  startedAtIso: string;
  completedAtIso: string;
  totalAssets: number;
  succeeded: StockAnalysisResult[];
  failedAssets: number;
  generatedSignals: number;
  errorCode: string | null;
}) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('trader_provider_status').upsert({
    provider: 'Yahoo Finance',
    configured: true,
    connected: cache.providerConnected,
    delayed: cache.delayed,
    last_successful_update: cache.providerLastSuccess,
    last_error_code: input.errorCode,
    updated_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.warn('[trader-scanner] provider status persistence skipped', { code: error.code });
  });

  const runUpsert = await supabase.from('trader_scan_runs').upsert({
    id: input.runId,
    market: input.market,
    status: input.status,
    started_at: input.startedAtIso,
    completed_at: input.completedAtIso,
    total_assets: input.totalAssets,
    successful_assets: input.succeeded.length,
    failed_assets: input.failedAssets,
    generated_signals: input.generatedSignals,
    error_code: input.errorCode,
  });
  if (runUpsert.error) {
    console.warn('[trader-scanner] scan run persistence skipped', { code: runUpsert.error.code });
    return;
  }

  if (!input.succeeded.length) return;
  const rows = input.succeeded.map((result) => ({
    scan_run_id: input.runId,
    symbol: result.symbol,
    signal: result.signal,
    confidence: result.confidence,
    current_price: result.currentPrice,
    target_price: result.targetPrice,
    stop_loss: result.stopLoss,
    timeframe: result.expectedTimeframe,
    risk_level: result.riskLevel,
    total_score: result.score,
    score_breakdown: result.scoreBreakdown,
    reasons: result.reasons,
    warnings: result.warnings,
    data_timestamp: result.dataTimestamp,
    provider: result.provider,
    delayed: result.delayed,
  }));
  const upsert = await supabase.from('trader_scan_results').upsert(rows, { onConflict: 'scan_run_id,symbol' });
  if (upsert.error) console.warn('[trader-scanner] scan result persistence skipped', { code: upsert.error.code });
}

async function persistFailedRun(input: { runId: string; market: string; startedAtIso: string; message: string }) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return;
  await supabase.from('trader_scan_runs').upsert({
    id: input.runId,
    market: input.market,
    status: 'failed',
    started_at: input.startedAtIso,
    completed_at: new Date().toISOString(),
    total_assets: 0,
    successful_assets: 0,
    failed_assets: 0,
    generated_signals: 0,
    error_code: 'SCAN_EXECUTION_FAILED',
  }).then(({ error }) => {
    if (error) console.warn('[trader-scanner] failed-run persistence skipped', { code: error.code });
  });
  logReliabilityEvent('error', 'trader_scanner.run_failed', { runId: input.runId, market: input.market, message: input.message });
}

async function runScanInternal(filters: ScannerFilters, runId: string): Promise<ScanRunSummary> {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const market = filters.market;
  const explicitSymbols = Array.isArray(filters.symbols) && filters.symbols.length > 0;

  const rawAssets = getUsStockUniverse(filters.symbols);
  const { accepted: universe, rejected } = normalizeAndDedupeSymbols(rawAssets);
  if (rejected.length) {
    logReliabilityEvent('warn', 'trader_scanner.symbols_rejected', {
      runId,
      count: rejected.length,
      sample: rejected.slice(0, 10),
    });
  }

  let offset = 0;
  let cycleId = runId;
  let cycleStartedAt = startedAtIso;
  if (explicitSymbols) {
    offset = typeof filters.cursor === 'number' ? Math.min(Math.max(0, filters.cursor), universe.length) : 0;
  } else {
    const persistedCursor = await getPersistentCache<PersistedCursor>(cursorKey(market));
    if (persistedCursor && persistedCursor.universeSize === universe.length) {
      offset = Math.min(persistedCursor.offset, universe.length);
      cycleId = persistedCursor.cycleId;
      cycleStartedAt = persistedCursor.cycleStartedAt;
    }
  }

  const sliceSize = Math.min(SCANNER_MAX_SLICE_SIZE, Math.max(0, universe.length - offset));
  const slice = universe.slice(offset, offset + sliceSize);

  cache.status = { ...cache.status, running: true, lastScanStartedAt: startedAtIso, lastErrorCode: null };

  const deadline = createDeadline(SCANNER_TIME_BUDGET_MS);
  const breaker = new ScanCircuitBreaker();
  const metrics = { auth: 0, notFound: 0, rateLimit: 0, transient: 0, noData: 0, retries: 0, cacheHits: 0 };

  const { results: outcomes, processedCount: attemptedCount, stopped } = await runWithConcurrency<TradableAsset, AssetOutcome>(
    slice,
    SCANNER_CONCURRENCY,
    async (asset) => {
      const outcome = await withRetry<AssetOutcome>(
        () => analyzeAssetOnce(asset),
        {
          maxRetries: SCANNER_MAX_RETRIES,
          baseDelayMs: SCANNER_RETRY_BASE_DELAY_MS,
          maxDelayMs: SCANNER_RETRY_MAX_DELAY_MS,
          isRetryable: (result) => !result.ok && classifyScanFailure(result.reason).retryable,
          getRetryAfterMs: () => null,
          shouldAbort: () => deadline.expired() || breaker.isOpen(),
          onRetry: () => { metrics.retries += 1; },
        },
      );

      if (outcome.cacheHit) metrics.cacheHits += 1;
      if (outcome.ok) {
        breaker.record(false);
      } else {
        const classified = classifyScanFailure(outcome.reason);
        if (classified.category === 'auth') metrics.auth += 1;
        else if (classified.category === 'not_found') metrics.notFound += 1;
        else if (classified.category === 'rate_limit') metrics.rateLimit += 1;
        else if (classified.category === 'transient') metrics.transient += 1;
        else metrics.noData += 1;
        breaker.record(classified.category === 'auth' || classified.category === 'rate_limit' || classified.category === 'transient');
      }
      return outcome;
    },
    { shouldStop: () => deadline.expired() || breaker.isOpen() },
  );

  const attempted = outcomes.filter((item): item is AssetOutcome => Boolean(item));
  const succeeded = attempted.filter((item): item is Extract<AssetOutcome, { ok: true }> => item.ok);
  const failedCount = attempted.length - succeeded.length;
  const skippedCount = slice.length - attempted.length;

  const bySymbol = new Map(cache.results.map((result) => [result.symbol, result]));
  for (const item of attempted) {
    if (item.ok) {
      bySymbol.set(item.symbol, item.result);
      continue;
    }
    if (classifyScanFailure(item.reason).category === 'not_found') bySymbol.delete(item.symbol);
  }

  const completedAtIso = new Date().toISOString();
  const mergedResults = Array.from(bySymbol.values()).sort((a, b) => b.confidence - a.confidence);
  cache.results = mergedResults;
  cache.providerConnected = mergedResults.length > 0;
  cache.providerLastSuccess = succeeded[0]?.result.dataTimestamp || cache.providerLastSuccess || completedAtIso;
  cache.delayed = mergedResults.some((result) => result.delayed);

  const newOffset = offset + attemptedCount;
  const universeExhausted = newOffset >= universe.length;
  const breakerOpen = breaker.isOpen();

  let nextCursor: number | null;
  if (explicitSymbols) {
    nextCursor = universeExhausted ? null : newOffset;
  } else if (universeExhausted) {
    await setPersistentCache(cursorKey(market), {
      offset: 0,
      cycleId: randomUUID(),
      cycleStartedAt: completedAtIso,
      universeSize: universe.length,
    } satisfies PersistedCursor, CURSOR_TTL_MS);
    nextCursor = null;
  } else {
    await setPersistentCache(cursorKey(market), {
      offset: newOffset,
      cycleId,
      cycleStartedAt,
      universeSize: universe.length,
    } satisfies PersistedCursor, CURSOR_TTL_MS);
    nextCursor = newOffset;
  }

  const status: 'completed' | 'partial' = universeExhausted && !stopped ? 'completed' : 'partial';
  const generatedSignals = mergedResults.filter((result) => result.signal !== 'hold').length;

  cache.status = {
    running: false,
    lastScanStartedAt: startedAtIso,
    lastScanCompletedAt: completedAtIso,
    scannedAssets: attempted.length,
    generatedSignals,
    lastErrorCode: succeeded.length === 0 && attempted.length > 0 ? 'NO_SUPPORTED_PROVIDER_RESULTS' : null,
  };

  const durationMs = Date.now() - startedAt;

  logReliabilityEvent('info', 'trader_scanner.run_completed', {
    runId,
    market,
    status,
    universeSize: universe.length,
    sliceOffset: offset,
    sliceSize: slice.length,
    processed: attempted.length,
    skipped: skippedCount,
    succeeded: succeeded.length,
    failed: failedCount,
    authFailures: metrics.auth,
    notFoundFailures: metrics.notFound,
    rateLimited: metrics.rateLimit,
    transientFailures: metrics.transient,
    noDataFailures: metrics.noData,
    retries: metrics.retries,
    cacheHits: metrics.cacheHits,
    concurrency: SCANNER_CONCURRENCY,
    deadlineHit: stopped && !breakerOpen,
    circuitBreakerState: breaker.state(),
    durationMs,
    nextCursor,
    approximateExternalRequests: attempted.length * 2 + metrics.retries * 2,
  });

  await persistScan({
    runId,
    market,
    status,
    startedAtIso,
    completedAtIso,
    totalAssets: slice.length,
    succeeded: succeeded.map((item) => item.result),
    failedAssets: failedCount,
    generatedSignals,
    errorCode: cache.status.lastErrorCode,
  }).catch((error) => {
    logReliabilityEvent('warn', 'trader_scanner.persistence_failed', {
      runId,
      message: error instanceof Error ? error.message : 'unknown',
    });
  });

  return {
    status,
    runId,
    processed: attempted.length,
    remaining: Math.max(0, universe.length - newOffset),
    succeeded: succeeded.length,
    skipped: skippedCount,
    failed: failedCount,
    durationMs,
    nextCursor,
  };
}

function cachedRunSummary(status: ScanRunSummary['status'], runId = 'cached'): ScanRunSummary {
  return {
    status,
    runId,
    processed: 0,
    remaining: 0,
    succeeded: cache.results.length,
    skipped: 0,
    failed: 0,
    durationMs: 0,
    nextCursor: null,
  };
}

export async function triggerScan(
  filters: ScannerFilters = { market: 'US' },
  options: { force?: boolean } = {},
): Promise<{ results: StockAnalysisResult[]; run: ScanRunSummary }> {
  const force = options.force ?? false;
  const market = filters.market;

  if (!force && isFresh() && cache.results.length) {
    return { results: cache.results, run: cachedRunSummary('completed') };
  }
  if (activeScan) return activeScan;
  if (force && cache.results.length && Date.now() - lastForcedScanAt < FORCE_SCAN_COOLDOWN_MS) {
    return { results: cache.results, run: cachedRunSummary('completed') };
  }
  if (force) lastForcedScanAt = Date.now();

  const runId = randomUUID();
  const runPromise = (async () => {
    const lock = await acquireScanLock(lockKey(market), runId, SCANNER_LOCK_TTL_MS);
    if (!lock.acquired) {
      logReliabilityEvent('info', 'trader_scanner.already_running', {
        runId,
        market,
        existingRunId: lock.existing.runId,
      });
      return { results: cache.results, run: cachedRunSummary('already_running', lock.existing.runId) };
    }

    try {
      const run = await runScanInternal(filters, runId);
      return { results: cache.results, run };
    } catch (error) {
      cache.status = { ...cache.status, running: false, lastErrorCode: 'SCAN_EXECUTION_FAILED' };
      // Recording the failure must never itself become an unhandled rejection —
      // that would defeat the point of this catch block (a graceful "failed"
      // result instead of a thrown exception reaching the route).
      await persistFailedRun({
        runId,
        market,
        startedAtIso: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'unknown',
      }).catch((persistError) => {
        logReliabilityEvent('warn', 'trader_scanner.failed_run_persistence_failed', {
          runId,
          market,
          message: persistError instanceof Error ? persistError.message : 'unknown',
        });
      });
      return {
        results: cache.results,
        run: { status: 'failed' as const, runId, processed: 0, remaining: 0, succeeded: 0, skipped: 0, failed: 0, durationMs: 0, nextCursor: null },
      };
    } finally {
      await releaseScanLock(lockKey(market), runId);
    }
  })();

  activeScan = runPromise.finally(() => {
    activeScan = null;
  });
  return activeScan;
}

export async function runScanner(filters: ScannerFilters = { market: 'US' }, force = false): Promise<StockAnalysisResult[]> {
  const { results } = await triggerScan(filters, { force });
  return results;
}

export async function getScannerResults(filters: ScannerFilters = { market: 'US' }) {
  const results = await runScanner(filters, false);
  return filterResults(results, filters);
}

export function filterResults(results: StockAnalysisResult[], filters: ScannerFilters) {
  const symbols = new Set((filters.symbols || []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean));
  return results.filter((result) => {
    if (symbols.size && !symbols.has(result.symbol.toUpperCase())) return false;
    if (filters.signalType && filters.signalType !== 'all' && result.signal !== filters.signalType) return false;
    if (typeof filters.minimumConfidence === 'number' && result.confidence < filters.minimumConfidence) return false;
    if (filters.riskLevel && filters.riskLevel !== 'all' && result.riskLevel !== filters.riskLevel) return false;
    if (filters.timeHorizon && filters.timeHorizon !== 'all' && result.expectedTimeframe !== filters.timeHorizon) return false;
    return true;
  });
}

export function getTraderStatus(): TraderStatus {
  return {
    marketData: {
      configured: true,
      connected: cache.providerConnected,
      provider: 'Yahoo Finance',
      delayed: cache.delayed,
      lastSuccessfulUpdate: cache.providerLastSuccess,
    },
    scanner: {
      ...cache.status,
      running: cache.status.running || Boolean(activeScan),
    },
  };
}

export function getCachedScannerResults() {
  return cache.results;
}
