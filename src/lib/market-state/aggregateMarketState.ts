import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { getConfiguredProviderDescriptors } from '@/lib/market-news/registry';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { getPersistentCache, setPersistentCache } from '@/lib/trader/persistentCache';
import { classifyCatalogCompleteness } from './completeness';
import { normalizeProviderConnectionStatus } from './normalizeStatus';
import { getProviderCapabilityStatus, normalizeMarketDataProviderName, priorityListFor } from './providerResolver';
import {
  MARKET_CAPABILITY_KEYS,
  type CapabilityMatrix,
  type MarketCapabilityKey,
  type MarketProviderId,
  type MarketSystemState,
  type ProviderConnectionStatus,
  type ProviderCapabilityCell,
  type ProviderPriorityContext,
} from './types';

const SNAPSHOT_CACHE_KEY = 'market_system_state_snapshot';
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const AGGREGATE_CACHE_MS = 30_000;

let memoryCache: { value: MarketSystemState; expiresAt: number } | null = null;

type ProviderCapabilityLike = {
  configured: boolean;
  healthy: boolean;
  status: string;
  rateLimited: boolean;
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  nextRetryAt: string | null;
  supportsQuotes: boolean;
  supportsTechnicalAnalysis: boolean;
  supportsEarnings: boolean;
  supportsDividends: boolean;
  supportsIpos: boolean;
  supportsEconomicCalendar: boolean;
};

const SUPPORT_FLAG_TO_CAPABILITY: Array<[keyof ProviderCapabilityLike, MarketCapabilityKey]> = [
  ['supportsQuotes', 'quotes'],
  ['supportsTechnicalAnalysis', 'technical_data'],
  ['supportsEarnings', 'earnings'],
  ['supportsDividends', 'dividends'],
  ['supportsIpos', 'ipos'],
  ['supportsEconomicCalendar', 'economic_calendar'],
];

function cellFromProviderCapability(provider: MarketProviderId, capability: MarketCapabilityKey, cap: ProviderCapabilityLike): ProviderCapabilityCell {
  return {
    provider,
    capability,
    status: normalizeProviderConnectionStatus({ configured: cap.configured, healthy: cap.healthy, rateLimited: cap.rateLimited, status: cap.status }),
    configured: cap.configured,
    healthy: cap.healthy,
    lastSuccessAt: cap.lastSuccessfulFetch,
    lastErrorAt: null,
    lastErrorReason: cap.lastError,
    rateLimitedUntil: cap.rateLimited ? cap.nextRetryAt : null,
    nextRetryAt: cap.nextRetryAt,
    latencyMs: null,
  };
}

function emptyCell(provider: MarketProviderId, capability: MarketCapabilityKey, status: ProviderConnectionStatus): ProviderCapabilityCell {
  return {
    provider,
    capability,
    status,
    configured: status !== 'misconfigured',
    healthy: status === 'connected',
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorReason: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    latencyMs: null,
  };
}

const DERIVED_CAPABILITIES: Array<[MarketCapabilityKey, ProviderPriorityContext]> = [
  ['historical_prices', 'general'],
  ['profiles', 'general'],
  ['logos', 'general'],
  ['recommendations', 'trader_terminal'],
  ['technical_data', 'trader_terminal'],
  ['forex', 'general'],
  ['crypto', 'general'],
  ['commodities', 'general'],
  ['gcc_markets', 'general'],
];

async function computeMarketSystemState(): Promise<MarketSystemState> {
  const generatedAt = new Date().toISOString();
  const catalog = await getTraderMarketCatalog({});
  const cells: ProviderCapabilityCell[] = [];

  for (const [rawProvider, cap] of Object.entries(catalog.capabilityMatrix) as Array<[string, ProviderCapabilityLike]>) {
    const provider = normalizeMarketDataProviderName(rawProvider);
    if (!provider) continue; // filters out vestigial 'openbb'
    for (const [flag, capabilityKey] of SUPPORT_FLAG_TO_CAPABILITY) {
      if (cap[flag]) cells.push(cellFromProviderCapability(provider, capabilityKey, cap));
    }
  }

  for (const descriptor of getConfiguredProviderDescriptors()) {
    if (!descriptor.enabled) continue;
    const provider: MarketProviderId = descriptor.id === 'finnhub' ? 'finnhub' : descriptor.id === 'newsapi' ? 'newsapi' : 'rss';
    cells.push(emptyCell(provider, 'news', normalizeProviderConnectionStatus({ configured: descriptor.configured })));
  }

  cells.push(emptyCell('fmp', 'shariah_financials', getProviderCapabilityStatus('fmp')));

  const symbolsStatus = normalizeProviderConnectionStatus({ status: catalog.diagnostics.summary.fmpStatus });
  cells.push({
    ...emptyCell('fmp', 'symbols', symbolsStatus),
    lastSuccessAt: catalog.diagnostics.generatedAt,
    latencyMs: catalog.diagnostics.providerLatencyMs.fmp ?? null,
  });

  for (const [capabilityKey, context] of DERIVED_CAPABILITIES) {
    for (const provider of priorityListFor(capabilityKey, context)) {
      if (cells.some(cell => cell.capability === capabilityKey && cell.provider === provider)) continue;
      cells.push(emptyCell(provider, capabilityKey, getProviderCapabilityStatus(provider)));
    }
  }

  const providers = buildProviderSummary(cells);
  const { succeeded, degraded, failed } = bucketFeatures(cells);
  const catalogBreakdown = classifyCatalogCompleteness(catalog.diagnostics);
  const overall = computeOverallStatus(failed, degraded);

  return {
    generatedAt,
    overall,
    providers,
    capabilityMatrix: cells,
    featuresSucceeded: succeeded,
    featuresDegraded: degraded,
    featuresFailed: failed,
    catalog: catalogBreakdown,
    lastSynchronizedAt: catalog.diagnostics.generatedAt ?? generatedAt,
  };
}

const STATUS_RANK: Record<ProviderConnectionStatus, number> = {
  connected: 0,
  degraded: 1,
  rate_limited: 2,
  disabled: 3,
  misconfigured: 4,
  disconnected: 5,
  unknown: 6,
};

function buildProviderSummary(cells: ProviderCapabilityCell[]): MarketSystemState['providers'] {
  const byProvider = new Map<MarketProviderId, ProviderCapabilityCell[]>();
  for (const cell of cells) {
    const list = byProvider.get(cell.provider) ?? [];
    list.push(cell);
    byProvider.set(cell.provider, list);
  }

  const providers: MarketSystemState['providers'] = {};
  for (const [provider, providerCells] of byProvider) {
    const best = providerCells.reduce((a, b) => (STATUS_RANK[a.status] <= STATUS_RANK[b.status] ? a : b));
    providers[provider] = {
      status: best.status,
      configured: providerCells.some(cell => cell.configured),
      healthy: providerCells.some(cell => cell.healthy),
      latencyMs: providerCells.find(cell => cell.latencyMs !== null)?.latencyMs ?? null,
    };
  }
  return providers;
}

function bucketFeatures(cells: ProviderCapabilityCell[]) {
  const succeeded: MarketCapabilityKey[] = [];
  const degraded: MarketCapabilityKey[] = [];
  const failed: MarketCapabilityKey[] = [];

  for (const capability of MARKET_CAPABILITY_KEYS) {
    const capabilityCells = cells.filter(cell => cell.capability === capability);
    if (capabilityCells.length === 0) continue;
    if (capabilityCells.some(cell => cell.status === 'connected')) succeeded.push(capability);
    else if (capabilityCells.some(cell => cell.status === 'degraded' || cell.status === 'rate_limited')) degraded.push(capability);
    else failed.push(capability);
  }
  return { succeeded, degraded, failed };
}

const CORE_CAPABILITIES: MarketCapabilityKey[] = ['symbols', 'quotes'];

/**
 * Operates per CAPABILITY (using the already-computed featuresFailed/featuresDegraded buckets),
 * not per individual provider cell — an unconfigured, redundant provider for a capability that
 * another provider already serves must never drag the overall status down. Only "disconnected"
 * when BOTH core capabilities (symbol catalog + quotes) have no usable provider at all. One
 * failed/degraded non-core capability among otherwise-healthy ones always reads as "degraded",
 * never "disconnected" — this is the literal fix for the reported bug where one failed capability
 * made the whole system appear disconnected.
 */
function computeOverallStatus(failed: MarketCapabilityKey[], degraded: MarketCapabilityKey[]): ProviderConnectionStatus {
  const coreAllFailed = CORE_CAPABILITIES.every(capability => failed.includes(capability));
  if (coreAllFailed) return 'disconnected';
  if (failed.length === 0 && degraded.length === 0) return 'connected';
  return 'degraded';
}

function emptySystemState(now: number): MarketSystemState {
  return {
    generatedAt: new Date(now).toISOString(),
    overall: 'unknown',
    providers: {},
    capabilityMatrix: [],
    featuresSucceeded: [],
    featuresDegraded: [],
    featuresFailed: [...MARKET_CAPABILITY_KEYS],
    catalog: {
      discovered: 0,
      metadataAvailable: 0,
      liveQuoteAvailable: null,
      delayedQuoteAvailable: null,
      staleRecords: 0,
      duplicates: 0,
      malformed: 0,
      failed: 0,
      lastSyncAt: null,
    },
    lastSynchronizedAt: null,
  };
}

async function writeCapabilityRows(matrix: CapabilityMatrix) {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    const rows = matrix.map(cell => ({
      id: `${cell.provider}:${cell.capability}`,
      provider: cell.provider,
      capability: cell.capability,
      status: cell.status,
      configured: cell.configured,
      healthy: cell.healthy,
      last_success_at: cell.lastSuccessAt,
      last_error_at: cell.lastErrorAt,
      last_error_reason: cell.lastErrorReason,
      rate_limited_until: cell.rateLimitedUntil,
      next_retry_at: cell.nextRetryAt,
      latency_ms: cell.latencyMs,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;
    await admin.from('market_provider_state').upsert(rows);
  } catch {
    // best-effort — never blocks the response path
  }
}

async function persistSnapshot(state: MarketSystemState) {
  await setPersistentCache(SNAPSHOT_CACHE_KEY, state, SNAPSHOT_TTL_MS);
  await writeCapabilityRows(state.capabilityMatrix);
}

/**
 * The single system-wide aggregator. Composes EXISTING health-check/status functions (never
 * changes how any of them fetch data) into one canonical MarketSystemState. Cached in-memory for
 * AGGREGATE_CACHE_MS to bound both upstream calls and Supabase writes; persists a last-known-good
 * snapshot so a cold start or a thrown error falls back to real prior data instead of a blank
 * state. Persistence writes are fire-and-forget and never block the response.
 */
export async function getMarketSystemState(options: { forceFresh?: boolean } = {}): Promise<MarketSystemState> {
  const now = Date.now();
  if (!options.forceFresh && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.value;
  }

  try {
    const state = await computeMarketSystemState();
    memoryCache = { value: state, expiresAt: now + AGGREGATE_CACHE_MS };
    void persistSnapshot(state);
    return state;
  } catch {
    const fallback = await getPersistentCache<MarketSystemState>(SNAPSHOT_CACHE_KEY);
    if (fallback) return fallback;
    return emptySystemState(now);
  }
}
