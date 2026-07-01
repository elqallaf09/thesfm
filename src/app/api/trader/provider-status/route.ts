import { NextResponse } from 'next/server';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';
import { getFmpRuntimeStatus } from '@/lib/trader/providers/fmpRuntime';
import { getOpenbbConfiguredStatus, getOpenbbHealthStatus } from '@/lib/trader/providers/openbb';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = getTraderProviderStatus();
  const forceFresh = url.searchParams.has('refresh');
  const discover = url.searchParams.has('discover');
  const catalog = await getTraderMarketCatalog({
    forceFresh,
    includeFmpDiscovery: discover,
    marketId: url.searchParams.get('market'),
  });
  const fmpConfigured = normalizeEnvValue(process.env.FMP_API_KEY);
  const finnhubConfigured = normalizeEnvValue(process.env.FINNHUB_API_KEY);
  const tradingEconomicsConfigured = normalizeEnvValue(process.env.TRADING_ECONOMICS_API_KEY);
  const openbbConfigured = normalizeEnvValue(process.env.OPENBB_SERVICE_URL);
  const fmpRuntime = getFmpRuntimeStatus(fmpConfigured, catalog.diagnostics.cacheStatus === 'hit' || catalog.diagnostics.cacheStatus === 'stale');
  const openbbRuntime = openbbConfigured
    ? await getOpenbbHealthStatus({ force: forceFresh })
    : getOpenbbConfiguredStatus();
  const now = new Date().toISOString();
  const providerSummary = {
    fmp: publicProviderStatus(fmpRuntime.status),
    openbb: publicProviderStatus(openbbRuntime.status),
    loadedSymbols: catalog.diagnostics.totalSymbolsLoaded,
    failedSymbols: catalog.diagnostics.failedSymbols.length,
    cachedSymbols: catalog.diagnostics.summary.cachedSymbols,
    skippedDueToRateLimit: catalog.diagnostics.summary.skippedDueToRateLimit,
  };

  const dataProvider = fmpRuntime.rateLimited
    ? {
        ...status.dataProvider,
        configured: fmpConfigured,
        active: 'fmp',
        provider: 'fmp',
        status: 'rate_limited',
        failureReason: 'تم الوصول إلى حد استخدام مزود البيانات مؤقتاً',
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
        error: fmpRuntime.rateLimited ? 'تم الوصول إلى حد استخدام مزود البيانات مؤقتاً' : fmpRuntime.lastError,
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
      openbb: {
        configured: openbbRuntime.configured,
        healthy: openbbRuntime.healthy,
        rate_limited: false,
        status: publicProviderStatus(openbbRuntime.status),
        legacyStatus: mapLegacyStatusToDisplay(openbbRuntime.configured ? 'configured' : 'missing'),
        features: {
          quotes: Boolean(openbbRuntime.configured),
          technicalAnalysis: Boolean(openbbRuntime.configured),
        },
        lastChecked: openbbRuntime.configured ? now : null,
        lastSuccessfulFetch: openbbRuntime.lastSuccessfulFetch,
        lastError: openbbRuntime.lastError,
        cacheAvailable: openbbRuntime.cacheAvailable,
        error: openbbRuntime.configured ? openbbRuntime.lastError : 'OpenBB غير مهيأ',
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
        lastError: fmpRuntime.lastError,
        cacheAvailable: fmpRuntime.cacheAvailable,
        supportedFeatures: fmpRuntime.supportedFeatures,
      },
      openbb: {
        configured: openbbRuntime.configured,
        healthy: openbbRuntime.healthy,
        rate_limited: false,
        status: publicProviderStatus(openbbRuntime.status),
        lastSuccessfulFetch: openbbRuntime.lastSuccessfulFetch,
        lastError: openbbRuntime.lastError,
        cacheAvailable: openbbRuntime.cacheAvailable,
        supportedFeatures: openbbRuntime.supportedFeatures,
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
    providerFlags: {
      fmpConfigured,
      finnhubConfigured,
      tradingEconomicsConfigured,
      openbbConfigured,
    },
    legacy: {
      providers: {
        fmpConfigured,
        finnhubConfigured,
        tradingEconomicsConfigured,
        openbbConfigured,
      },
      features: status.features,
      dataProvider,
    },
    generatedAt: now,
  };

  console.info('[trader-provider-status] providers', {
    fmp: response.providers.fmp,
    finnhub: response.providers.finnhub,
    tradingEconomics: response.providers.tradingEconomics,
    openbb: response.providers.openbb,
  });

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
