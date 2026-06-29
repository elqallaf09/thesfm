import { cleanEnv } from '@/lib/market/providerConfig';
import {
  messageCodeForStatus,
  ProviderError,
  type ProviderApiResponse,
} from '../shared';
import { createFmpDividendCalendarProvider } from './fmp';
import { createFinnhubDividendCalendarProvider } from './finnhub';
import type { DividendCalendarEvent, DividendCalendarProviderName, DividendCalendarQuery } from './types';

const DIVIDEND_CALENDAR_TTL_MS = 30 * 60 * 1000;

type DividendCalendarProviderConfig =
  | { configured: true; provider: DividendCalendarProviderName; apiKey: string; missingEnvName: null }
  | { configured: false; provider: DividendCalendarProviderName | null; apiKey: ''; missingEnvName: string };

type CacheEntry = {
  data: DividendCalendarEvent[];
  updatedAt: string;
  expiresAt: number;
  provider: DividendCalendarProviderName;
};

type DividendCalendarDiagnostics = {
  provider: DividendCalendarProviderName | null;
  configured: boolean;
  finnhubConfigured: boolean;
  fmpConfigured: boolean;
  status: 'available' | 'not_configured' | 'success' | 'provider_error' | 'rate_limited';
  lastFetchStatus: string | null;
  lastFetchTime: string | null;
  lastSuccessfulUpdate: string | null;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ProviderApiResponse<DividendCalendarEvent[]>>>();
let diagnostics: DividendCalendarDiagnostics = {
  provider: null,
  configured: false,
  finnhubConfigured: false,
  fmpConfigured: false,
  status: 'not_configured',
  lastFetchStatus: null,
  lastFetchTime: null,
  lastSuccessfulUpdate: null,
};
let lastLoggedStatus = '';

export function getDividendCalendarProviderConfig(): DividendCalendarProviderConfig {
  const finnhubKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const fmpKey = cleanEnv(process.env.FMP_API_KEY);

  if (finnhubKey) {
    return { configured: true, provider: 'finnhub', apiKey: finnhubKey, missingEnvName: null };
  }
  if (fmpKey) {
    return { configured: true, provider: 'fmp', apiKey: fmpKey, missingEnvName: null };
  }
  return { configured: false, provider: null, apiKey: '', missingEnvName: 'FINNHUB_API_KEY or FMP_API_KEY' };
}

function cacheKey(provider: DividendCalendarProviderName, query: DividendCalendarQuery) {
  return [
    provider,
    query.from,
    query.to,
    (query.symbols ?? []).map(stock => stock.symbol.trim().toUpperCase()).sort().join(','),
  ].join('|');
}

function successResponse(
  provider: DividendCalendarProviderName,
  data: DividendCalendarEvent[],
  cached: boolean,
  stale = false,
  updatedAt = new Date().toISOString(),
): ProviderApiResponse<DividendCalendarEvent[]> {
  return {
    status: 'success',
    provider,
    data,
    cached,
    stale,
    lastSuccessfulUpdate: updatedAt,
    messageCode: data.length === 0 ? 'dividend_calendar_no_events' : null,
  };
}

function updateDiagnostics(partial: Partial<DividendCalendarDiagnostics>) {
  diagnostics = {
    ...diagnostics,
    ...partial,
  };
}

function logProviderStatus(config: DividendCalendarProviderConfig) {
  const status = {
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
  };
  const signature = JSON.stringify(status);
  if (signature === lastLoggedStatus) return;
  lastLoggedStatus = signature;
  console.info('[dividend-calendar] provider status', status);
}

export function getDividendCalendarProviderStatus() {
  const config = getDividendCalendarProviderConfig();
  updateDiagnostics({
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
    status: config.configured ? diagnostics.status === 'not_configured' ? 'available' : diagnostics.status : 'not_configured',
  });
  return {
    configured: config.configured,
    provider: config.provider,
    status: diagnostics.status,
    finnhubConfigured: diagnostics.finnhubConfigured,
    fmpConfigured: diagnostics.fmpConfigured,
    lastFetchStatus: diagnostics.lastFetchStatus,
    lastFetchTime: diagnostics.lastFetchTime,
    lastSuccessfulUpdate: diagnostics.lastSuccessfulUpdate,
  };
}

export async function getDividendCalendar(query: DividendCalendarQuery): Promise<ProviderApiResponse<DividendCalendarEvent[]>> {
  const config = getDividendCalendarProviderConfig();
  logProviderStatus(config);
  updateDiagnostics({
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
    status: config.configured ? 'available' : 'not_configured',
  });

  if (!config.configured) {
    return {
      status: 'not_configured',
      provider: config.provider,
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: 'provider_not_configured',
    };
  }

  const key = cacheKey(config.provider, query);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now && !query.force) {
    return successResponse(cached.provider, cached.data, true, false, cached.updatedAt);
  }

  const existing = inFlight.get(key);
  if (existing && !query.force) return existing;

  const request = (async () => {
    try {
      const provider = config.provider === 'finnhub'
        ? createFinnhubDividendCalendarProvider(config.apiKey)
        : createFmpDividendCalendarProvider(config.apiKey);
      const data = await provider.getEvents(query);
      const updatedAt = new Date().toISOString();
      updateDiagnostics({
        provider: config.provider,
        configured: true,
        status: 'success',
        lastFetchStatus: 'success',
        lastFetchTime: updatedAt,
        lastSuccessfulUpdate: updatedAt,
      });
      cache.set(key, {
        data,
        updatedAt,
        expiresAt: Date.now() + DIVIDEND_CALENDAR_TTL_MS,
        provider: config.provider,
      });
      return successResponse(config.provider, data, false, false, updatedAt);
    } catch (error) {
      const providerError = error instanceof ProviderError
        ? error
        : new ProviderError('provider_error', 'provider_temporarily_unavailable');
      const failedAt = new Date().toISOString();
      updateDiagnostics({
        provider: config.provider,
        configured: true,
        status: providerError.status === 'rate_limited' ? 'rate_limited' : 'provider_error',
        lastFetchStatus: providerError.status,
        lastFetchTime: failedAt,
      });

      console.warn('[dividend-calendar] provider failed', {
        provider: config.provider,
        status: providerError.status,
        providerStatus: providerError.providerStatus,
        providerMessage: providerError.providerMessage,
      });

      return {
        status: providerError.status,
        provider: config.provider,
        data: [],
        cached: false,
        stale: false,
        lastSuccessfulUpdate: null,
        messageCode: providerError.messageCode || messageCodeForStatus(providerError.status),
      } satisfies ProviderApiResponse<DividendCalendarEvent[]>;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
