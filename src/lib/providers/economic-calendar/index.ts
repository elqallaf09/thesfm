import { cleanEnv } from '@/lib/market/providerConfig';
import {
  messageCodeForStatus,
  ProviderError,
  type ProviderApiResponse,
} from '../shared';
import { createFmpCalendarProvider } from './fmp';
import { createFinnhubCalendarProvider } from './finnhub';
import type { EconomicCalendarEvent, EconomicCalendarProviderName, EconomicCalendarQuery } from './types';

const CALENDAR_TTL_MS = 7 * 60 * 1000;

type CalendarProviderConfig =
  | { configured: true; provider: EconomicCalendarProviderName; apiKey: string; missingEnvName: null }
  | { configured: false; provider: EconomicCalendarProviderName | null; apiKey: ''; missingEnvName: string };

type CacheEntry = {
  data: EconomicCalendarEvent[];
  updatedAt: string;
  expiresAt: number;
  provider: EconomicCalendarProviderName;
};

type CalendarProviderDiagnostics = {
  provider: EconomicCalendarProviderName | null;
  configured: boolean;
  finnhubConfigured: boolean;
  status: 'available' | 'not_configured' | 'success' | 'provider_error' | 'rate_limited';
  lastFetchStatus: string | null;
  lastFetchTime: string | null;
  lastSuccessfulUpdate: string | null;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ProviderApiResponse<EconomicCalendarEvent[]>>>();
let diagnostics: CalendarProviderDiagnostics = {
  provider: null,
  configured: false,
  finnhubConfigured: false,
  status: 'not_configured',
  lastFetchStatus: null,
  lastFetchTime: null,
  lastSuccessfulUpdate: null,
};
let lastLoggedStatus = '';

function normalizeCalendarProvider(value: string): EconomicCalendarProviderName | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (!normalized) return null;
  if (normalized === 'fmp' || normalized === 'financialmodelingprep') return 'fmp';
  if (normalized === 'finnhub') return 'finnhub';
  return null;
}

export function getEconomicCalendarProviderConfig(): CalendarProviderConfig {
  const explicit = normalizeCalendarProvider(cleanEnv(process.env.ECONOMIC_CALENDAR_PROVIDER));
  const fmpKey = cleanEnv(process.env.FMP_API_KEY);
  const legacyKey = cleanEnv(process.env.ECONOMIC_CALENDAR_API_KEY);
  const finnhubKey = cleanEnv(process.env.FINNHUB_API_KEY);

  if (finnhubKey || explicit === 'finnhub') {
    const apiKey = finnhubKey || legacyKey;
    return apiKey
      ? { configured: true, provider: 'finnhub', apiKey, missingEnvName: null }
      : { configured: false, provider: 'finnhub', apiKey: '', missingEnvName: 'FINNHUB_API_KEY' };
  }

  const provider = explicit ?? (fmpKey || legacyKey ? 'fmp' : 'finnhub');
  if (provider === 'fmp') {
    const apiKey = fmpKey || legacyKey;
    return apiKey
      ? { configured: true, provider: 'fmp', apiKey, missingEnvName: null }
      : { configured: false, provider: 'fmp', apiKey: '', missingEnvName: 'FMP_API_KEY or ECONOMIC_CALENDAR_API_KEY' };
  }

  return { configured: false, provider: 'finnhub', apiKey: '', missingEnvName: 'FINNHUB_API_KEY' };
}

function cacheKey(provider: EconomicCalendarProviderName, query: EconomicCalendarQuery) {
  return [
    provider,
    query.from,
    query.to,
    query.country ?? '',
    query.currency ?? '',
    query.impact ?? '',
  ].join('|').toUpperCase();
}

function successResponse(
  provider: EconomicCalendarProviderName,
  data: EconomicCalendarEvent[],
  cached: boolean,
  stale = false,
  updatedAt = new Date().toISOString(),
): ProviderApiResponse<EconomicCalendarEvent[]> {
  return {
    status: 'success',
    provider,
    data,
    cached,
    stale,
    lastSuccessfulUpdate: updatedAt,
    messageCode: data.length === 0 ? 'calendar_no_events' : null,
  };
}

function updateDiagnostics(partial: Partial<CalendarProviderDiagnostics>) {
  diagnostics = {
    ...diagnostics,
    ...partial,
  };
}

function logProviderStatus(config: CalendarProviderConfig) {
  const status = {
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
  };
  const signature = JSON.stringify(status);
  if (signature === lastLoggedStatus) return;
  lastLoggedStatus = signature;
  console.info('[economic-calendar] provider status', status);
}

export function getEconomicCalendarProviderStatus() {
  const config = getEconomicCalendarProviderConfig();
  updateDiagnostics({
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    status: config.configured ? diagnostics.status === 'not_configured' ? 'available' : diagnostics.status : 'not_configured',
  });
  return {
    configured: config.configured,
    provider: config.provider,
    status: diagnostics.status,
    finnhubConfigured: diagnostics.finnhubConfigured,
    lastFetchStatus: diagnostics.lastFetchStatus,
    lastFetchTime: diagnostics.lastFetchTime,
    lastSuccessfulUpdate: diagnostics.lastSuccessfulUpdate,
  };
}

export async function getEconomicCalendar(query: EconomicCalendarQuery): Promise<ProviderApiResponse<EconomicCalendarEvent[]>> {
  const config = getEconomicCalendarProviderConfig();
  logProviderStatus(config);
  updateDiagnostics({
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
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
        ? createFinnhubCalendarProvider(config.apiKey)
        : createFmpCalendarProvider(config.apiKey);
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
        expiresAt: Date.now() + CALENDAR_TTL_MS,
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
      if (cached) {
        return {
          status: providerError.status,
          provider: cached.provider,
          data: cached.data,
          cached: true,
          stale: true,
          lastSuccessfulUpdate: cached.updatedAt,
          messageCode: providerError.messageCode,
        } satisfies ProviderApiResponse<EconomicCalendarEvent[]>;
      }
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
        console.warn('[economic-calendar] provider failed', {
          provider: config.provider,
          status: providerError.status,
          providerStatus: providerError.providerStatus,
          providerMessage: providerError.providerMessage,
        });
      }
      return {
        status: providerError.status,
        provider: config.provider,
        data: [],
        cached: false,
        stale: false,
        lastSuccessfulUpdate: null,
        messageCode: providerError.messageCode || messageCodeForStatus(providerError.status),
      } satisfies ProviderApiResponse<EconomicCalendarEvent[]>;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
