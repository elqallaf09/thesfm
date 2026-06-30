import { cleanEnv } from '@/lib/market/providerConfig';
import type { EconomicCalendarProviderName } from './types';

type CalendarProviderRequestStatus =
  | 'success'
  | 'empty_result'
  | 'http_error'
  | 'access_denied'
  | 'rate_limited'
  | 'network_error';

export function logEconomicCalendarProviderRequest(input: {
  provider: EconomicCalendarProviderName;
  requestStatus: CalendarProviderRequestStatus;
  responseStatusCode: number | null;
  providerErrorMessage?: string | null;
  eventsReturned: number;
}) {
  console.info('[economic-calendar] provider request', {
    'FINNHUB_API_KEY configured': Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    finnhubApiKeyConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    provider: input.provider,
    requestStatus: input.requestStatus,
    responseStatusCode: input.responseStatusCode,
    providerErrorMessage: input.providerErrorMessage || null,
    eventsReturned: input.eventsReturned,
  });
}
