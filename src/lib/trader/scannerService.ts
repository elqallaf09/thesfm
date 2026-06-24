import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { randomUUID } from 'crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { analyzeStock } from '@/lib/trader/analysisEngine';
import { getUsStockUniverse } from '@/lib/trader/usStockUniverse';
import type {
  MarketCandle,
  MarketQuote,
  ScannerFilters,
  ScannerStatus,
  StockAnalysisResult,
  TraderStatus,
  TradableAsset,
} from '@/lib/trader/types';

const SCAN_FRESHNESS_MS = 10 * 60 * 1000;
const FORCE_SCAN_COOLDOWN_MS = 5 * 60 * 1000;
const SCAN_SYMBOL_LIMIT = 30;

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

let activeScan: Promise<StockAnalysisResult[]> | null = null;
let lastForcedScanAt = 0;

function isFresh() {
  if (!cache.status.lastScanCompletedAt) return false;
  return Date.now() - new Date(cache.status.lastScanCompletedAt).getTime() < SCAN_FRESHNESS_MS;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

async function analyzeAsset(asset: TradableAsset) {
  const [quoteResult, historyResult] = await Promise.all([
    fetchYahooNormalizedQuote({
      requestedSymbol: asset.symbol,
      symbols: [asset.providerSymbol, asset.symbol],
      name: asset.name,
      debugContext: { service: 'thesfm-trader-scanner', market: 'US' },
    }),
    fetchYahooHistory(asset.providerSymbol, 'stock', '1y', '1d'),
  ]);

  const quote = toMarketQuote(asset, quoteResult);
  const candles = toCandles(historyResult);
  if (!quote) {
    return {
      ok: false as const,
      symbol: asset.symbol,
      reason: quoteResult.unavailableReason || 'quote_unavailable',
    };
  }
  if (candles.length < 30) {
    return {
      ok: false as const,
      symbol: asset.symbol,
      reason: historyResult.success ? 'insufficient_history' : historyResult.unavailableReason,
    };
  }
  return {
    ok: true as const,
    result: analyzeStock({ asset, quote, candles }),
  };
}

async function persistScan(results: StockAnalysisResult[], status: ScannerStatus, failedAssets: number) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('trader_provider_status').upsert({
    provider: 'Yahoo Finance',
    configured: true,
    connected: results.length > 0,
    delayed: results.some((result) => result.delayed),
    last_successful_update: results[0]?.dataTimestamp || status.lastScanCompletedAt,
    last_error_code: status.lastErrorCode,
    updated_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.warn('[trader-scanner] provider status persistence skipped', { code: error.code });
  });

  const runId = randomUUID();
  const runInsert = await supabase.from('trader_scan_runs').insert({
    id: runId,
    market: 'US',
    status: 'completed',
    started_at: status.lastScanStartedAt,
    completed_at: status.lastScanCompletedAt,
    total_assets: status.scannedAssets,
    successful_assets: results.length,
    failed_assets: failedAssets,
    generated_signals: status.generatedSignals,
    error_code: status.lastErrorCode,
  });
  if (runInsert.error) {
    console.warn('[trader-scanner] scan run persistence skipped', { code: runInsert.error.code });
    return;
  }

  if (!results.length) return;
  const rows = results.map((result) => ({
    scan_run_id: runId,
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
  const insert = await supabase.from('trader_scan_results').insert(rows);
  if (insert.error) console.warn('[trader-scanner] scan result persistence skipped', { code: insert.error.code });
}

async function runScanInternal(filters: ScannerFilters = { market: 'US' }) {
  const startedAt = new Date().toISOString();
  cache.status = {
    ...cache.status,
    running: true,
    lastScanStartedAt: startedAt,
    lastErrorCode: null,
  };

  const universe = getUsStockUniverse(filters.symbols).slice(0, SCAN_SYMBOL_LIMIT);
  const results: StockAnalysisResult[] = [];
  let failedAssets = 0;

  for (const batch of chunk(universe, 4)) {
    const batchResults = await Promise.all(batch.map((asset) => analyzeAsset(asset)));
    for (const item of batchResults) {
      if (item.ok) results.push(item.result);
      else {
        failedAssets += 1;
        console.warn('[trader-scanner] symbol skipped', { symbol: item.symbol, reason: item.reason });
      }
    }
  }

  const completedAt = new Date().toISOString();
  const generatedSignals = results.filter((result) => result.signal !== 'hold').length;
  cache.results = results.sort((a, b) => b.confidence - a.confidence);
  cache.providerConnected = results.length > 0;
  cache.providerLastSuccess = results[0]?.dataTimestamp || completedAt;
  cache.delayed = results.some((result) => result.delayed);
  cache.status = {
    running: false,
    lastScanStartedAt: startedAt,
    lastScanCompletedAt: completedAt,
    scannedAssets: universe.length,
    generatedSignals,
    lastErrorCode: results.length ? null : 'NO_SUPPORTED_PROVIDER_RESULTS',
  };

  await persistScan(cache.results, cache.status, failedAssets).catch((error) => {
    console.warn('[trader-scanner] persistence failed safely', { message: error instanceof Error ? error.message : 'unknown' });
  });

  return cache.results;
}

export async function runScanner(filters: ScannerFilters = { market: 'US' }, force = false) {
  if (!force && isFresh() && cache.results.length) return cache.results;
  if (activeScan) return activeScan;
  if (force && cache.results.length && Date.now() - lastForcedScanAt < FORCE_SCAN_COOLDOWN_MS) return cache.results;
  if (force) lastForcedScanAt = Date.now();
  activeScan = runScanInternal(filters).finally(() => {
    activeScan = null;
  });
  return activeScan;
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
