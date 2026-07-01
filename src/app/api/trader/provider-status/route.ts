import { NextResponse } from 'next/server';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';

export const dynamic = 'force-dynamic';

function normalizeEnvValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

function mapLegacyStatusToDisplay(status: string): 'configured' | 'missing' | 'error' {
  return status === 'configured' ? status : status === 'error' ? 'error' : 'missing';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = getTraderProviderStatus();
  const catalog = await getTraderMarketCatalog({
    forceFresh: url.searchParams.has('refresh') || url.searchParams.has('discover'),
  });
  const fmpConfigured = normalizeEnvValue(process.env.FMP_API_KEY);
  const finnhubConfigured = normalizeEnvValue(process.env.FINNHUB_API_KEY);
  const tradingEconomicsConfigured = normalizeEnvValue(process.env.TRADING_ECONOMICS_API_KEY);
  const openbbConfigured = normalizeEnvValue(process.env.OPENBB_API_KEY) || normalizeEnvValue(process.env.OPENBB_API_URL);
  const now = new Date().toISOString();

  const response = {
    ok: true,
    providers: {
      fmp: {
        configured: fmpConfigured,
        status: mapLegacyStatusToDisplay(fmpConfigured ? 'configured' : 'missing'),
        features: {
          earnings: Boolean(fmpConfigured),
          dividends: Boolean(fmpConfigured),
          ipos: Boolean(fmpConfigured),
          economicCalendar: Boolean(fmpConfigured),
        },
        lastChecked: fmpConfigured ? now : null,
        error: null,
      },
      finnhub: {
        configured: finnhubConfigured,
        status: mapLegacyStatusToDisplay(finnhubConfigured ? 'configured' : 'missing'),
        features: {
          earnings: Boolean(finnhubConfigured),
          dividends: Boolean(finnhubConfigured),
          news: Boolean(finnhubConfigured),
          economicCalendar: Boolean(finnhubConfigured),
        },
        lastChecked: finnhubConfigured ? now : null,
        error: null,
      },
      tradingEconomics: {
        configured: tradingEconomicsConfigured,
        status: mapLegacyStatusToDisplay(tradingEconomicsConfigured ? 'configured' : 'missing'),
        features: {
          economicCalendar: Boolean(tradingEconomicsConfigured),
        },
        lastChecked: tradingEconomicsConfigured ? now : null,
        error: null,
      },
      openbb: {
        configured: openbbConfigured,
        status: mapLegacyStatusToDisplay(openbbConfigured ? 'configured' : 'missing'),
        features: {
          quotes: Boolean(openbbConfigured),
          technicalAnalysis: Boolean(openbbConfigured),
        },
        lastChecked: openbbConfigured ? now : null,
        error: null,
      },
    },
    // Keep compatibility with existing trader-app consumers.
    features: status.features,
    dataProvider: status.dataProvider,
    capabilityMatrix: catalog.capabilityMatrix,
    diagnostics: catalog.diagnostics,
    loaded: catalog.symbols.map(symbol => ({
      symbol: symbol.symbol,
      provider: symbol.source,
      reason: 'symbol_discovered',
    })),
    failed: catalog.diagnostics.failedSymbols,
    skipped: catalog.diagnostics.unsupportedSymbols,
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
      dataProvider: status.dataProvider,
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
