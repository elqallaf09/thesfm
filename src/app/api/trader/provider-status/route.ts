import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
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
import type { CatalogDiagnostics, ProviderCapability } from '@/lib/trader/marketCatalog';
import type { FmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import type { NormalizedTraderProviderStatus, TraderProviderFeature } from '@/lib/trader/providers/types';

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

function publicProviderStatus(status: string) {
  if (status === 'healthy') return 'healthy';
  if (status === 'rate_limited') return 'rate_limited';
  if (status === 'not_configured') return 'not_configured';
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

function availableQuoteProviders(capabilityMatrix: Record<string, { configured?: boolean; healthy?: boolean; supportsQuotes?: boolean; status?: string; rateLimited?: boolean }>) {
  return Array.from(new Set(Object.entries(capabilityMatrix)
    .filter(([, capability]) => capability.supportsQuotes !== false
      && capability.status !== 'rate_limited'
      && capability.rateLimited !== true
      && (capability.configured === true || capability.healthy === true || capability.status === 'healthy'))
    .map(([provider]) => traderProviderDisplayName(provider))
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
    lastUpdated: args.runtime.lastSuccessfulFetch ?? args.generatedAt,
    lastAttemptAt: args.runtime.lastErrorAt ?? args.runtime.lastSuccessfulFetch ?? args.generatedAt,
    nextRetryAt: args.runtime.nextRetryAt ?? args.runtime.rateLimitedUntil,
    fallbackAttempted: args.runtime.rateLimited || cachedCount > 0 || args.diagnostics.summary.skippedDueToRateLimit > 0,
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

  if (!args.runtime.rateLimited && affected.length === 0 && args.normalized.status === 'available') return [];

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
    yahoo: 'healthy',
    finnhub: finnhubConfigured ? 'healthy' : 'not_configured',
    loadedSymbols: catalog.diagnostics.totalSymbolsLoaded,
    failedSymbols: catalog.diagnostics.failedSymbols.length,
    cachedSymbols: catalog.diagnostics.summary.cachedSymbols,
    skippedDueToRateLimit: catalog.diagnostics.summary.skippedDueToRateLimit,
    nextRetryAt: fmpRuntime.nextRetryAt,
  };
  const availableProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const fallbackAttempted = fmpRuntime.rateLimited && availableProviders.some(provider => provider !== 'FMP');
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
    ? fallbackAttempted
      ? {
          ...status.dataProvider,
          configured: true,
          active: 'yahoo',
          provider: 'yahoo',
          status: 'available',
          failureReason: null,
          supportedFeatures: ['prices'],
        }
      : {
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

  // Additive-only field — every key below this line already existed and is byte-compatible with
  // the vanilla-JS trader terminal, which calls this exact route (see
  // traderProviderStatusEnvelope.test.ts for the regression guard). `state` is the new unified
  // market-state view; existing consumers can ignore it.
  const state = await getMarketSystemState({ forceFresh });

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
        lastChecked: now,
        lastSuccessfulFetch: fmpRuntime.lastSuccessfulFetch,
        lastError: isAdmin ? cleanProviderReason(fmpRuntime.lastError) : null,
        rateLimitedUntil: fmpRuntime.rateLimitedUntil,
        nextRetryAt: fmpRuntime.nextRetryAt,
        cacheAvailable: fmpRuntime.cacheAvailable,
        error: isAdmin ? (fmpRuntime.rateLimited ? RATE_LIMIT_REASON : cleanProviderReason(fmpRuntime.lastError)) : null,
      },
      yahoo: {
        configured: true,
        healthy: true,
        rate_limited: false,
        status: 'healthy',
        legacyStatus: mapLegacyStatusToDisplay('configured'),
        features: {
          quotes: true,
          technicalAnalysis: true,
        },
        lastChecked: now,
        lastSuccessfulFetch: null,
        lastError: null,
        cacheAvailable: true,
        error: null,
      },
      finnhub: {
        configured: finnhubConfigured,
        healthy: finnhubConfigured,
        rate_limited: false,
        status: finnhubConfigured ? 'healthy' : 'not_configured',
        legacyStatus: mapLegacyStatusToDisplay(finnhubConfigured ? 'configured' : 'missing'),
        features: {
          earnings: Boolean(finnhubConfigured),
          dividends: Boolean(finnhubConfigured),
          news: Boolean(finnhubConfigured),
          economicCalendar: Boolean(finnhubConfigured),
        },
        lastChecked: finnhubConfigured ? now : null,
        lastSuccessfulFetch: null,
        lastError: finnhubConfigured ? null : 'finnhub_not_configured',
        cacheAvailable: false,
        error: null,
      },
      tradingEconomics: {
        configured: tradingEconomicsConfigured,
        healthy: tradingEconomicsConfigured,
        rate_limited: false,
        status: tradingEconomicsConfigured ? 'healthy' : 'not_configured',
        legacyStatus: mapLegacyStatusToDisplay(tradingEconomicsConfigured ? 'configured' : 'missing'),
        features: {
          economicCalendar: Boolean(tradingEconomicsConfigured),
        },
        lastChecked: tradingEconomicsConfigured ? now : null,
        lastSuccessfulFetch: null,
        lastError: tradingEconomicsConfigured ? null : 'tradingeconomics_not_configured',
        cacheAvailable: false,
        error: null,
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
        configured: true,
        healthy: true,
        rate_limited: false,
        status: 'healthy',
        lastSuccessfulFetch: null,
        lastError: null,
        cacheAvailable: true,
        supportedFeatures: ['quotes', 'technicalAnalysis'],
      },
      finnhub: {
        configured: finnhubConfigured,
        healthy: finnhubConfigured,
        rate_limited: false,
        status: finnhubConfigured ? 'healthy' : 'not_configured',
        lastSuccessfulFetch: null,
        lastError: finnhubConfigured ? null : 'finnhub_not_configured',
        cacheAvailable: false,
        supportedFeatures: ['earnings', 'dividends', 'economicCalendar', 'news'],
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
    yahoo: { configured: true, status: 'healthy' },
    finnhub: { configured: finnhubConfigured, status: finnhubConfigured ? 'healthy' : 'not_configured' },
    tradingEconomics: { configured: tradingEconomicsConfigured },
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

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, {
    max: 12,
    windowMs: 60_000,
    prefix: 'trader-provider-status-admin',
  });
  if (limited) return limited;

  const auth = await requireAdminApiAccess(request, 'admin_dashboard').catch(() => null);
  if (!auth) return providerStatusError();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.code }, {
      status: auth.status,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, code: 'INVALID_BODY' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : 'status';
  if (!ADMIN_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, code: 'UNSUPPORTED_ACTION' }, { status: 400 });
  }

  const marketId = typeof body.market === 'string' ? body.market.trim().slice(0, 80) : null;
  if (action === 'discover' && !marketId) {
    return NextResponse.json({ ok: false, code: 'MARKET_REQUIRED' }, { status: 400 });
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
}
