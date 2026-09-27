import { NextResponse } from 'next/server';
import { createAdminApiRoute } from '@/lib/server/adminApiRoute';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { getMarketSystemState } from '@/lib/market-state/aggregateMarketState';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { clearTraderMarketCatalogCache, getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { clearTraderQuoteCache } from '@/lib/trader/marketQuotes';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';
import {
  clearFmpRuntimeCacheMarkers,
  getFmpRuntimeStatus,
  resetFmpRateLimitCooldown,
} from '@/lib/trader/providers/fmpRuntime';
import { synchronizeFmpSharedCooldown } from '@/lib/trader/providers/fmpRuntime.server';
import type { CatalogDiagnostics, ProviderCapability } from '@/lib/trader/marketCatalog';
import type { FmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import type { MarketProviderId, MarketSystemState } from '@/lib/market-state/types';
import type { NormalizedTraderProviderStatus, TraderFeatureStatus, TraderProviderFeature } from '@/lib/trader/providers/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_REASON = 'provider_rate_limited';
const RATE_LIMIT_MESSAGE_AR = 'تم الوصول مؤقتاً إلى حد استخدام مزود البيانات. سنحاول استخدام مزود بديل أو إعادة المحاولة لاحقاً.';
const RATE_LIMIT_MESSAGE_EN = 'The data provider usage limit was reached temporarily. We will try a fallback provider or retry later.';
const FMP_SUPPORTED_FEATURES: TraderProviderFeature[] = ['prices', 'earnings', 'dividends', 'ipos', 'economic'];

// الاستجابة العامة لا تكشف أخطاء المزود الخام ولا تفاصيل التشخيص الداخلية.
// التشخيص المفصّل والطفرات التشغيلية متاحة فقط لطلب أدمن موثّق.
function normalizeEnvValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

function mapLegacyStatusToDisplay(status: string): 'configured' | 'missing' | 'error' {
  return status === 'configured' ? status : status === 'error' ? 'error' : 'missing';
}

type PublicProviderStatus = 'healthy' | 'rate_limited' | 'not_configured' | 'degraded' | 'unknown';

type ProviderObservation = {
  configured: boolean;
  healthy: boolean;
  rateLimited: boolean;
  status: PublicProviderStatus;
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  rateLimitedUntil: string | null;
  nextRetryAt: string | null;
  cacheAvailable: boolean;
};

function publicProviderStatus(status: string): PublicProviderStatus {
  if (status === 'healthy' || status === 'connected' || status === 'success') return 'healthy';
  if (status === 'rate_limited') return 'rate_limited';
  if (status === 'not_configured' || status === 'misconfigured') return 'not_configured';
  if (status === 'unknown' || status === 'unsupported') return 'unknown';
  return 'degraded';
}

function cleanProviderReason(reason: string | null | undefined) {
  const value = String(reason ?? '').trim();
  if (!value) return null;
  if (/429|rate_limited|rate limit|too many/i.test(value)) return 'provider_rate_limited';
  if (/not_configured/i.test(value)) return 'provider_not_configured';
  if (/timeout|aborted|network/i.test(value)) return 'provider_temporarily_unavailable';
  return 'provider_temporarily_unavailable';
}

function sanitizeCatalogDiagnostics(diagnostics: CatalogDiagnostics): CatalogDiagnostics {
  return {
    ...diagnostics,
    reason: cleanProviderReason(diagnostics.reason),
    failedSymbols: diagnostics.failedSymbols.map(item => ({
      ...item,
      reason: cleanProviderReason(item.reason) ?? 'provider_temporarily_unavailable',
    })),
    unsupportedSymbols: diagnostics.unsupportedSymbols.map(item => ({
      ...item,
      reason: cleanProviderReason(item.reason) ?? 'provider_unsupported',
    })),
  };
}

function sanitizeCapabilityMatrix(matrix: Record<string, ProviderCapability>) {
  return Object.fromEntries(Object.entries(matrix).map(([provider, capability]) => [provider, {
    ...capability,
    lastError: cleanProviderReason(capability.lastError),
    reason: cleanProviderReason(capability.reason),
  }])) as Record<string, ProviderCapability>;
}

function routeLabel(value: string | null | undefined) {
  const key = String(value ?? '').trim();
  const labels: Record<string, string> = {
    'stock-list': 'stock list',
    'etf-list': 'ETF list',
    'indexes-list': 'indexes list',
    'batch-forex-quotes': 'forex quotes',
    'batch-crypto-quotes': 'crypto quotes',
    'batch-commodity-quotes': 'commodity quotes',
    'batch-index-quotes': 'index quotes',
    'batch-quote': 'stock quotes',
  };
  return labels[key] ?? (key || 'provider route');
}

function observedProviderState(
  state: Partial<MarketSystemState>,
  provider: MarketProviderId,
  configured: boolean,
): ProviderObservation {
  const summary = state.providers?.[provider];
  const quoteCell = state.capabilityMatrix?.find(cell => cell.provider === provider && cell.capability === 'quotes');
  const profile = state.providerProfiles?.find(item => item.provider === provider);
  const rawStatus = summary?.status ?? quoteCell?.status ?? profile?.status ?? (configured ? 'unknown' : 'not_configured');
  const status = publicProviderStatus(rawStatus);
  const lastSuccessfulFetch = quoteCell?.lastSuccessAt ?? profile?.lastSuccessAt ?? null;
  const lastError = quoteCell?.lastErrorReason ?? (configured ? null : `${provider}_not_configured`);
  const rateLimitedUntil = quoteCell?.rateLimitedUntil ?? profile?.rateLimitedUntil ?? null;
  const nextRetryAt = quoteCell?.nextRetryAt ?? rateLimitedUntil;

  return {
    configured,
    healthy: status === 'healthy',
    rateLimited: status === 'rate_limited',
    status,
    lastSuccessfulFetch,
    lastError,
    lastErrorAt: quoteCell?.lastErrorAt ?? profile?.lastErrorAt ?? null,
    rateLimitedUntil,
    nextRetryAt,
    // A market-state snapshot currently carries no cache proof for an individual provider.
    cacheAvailable: false,
  };
}

function calendarProviderObservation(
  features: Partial<Record<TraderProviderFeature, TraderFeatureStatus>> | undefined,
  provider: 'finnhub' | 'tradingeconomics',
  configured: boolean,
): ProviderObservation {
  const matching = Object.values(features ?? {}).filter((feature): feature is TraderFeatureStatus => Boolean(feature && feature.provider === provider));
  const rateLimited = matching.find(feature => feature.status === 'rate_limited');
  const failed = matching.find(feature => !['success', 'available', 'unknown', 'not_configured'].includes(feature.status));
  const successful = matching
    .filter(feature => feature.status === 'success')
    .sort((left, right) => String(right.lastSuccessfulUpdate ?? '').localeCompare(String(left.lastSuccessfulUpdate ?? '')))[0];

  if (rateLimited) {
    return {
      configured,
      healthy: false,
      rateLimited: true,
      status: 'rate_limited',
      lastSuccessfulFetch: successful?.lastSuccessfulUpdate ?? null,
      lastError: rateLimited.failureReason,
      lastErrorAt: rateLimited.lastUpdated,
      rateLimitedUntil: null,
      nextRetryAt: null,
      cacheAvailable: false,
    };
  }

  if (failed) {
    return {
      configured,
      healthy: false,
      rateLimited: false,
      status: publicProviderStatus(failed.status),
      lastSuccessfulFetch: successful?.lastSuccessfulUpdate ?? null,
      lastError: failed.failureReason,
      lastErrorAt: failed.lastUpdated,
      rateLimitedUntil: null,
      nextRetryAt: null,
      cacheAvailable: false,
    };
  }

  if (successful) {
    return {
      configured,
      healthy: true,
      rateLimited: false,
      status: 'healthy',
      lastSuccessfulFetch: successful.lastSuccessfulUpdate ?? successful.lastUpdated,
      lastError: null,
      lastErrorAt: null,
      rateLimitedUntil: null,
      nextRetryAt: null,
      cacheAvailable: false,
    };
  }

  return {
    configured,
    healthy: false,
    rateLimited: false,
    status: configured ? 'unknown' : 'not_configured',
    lastSuccessfulFetch: null,
    lastError: configured ? null : `${provider}_not_configured`,
    lastErrorAt: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    cacheAvailable: false,
  };
}

function mergeProviderObservations(state: ProviderObservation, calendar: ProviderObservation): ProviderObservation {
  // A live quote observation (including a failure) is more recent/broader than
  // an unprobed calendar state. Calendar data fills only the explicit unknown gap.
  return state.status === 'unknown' && calendar.status !== 'unknown' ? calendar : state;
}

function availableQuoteProviders(capabilityMatrix: MarketSystemState['capabilityMatrix'] | undefined) {
  return Array.from(new Set((capabilityMatrix ?? [])
    .filter(capability => capability.capability === 'quotes'
      && capability.status === 'connected'
      && capability.healthy === true)
    .map(capability => traderProviderDisplayName(capability.provider))
    .filter((provider): provider is string => Boolean(provider))));
}

function normalizeFmpStatus(args: {
  configured: boolean;
  runtime: FmpRuntimeStatus;
  diagnostics: CatalogDiagnostics;
  generatedAt: string;
}): NormalizedTraderProviderStatus {
  const failedCount = args.diagnostics.failedSymbols.length;
  const cachedCount = args.diagnostics.summary.cachedSymbols;
  const skippedCount = args.diagnostics.unsupportedSymbols.length + args.diagnostics.summary.skippedDueToRateLimit;
  const loadedCount = args.diagnostics.totalSymbolsLoaded;
  const status: NormalizedTraderProviderStatus['status'] = !args.configured
    ? 'missing'
    : args.runtime.rateLimited
      ? 'rate_limited'
      : args.runtime.status === 'unknown'
        ? 'unknown'
      : failedCount > 0 && loadedCount > 0
        ? 'partial'
        : failedCount > 0 || Boolean(args.runtime.lastError)
          ? 'error'
          : 'available';
  const errorSummary = status === 'rate_limited'
    ? RATE_LIMIT_REASON
    : status === 'missing'
      ? 'provider_not_configured'
      : status === 'partial'
        ? 'provider_partially_available'
        : status === 'error'
          ? 'provider_temporarily_unavailable'
          : null;

  return {
    provider: 'FMP',
    configured: args.configured,
    status,
    supportedFeatures: FMP_SUPPORTED_FEATURES,
    loadedCount,
    failedCount,
    cachedCount,
    skippedCount,
    lastUpdated: args.runtime.lastSuccessfulFetch,
    lastAttemptAt: args.runtime.lastErrorAt ?? args.runtime.lastSuccessfulFetch,
    nextRetryAt: args.runtime.nextRetryAt ?? args.runtime.rateLimitedUntil,
    // A cached catalog or a configured alternate provider is not evidence that
    // this status request actually performed a successful fallback.
    fallbackAttempted: false,
    affectedSymbolsCount: failedCount + skippedCount,
    errorSummary,
  };
}

function diagnosticGroups(diagnostics: CatalogDiagnostics, normalized: NormalizedTraderProviderStatus) {
  const failed = diagnostics.failedSymbols.map(item => ({
    route: routeLabel(item.symbol),
    reason: cleanProviderReason(item.reason),
  }));
  const rateLimitedRoutes = failed.filter(item => item.reason === 'provider_rate_limited');
  const groups = [];

  if (normalized.status === 'rate_limited' || rateLimitedRoutes.length > 0) {
    const routes = rateLimitedRoutes.length ? rateLimitedRoutes : failed;
    groups.push({
      provider: 'FMP',
      status: 'rate_limited',
      summary: RATE_LIMIT_REASON,
      affectedSymbolsCount: routes.length,
      affectedSymbols: routes.map(item => item.route),
      reason: RATE_LIMIT_REASON,
      details: routes.map(item => ({
        route: item.route,
        reason: RATE_LIMIT_REASON,
      })),
    });
  }

  const otherFailures = failed.filter(item => item.reason !== 'provider_rate_limited');
  if (otherFailures.length > 0) {
    groups.push({
      provider: 'FMP',
      status: normalized.status === 'available' ? 'partial' : normalized.status,
      summary: 'provider_temporarily_unavailable',
      affectedSymbolsCount: otherFailures.length,
      affectedSymbols: otherFailures.map(item => item.route),
      reason: 'provider_temporarily_unavailable',
      details: otherFailures.map(item => ({
        route: item.route,
        reason: item.reason ?? 'provider_temporarily_unavailable',
      })),
    });
  }

  return groups;
}

function advancedDiagnostics(args: {
  diagnostics: CatalogDiagnostics;
  normalized: NormalizedTraderProviderStatus;
  runtime: FmpRuntimeStatus;
  generatedAt: string;
  fallbackAttempted: boolean;
}) {
  const affected = args.diagnostics.failedSymbols
    .filter(item => args.normalized.status === 'rate_limited' || cleanProviderReason(item.reason) === RATE_LIMIT_REASON)
    .map(item => ({
      symbol: routeLabel(item.symbol),
      reason: cleanProviderReason(item.reason) ?? RATE_LIMIT_REASON,
    }));

  if (args.runtime.rateLimited && affected.length === 0) {
    affected.push({ symbol: 'FMP', reason: RATE_LIMIT_REASON });
  }

  if (!args.runtime.rateLimited && affected.length === 0 && (args.normalized.status === 'available' || args.normalized.status === 'unknown')) return [];

  return [{
    provider: 'FMP',
    status: args.normalized.status,
    affectedSymbolsCount: args.normalized.affectedSymbolsCount || affected.length,
    affectedSymbols: affected.map(item => item.symbol),
    lastAttemptAt: args.runtime.lastErrorAt ?? args.runtime.lastSuccessfulFetch ?? args.generatedAt,
    nextRetryAt: args.runtime.nextRetryAt ?? args.runtime.rateLimitedUntil,
    fallbackAttempted: args.fallbackAttempted,
    reason: args.runtime.rateLimited ? RATE_LIMIT_REASON : cleanProviderReason(args.runtime.lastError) ?? args.normalized.errorSummary,
    details: affected,
  }];
}

async function buildProviderStatusResponse(options: {
  isAdmin: boolean;
  forceFresh?: boolean;
  discover?: boolean;
  marketId?: string | null;
}) {
  const {
    isAdmin,
    forceFresh = false,
    discover = false,
    marketId = null,
  } = options;
  // Populate this instance's runtime view before reading any legacy or unified
  // provider fields. Without this, the response could report FMP as available
  // while its embedded market state correctly reports a shared cooldown.
  await synchronizeFmpSharedCooldown();
  const status = getTraderProviderStatus();
  const catalog = await getTraderMarketCatalog({
    forceFresh,
    includeFmpDiscovery: discover && Boolean(marketId),
    marketId,
  });
  const fmpConfigured = normalizeEnvValue(process.env.FMP_API_KEY);
  const finnhubConfigured = normalizeEnvValue(process.env.FINNHUB_API_KEY);
  const tradingEconomicsConfigured = normalizeEnvValue(process.env.TRADING_ECONOMICS_API_KEY);
  const fmpRuntime = getFmpRuntimeStatus(fmpConfigured, catalog.diagnostics.cacheStatus === 'hit' || catalog.diagnostics.cacheStatus === 'stale');
  const now = new Date().toISOString();
  // Obtain real quote observations before rendering the legacy provider fields.
  // The route deliberately does not turn environment configuration or catalog
  // declarations into a health result.
  const state = await getMarketSystemState({ forceFresh });
  const yahooObservation = observedProviderState(state, 'yahoo', true);
  const finnhubObservation = mergeProviderObservations(
    observedProviderState(state, 'finnhub', finnhubConfigured),
    calendarProviderObservation(status.features, 'finnhub', finnhubConfigured),
  );
  const tradingEconomicsObservation = mergeProviderObservations(
    observedProviderState(state, 'tradingeconomics', tradingEconomicsConfigured),
    calendarProviderObservation(status.features, 'tradingeconomics', tradingEconomicsConfigured),
  );
  const normalizedStatus = normalizeFmpStatus({
    configured: fmpConfigured,
    runtime: fmpRuntime,
    diagnostics: catalog.diagnostics,
    generatedAt: now,
  });
  const diagnosticSummary = diagnosticGroups(catalog.diagnostics, normalizedStatus);
  const safeCatalogDiagnostics = sanitizeCatalogDiagnostics(catalog.diagnostics);
  const safeCapabilityMatrix = sanitizeCapabilityMatrix(catalog.capabilityMatrix);
  const providerSummary = {
    fmp: publicProviderStatus(fmpRuntime.status),
    yahoo: yahooObservation.status,
    finnhub: finnhubObservation.status,
    tradingEconomics: tradingEconomicsObservation.status,
    loadedSymbols: catalog.diagnostics.totalSymbolsLoaded,
    failedSymbols: catalog.diagnostics.failedSymbols.length,
    cachedSymbols: catalog.diagnostics.summary.cachedSymbols,
    skippedDueToRateLimit: catalog.diagnostics.summary.skippedDueToRateLimit,
    nextRetryAt: fmpRuntime.nextRetryAt,
  };
  const availableProviders = availableQuoteProviders(state.capabilityMatrix);
  // This endpoint observes health; it never performs a quote fallback itself.
  // Do not present an eligible provider as though it was actually used.
  const fallbackAttempted = false;
  const advancedDiagnosticsSummary = advancedDiagnostics({
    diagnostics: catalog.diagnostics,
    normalized: {
      ...normalizedStatus,
      fallbackAttempted,
    },
    runtime: fmpRuntime,
    generatedAt: now,
    fallbackAttempted,
  });

  const dataProvider = fmpRuntime.rateLimited
    ? {
        ...status.dataProvider,
        configured: fmpConfigured,
        active: 'fmp',
        provider: 'fmp',
        status: 'rate_limited',
        failureReason: isAdmin ? RATE_LIMIT_REASON : null,
      }
    : {
        ...status.dataProvider,
        failureReason: cleanProviderReason(status.dataProvider.failureReason),
      };

  const response = {
    ok: true,
    state,
    providers: {
      fmp: {
        configured: fmpConfigured,
        healthy: fmpRuntime.healthy,
        rate_limited: fmpRuntime.rateLimited,
        status: publicProviderStatus(fmpRuntime.status),
        legacyStatus: mapLegacyStatusToDisplay(fmpConfigured ? 'configured' : 'missing'),
        features: {
          earnings: Boolean(fmpConfigured),
          dividends: Boolean(fmpConfigured),
          ipos: Boolean(fmpConfigured),
          economicCalendar: Boolean(fmpConfigured),
          quotes: Boolean(fmpConfigured),
          symbols: Boolean(fmpConfigured),
        },
        lastChecked: fmpRuntime.lastSuccessfulFetch ?? fmpRuntime.lastErrorAt,
        lastSuccessfulFetch: fmpRuntime.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(fmpRuntime.lastError) : null,
        rateLimitedUntil: fmpRuntime.rateLimitedUntil,
        nextRetryAt: fmpRuntime.nextRetryAt,
        cacheAvailable: fmpRuntime.cacheAvailable,
        error: isAdmin ? (fmpRuntime.rateLimited ? RATE_LIMIT_REASON : cleanProviderReason(fmpRuntime.lastError)) : null,
      },
      yahoo: {
        configured: yahooObservation.configured,
        healthy: yahooObservation.healthy,
        rate_limited: yahooObservation.rateLimited,
        status: yahooObservation.status,
        legacyStatus: mapLegacyStatusToDisplay('configured'),
        features: {
          quotes: true,
          technicalAnalysis: true,
        },
        lastChecked: yahooObservation.lastSuccessfulFetch ?? yahooObservation.lastErrorAt,
        lastSuccessfulFetch: yahooObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(yahooObservation.lastError) : null,
        cacheAvailable: yahooObservation.cacheAvailable,
        error: isAdmin ? cleanProviderReason(yahooObservation.lastError) : null,
      },
      finnhub: {
        configured: finnhubObservation.configured,
        healthy: finnhubObservation.healthy,
        rate_limited: finnhubObservation.rateLimited,
        status: finnhubObservation.status,
        legacyStatus: mapLegacyStatusToDisplay(finnhubConfigured ? 'configured' : 'missing'),
        features: {
          earnings: Boolean(finnhubConfigured),
          dividends: Boolean(finnhubConfigured),
          news: Boolean(finnhubConfigured),
          economicCalendar: Boolean(finnhubConfigured),
        },
        lastChecked: finnhubObservation.lastSuccessfulFetch ?? finnhubObservation.lastErrorAt,
        lastSuccessfulFetch: finnhubObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(finnhubObservation.lastError) : null,
        rateLimitedUntil: finnhubObservation.rateLimitedUntil,
        nextRetryAt: finnhubObservation.nextRetryAt,
        cacheAvailable: finnhubObservation.cacheAvailable,
        error: isAdmin ? cleanProviderReason(finnhubObservation.lastError) : null,
      },
      tradingEconomics: {
        configured: tradingEconomicsObservation.configured,
        healthy: tradingEconomicsObservation.healthy,
        rate_limited: tradingEconomicsObservation.rateLimited,
        status: tradingEconomicsObservation.status,
        legacyStatus: mapLegacyStatusToDisplay(tradingEconomicsConfigured ? 'configured' : 'missing'),
        features: {
          economicCalendar: Boolean(tradingEconomicsConfigured),
        },
        lastChecked: tradingEconomicsObservation.lastSuccessfulFetch ?? tradingEconomicsObservation.lastErrorAt,
        lastSuccessfulFetch: tradingEconomicsObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(tradingEconomicsObservation.lastError) : null,
        rateLimitedUntil: tradingEconomicsObservation.rateLimitedUntil,
        nextRetryAt: tradingEconomicsObservation.nextRetryAt,
        cacheAvailable: tradingEconomicsObservation.cacheAvailable,
        error: isAdmin ? cleanProviderReason(tradingEconomicsObservation.lastError) : null,
      },
    },
    normalizedStatus: {
      ...normalizedStatus,
      fallbackAttempted,
    },
    diagnosticGroups: isAdmin ? diagnosticSummary : [],
    advancedDiagnostics: advancedDiagnosticsSummary,
    availableProviders,
    userMessages: {
      rateLimit: {
        ar: RATE_LIMIT_MESSAGE_AR,
        en: RATE_LIMIT_MESSAGE_EN,
      },
    },
    // Keep compatibility with existing trader-app consumers.
    features: status.features,
    dataProvider,
    providerMatrix: {
      fmp: {
        configured: fmpConfigured,
        healthy: fmpRuntime.healthy,
        rate_limited: fmpRuntime.rateLimited,
        status: publicProviderStatus(fmpRuntime.status),
        lastSuccessfulFetch: fmpRuntime.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(fmpRuntime.lastError) : null,
        nextRetryAt: fmpRuntime.nextRetryAt,
        cacheAvailable: fmpRuntime.cacheAvailable,
        supportedFeatures: fmpRuntime.supportedFeatures,
      },
      yahoo: {
        configured: yahooObservation.configured,
        healthy: yahooObservation.healthy,
        rate_limited: yahooObservation.rateLimited,
        status: yahooObservation.status,
        lastSuccessfulFetch: yahooObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(yahooObservation.lastError) : null,
        nextRetryAt: yahooObservation.nextRetryAt,
        cacheAvailable: yahooObservation.cacheAvailable,
        supportedFeatures: ['quotes', 'technicalAnalysis'],
      },
      finnhub: {
        configured: finnhubObservation.configured,
        healthy: finnhubObservation.healthy,
        rate_limited: finnhubObservation.rateLimited,
        status: finnhubObservation.status,
        lastSuccessfulFetch: finnhubObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(finnhubObservation.lastError) : null,
        nextRetryAt: finnhubObservation.nextRetryAt,
        cacheAvailable: finnhubObservation.cacheAvailable,
        supportedFeatures: ['earnings', 'dividends', 'economicCalendar', 'news'],
      },
      tradingEconomics: {
        configured: tradingEconomicsObservation.configured,
        healthy: tradingEconomicsObservation.healthy,
        rate_limited: tradingEconomicsObservation.rateLimited,
        status: tradingEconomicsObservation.status,
        lastSuccessfulFetch: tradingEconomicsObservation.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(tradingEconomicsObservation.lastError) : null,
        nextRetryAt: tradingEconomicsObservation.nextRetryAt,
        cacheAvailable: tradingEconomicsObservation.cacheAvailable,
        supportedFeatures: ['economicCalendar'],
      },
    },
    capabilityMatrix: safeCapabilityMatrix,
    diagnostics: isAdmin ? safeCatalogDiagnostics : undefined,
    summary: isAdmin ? providerSummary : undefined,
    loaded: isAdmin
      ? catalog.symbols.slice(0, 50).map(symbol => ({
          symbol: symbol.symbol,
          provider: symbol.source,
          reason: 'symbol_discovered',
        }))
      : undefined,
    failed: isAdmin ? safeCatalogDiagnostics.failedSymbols : undefined,
    skipped: isAdmin ? safeCatalogDiagnostics.unsupportedSymbols.slice(0, 50) : undefined,
    provider: isAdmin ? catalog.diagnostics.provider : undefined,
    reason: isAdmin ? cleanProviderReason(catalog.diagnostics.reason) : undefined,
    resultCount: catalog.diagnostics.totalSymbolsLoaded,
    generatedAt: now,
  };

  console.info('[trader-provider-status] provider health', {
    fmp: { configured: fmpConfigured, status: fmpRuntime.status },
    yahoo: { configured: yahooObservation.configured, status: yahooObservation.status },
    finnhub: { configured: finnhubObservation.configured, status: finnhubObservation.status },
    tradingEconomics: { configured: tradingEconomicsObservation.configured, status: tradingEconomicsObservation.status },
  });

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

const LEGACY_MUTATION_FLAGS = ['retry', 'clearCache', 'refresh', 'discover'] as const;
const ADMIN_ACTIONS = new Set(['status', 'retry', 'clearCache', 'refresh', 'discover']);

function providerStatusError(status = 503) {
  return NextResponse.json({
    ok: false,
    code: 'PROVIDER_STATUS_UNAVAILABLE',
    state: 'error',
  }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, {
    max: 30,
    windowMs: 60_000,
    prefix: 'trader-provider-status-read',
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const rejectedFlags = LEGACY_MUTATION_FLAGS.filter(flag => url.searchParams.has(flag));
  if (rejectedFlags.length > 0) {
    return NextResponse.json({
      ok: false,
      code: 'MUTATION_REQUIRES_AUTHENTICATED_POST',
      state: 'unsupported',
      rejected: rejectedFlags,
    }, {
      status: 405,
      headers: {
        Allow: 'GET, POST',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  try {
    return await buildProviderStatusResponse({ isAdmin: false });
  } catch {
    return providerStatusError();
  }
}

export const POST = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 12, windowMs: 60_000, prefix: 'trader-provider-status-admin' },
}, async ({ request, json }) => {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return json({ ok: false, code: 'INVALID_BODY' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : 'status';
  if (!ADMIN_ACTIONS.has(action)) {
    return json({ ok: false, code: 'UNSUPPORTED_ACTION' }, { status: 400 });
  }

  const marketId = typeof body.market === 'string' ? body.market.trim().slice(0, 80) : null;
  if (action === 'discover' && !marketId) {
    return json({ ok: false, code: 'MARKET_REQUIRED' }, { status: 400 });
  }

  try {
    if (action === 'retry') resetFmpRateLimitCooldown();
    if (action === 'clearCache') {
      clearTraderQuoteCache();
      clearTraderMarketCatalogCache();
      clearFmpRuntimeCacheMarkers();
    }

    return await buildProviderStatusResponse({
      isAdmin: true,
      forceFresh: action !== 'status',
      discover: action === 'discover',
      marketId,
    });
  } catch {
    return providerStatusError();
  }
});
