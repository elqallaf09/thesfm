import { NextResponse } from 'next/server';
import { traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';
import { getFmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import type { CatalogDiagnostics } from '@/lib/trader/marketCatalog';
import type { FmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import type { NormalizedTraderProviderStatus, TraderProviderFeature } from '@/lib/trader/providers/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_MESSAGE_AR = 'تم الوصول إلى حد استخدام مزود البيانات مؤقتاً';
const FMP_SUPPORTED_FEATURES: TraderProviderFeature[] = ['prices', 'earnings', 'dividends', 'ipos', 'economic'];

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
  return value.length > 140 ? `${value.slice(0, 137).trim()}...` : value;
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

function availableQuoteProviders(capabilityMatrix: Record<string, { configured?: boolean; healthy?: boolean; supportsQuotes?: boolean; status?: string }>) {
  return Array.from(new Set(Object.entries(capabilityMatrix)
    .filter(([, capability]) => capability.supportsQuotes !== false
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
    ? RATE_LIMIT_MESSAGE_AR
    : status === 'missing'
      ? 'FMP غير مهيأ'
      : status === 'partial'
        ? 'FMP متاح جزئياً مع تعثر بعض المسارات'
        : status === 'error'
          ? 'تعذر تحديث بيانات FMP حالياً'
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
      summary: routes.length > 0
        ? `تم الوصول إلى حد الاستخدام في ${routes.length} مسارات`
        : `${RATE_LIMIT_MESSAGE_AR}`,
      details: routes.map(item => ({
        route: item.route,
        reason: RATE_LIMIT_MESSAGE_AR,
      })),
    });
  }

  const otherFailures = failed.filter(item => item.reason !== 'provider_rate_limited');
  if (otherFailures.length > 0) {
    groups.push({
      provider: 'FMP',
      status: normalized.status === 'available' ? 'partial' : normalized.status,
      summary: `تعثر ${otherFailures.length} مسارات`,
      details: otherFailures.map(item => ({
        route: item.route,
        reason: item.reason ?? 'provider_temporarily_unavailable',
      })),
    });
  }

  // OpenBB removed — no longer a configured provider

  return groups;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = getTraderProviderStatus();
  const forceFresh = url.searchParams.has('refresh');
  const discover = url.searchParams.has('discover');
  const marketId = url.searchParams.get('market');
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
  const providerSummary = {
    fmp: publicProviderStatus(fmpRuntime.status),
    yahoo: 'healthy',
    finnhub: finnhubConfigured ? 'healthy' : 'not_configured',
    loadedSymbols: catalog.diagnostics.totalSymbolsLoaded,
    failedSymbols: catalog.diagnostics.failedSymbols.length,
    cachedSymbols: catalog.diagnostics.summary.cachedSymbols,
    skippedDueToRateLimit: catalog.diagnostics.summary.skippedDueToRateLimit,
  };
  const availableProviders = availableQuoteProviders(catalog.capabilityMatrix);

  const dataProvider = fmpRuntime.rateLimited
    ? {
        ...status.dataProvider,
        configured: fmpConfigured,
        active: 'fmp',
        provider: 'fmp',
        status: 'rate_limited',
        failureReason: RATE_LIMIT_MESSAGE_AR,
      }
    : status.dataProvider;

  const response = {
    ok: true,
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
        lastError: fmpRuntime.lastError,
        rateLimitedUntil: fmpRuntime.rateLimitedUntil,
        cacheAvailable: fmpRuntime.cacheAvailable,
        error: fmpRuntime.rateLimited ? RATE_LIMIT_MESSAGE_AR : fmpRuntime.lastError,
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
    normalizedStatus,
    diagnosticGroups: [],
    availableProviders,
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
        lastError: fmpRuntime.lastError,
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
    capabilityMatrix: catalog.capabilityMatrix,
    diagnostics: catalog.diagnostics,
    summary: providerSummary,
    loaded: catalog.symbols.slice(0, 50).map(symbol => ({
      symbol: symbol.symbol,
      provider: symbol.source,
      reason: 'symbol_discovered',
    })),
    failed: catalog.diagnostics.failedSymbols,
    skipped: catalog.diagnostics.unsupportedSymbols.slice(0, 50),
    provider: catalog.diagnostics.provider,
    reason: catalog.diagnostics.reason,
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
