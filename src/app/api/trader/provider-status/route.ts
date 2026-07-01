import { NextResponse } from 'next/server';
import { getTraderProviderStatus } from '@/lib/trader/providers/providerStatus';

export const dynamic = 'force-dynamic';

function normalizeEnvValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

function mapLegacyStatusToDisplay(status: string): 'configured' | 'missing' | 'error' {
  return status === 'configured' ? status : status === 'error' ? 'error' : 'missing';
}

export async function GET() {
  const status = getTraderProviderStatus();
  const fmpConfigured = normalizeEnvValue(process.env.FMP_API_KEY);
  const finnhubConfigured = normalizeEnvValue(process.env.FINNHUB_API_KEY);
  const tradingEconomicsConfigured = normalizeEnvValue(process.env.TRADING_ECONOMICS_API_KEY);
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
    },
    // Keep compatibility with existing trader-app consumers.
    legacy: {
      providers: {
        fmpConfigured,
        finnhubConfigured,
        tradingEconomicsConfigured,
      },
      features: status.features,
      dataProvider: status.dataProvider,
    },
    generatedAt: now,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
