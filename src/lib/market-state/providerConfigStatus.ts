import { cleanEnv } from '@/lib/market/providerConfig';
import type { MarketProviderId, ProviderConfigEntry } from './types';

/**
 * Safe configuration overview — env var NAME and whether it's set, never the credential value.
 * Admin-mode only; the API route strips this entirely from the public payload.
 */
const CONFIG_ENV_VARS: Array<{ envVar: string; provider: MarketProviderId }> = [
  { envVar: 'FMP_API_KEY', provider: 'fmp' },
  { envVar: 'FINNHUB_API_KEY', provider: 'finnhub' },
  { envVar: 'TWELVE_DATA_API_KEY', provider: 'twelvedata' },
  { envVar: 'EODHD_API_KEY', provider: 'eodhd' },
  { envVar: 'MARKETSTACK_API_KEY', provider: 'marketstack' },
  { envVar: 'TRADING_ECONOMICS_API_KEY', provider: 'tradingeconomics' },
  { envVar: 'NEWS_API_KEY', provider: 'newsapi' },
];

export function getProviderConfigurationStatus(): ProviderConfigEntry[] {
  return CONFIG_ENV_VARS.map(({ envVar, provider }) => ({
    envVar,
    provider,
    configured: Boolean(cleanEnv(process.env[envVar])),
  }));
}
