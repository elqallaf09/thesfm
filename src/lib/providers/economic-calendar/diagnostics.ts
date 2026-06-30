import { cleanEnv } from '@/lib/market/providerConfig';
import type { EconomicCalendarProviderName } from './types';

type CalendarProviderRequestStatus =
  | 'success'
  | 'empty_result'
  | 'http_error'
  | 'access_denied'
  | 'rate_limited'
  | 'network_error';

type CalendarProviderEntitlementStatus =
  | 'available'
  | 'not_entitled'
  | 'blocked'
  | 'rate_limited'
  | 'unknown';

function configuredForProvider(provider: EconomicCalendarProviderName) {
  if (provider === 'finnhub') return Boolean(cleanEnv(process.env.FINNHUB_API_KEY));
  if (provider === 'tradingeconomics') return Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY));
  return Boolean(cleanEnv(process.env.FMP_API_KEY));
}

function entitlementStatusForRequest(requestStatus: CalendarProviderRequestStatus): CalendarProviderEntitlementStatus {
  if (requestStatus === 'success' || requestStatus === 'empty_result') return 'available';
  if (requestStatus === 'access_denied') return 'not_entitled';
  if (requestStatus === 'rate_limited') return 'rate_limited';
  if (requestStatus === 'http_error') return 'blocked';
  return 'unknown';
}

export function logEconomicCalendarProviderRequest(input: {
  provider: EconomicCalendarProviderName;
  requestStatus: CalendarProviderRequestStatus;
  responseStatusCode: number | null;
  providerErrorMessage?: string | null;
  eventsReturned: number;
  entitlementStatus?: CalendarProviderEntitlementStatus;
}) {
  const lastFetchTime = new Date().toISOString();
  const entitlementStatus = input.entitlementStatus ?? entitlementStatusForRequest(input.requestStatus);
  console.info('[economic-calendar] provider request', {
    'FINNHUB_API_KEY configured': Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    finnhubApiKeyConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    configured: configuredForProvider(input.provider),
    provider: input.provider,
    entitlementStatus,
    requestStatus: input.requestStatus,
    responseStatusCode: input.responseStatusCode,
    responseStatus: input.responseStatusCode,
    providerErrorMessage: input.providerErrorMessage || null,
    eventsReturned: input.eventsReturned,
    numberOfEventsReturned: input.eventsReturned,
    lastFetchTime,
  });
}
