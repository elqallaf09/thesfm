import { cleanEnv } from '@/lib/market/providerConfig';
import {
  messageCodeForStatus,
  ProviderError,
  type ProviderApiResponse,
} from '../shared';
import { createFmpCalendarProvider } from './fmp';
import { createFinnhubCalendarProvider } from './finnhub';
import { createTradingEconomicsCalendarProvider } from './tradingEconomics';
import type { EconomicCalendarEvent, EconomicCalendarProviderName, EconomicCalendarQuery } from './types';

const CALENDAR_TTL_MS = 7 * 60 * 1000;

type CalendarProviderConfig =
  | {
      configured: true;
      provider: EconomicCalendarProviderName;
      providers: CalendarProviderCandidate[];
      apiKey: string;
      missingEnvName: null;
    }
  | {
      configured: false;
      provider: null;
      providers: [];
      apiKey: '';
      missingEnvName: string;
    };

type CalendarProviderCandidate = {
  provider: EconomicCalendarProviderName;
  apiKey: string;
};

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
  tradingEconomicsConfigured: boolean;
  fmpConfigured: boolean;
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
  tradingEconomicsConfigured: false,
  fmpConfigured: false,
  status: 'not_configured',
  lastFetchStatus: null,
  lastFetchTime: null,
  lastSuccessfulUpdate: null,
};
let lastLoggedStatus = '';

export function getEconomicCalendarProviderConfig(): CalendarProviderConfig {
  const finnhubKey = cleanEnv(process.env.FINNHUB_API_KEY);
  const tradingEconomicsKey = cleanEnv(process.env.TRADING_ECONOMICS_API_KEY);
  const fmpKey = cleanEnv(process.env.FMP_API_KEY);
  const providers: CalendarProviderCandidate[] = [];

  if (finnhubKey) providers.push({ provider: 'finnhub', apiKey: finnhubKey });
  if (tradingEconomicsKey) providers.push({ provider: 'tradingeconomics', apiKey: tradingEconomicsKey });
  if (fmpKey) providers.push({ provider: 'fmp', apiKey: fmpKey });

  const [primary] = providers;
  if (primary) {
    return {
      configured: true,
      provider: primary.provider,
      providers,
      apiKey: primary.apiKey,
      missingEnvName: null,
    };
  }

  return {
    configured: false,
    provider: null,
    providers: [],
    apiKey: '',
    missingEnvName: 'FINNHUB_API_KEY or TRADING_ECONOMICS_API_KEY or FMP_API_KEY',
  };
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

function requestKey(providers: CalendarProviderCandidate[], query: EconomicCalendarQuery) {
  return [
    providers.map(candidate => candidate.provider).join('>'),
    query.from,
    query.to,
    query.country ?? '',
    query.currency ?? '',
    query.impact ?? '',
  ].join('|').toUpperCase();
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
    providers: config.providers.map(candidate => candidate.provider),
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    tradingEconomicsConfigured: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
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
    tradingEconomicsConfigured: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)),
    fmpConfigured: Boolean(cleanEnv(process.env.FMP_API_KEY)),
    status: config.configured ? diagnostics.status === 'not_configured' ? 'available' : diagnostics.status : 'not_configured',
  });
  return {
    configured: config.configured,
    provider: config.provider,
    providers: config.providers.map(candidate => candidate.provider),
    status: diagnostics.status,
    finnhubConfigured: diagnostics.finnhubConfigured,
    tradingEconomicsConfigured: diagnostics.tradingEconomicsConfigured,
    fmpConfigured: diagnostics.fmpConfigured,
    lastFetchStatus: diagnostics.lastFetchStatus,
    lastFetchTime: diagnostics.lastFetchTime,
    lastSuccessfulUpdate: diagnostics.lastSuccessfulUpdate,
  };
}

function providerForCandidate(candidate: CalendarProviderCandidate) {
  if (candidate.provider === 'finnhub') return createFinnhubCalendarProvider(candidate.apiKey);
  if (candidate.provider === 'tradingeconomics') return createTradingEconomicsCalendarProvider(candidate.apiKey);
  return createFmpCalendarProvider(candidate.apiKey);
}

function logProviderFailure(candidate: CalendarProviderCandidate, providerError: ProviderError) {
  console.warn('[economic-calendar] provider failed', {
    provider: candidate.provider,
    status: providerError.status,
    providerStatus: providerError.providerStatus,
    providerMessage: providerError.providerMessage,
  });
}

function errorResponse(
  providerError: ProviderError,
  provider: EconomicCalendarProviderName | null,
): ProviderApiResponse<EconomicCalendarEvent[]> {
  return {
    status: providerError.status,
    provider,
    data: [],
    cached: false,
    stale: false,
    lastSuccessfulUpdate: null,
    messageCode: providerError.messageCode || messageCodeForStatus(providerError.status),
  };
}

export async function getEconomicCalendar(query: EconomicCalendarQuery): Promise<ProviderApiResponse<EconomicCalendarEvent[]>> {
  const config = getEconomicCalendarProviderConfig();
  logProviderStatus(config);
  updateDiagnostics({
    provider: config.provider,
    configured: config.configured,
    finnhubConfigured: Boolean(cleanEnv(process.env.FINNHUB_API_KEY)),
    tradingEconomicsConfigured: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)),
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

  const key = requestKey(config.providers, query);
  const now = Date.now();
  const primaryCached = cache.get(cacheKey(config.provider, query));
  if (primaryCached && primaryCached.expiresAt > now && !query.force) {
    return successResponse(primaryCached.provider, primaryCached.data, true, false, primaryCached.updatedAt);
  }

  const existing = inFlight.get(key);
  if (existing && !query.force) return existing;

  const request = (async () => {
    let firstError: { candidate: CalendarProviderCandidate; error: ProviderError } | null = null;
    let staleFallback: {
      candidate: CalendarProviderCandidate;
      error: ProviderError;
      cached: CacheEntry;
    } | null = null;

    try {
      for (const candidate of config.providers) {
        const candidateCacheKey = cacheKey(candidate.provider, query);
        const cached = cache.get(candidateCacheKey);

        if (cached && cached.expiresAt > Date.now() && !query.force) {
          return successResponse(cached.provider, cached.data, true, false, cached.updatedAt);
        }

        try {
          const provider = providerForCandidate(candidate);
          const data = await provider.getEvents(query);
          const updatedAt = new Date().toISOString();
          updateDiagnostics({
            provider: candidate.provider,
            configured: true,
            status: 'success',
            lastFetchStatus: 'success',
            lastFetchTime: updatedAt,
            lastSuccessfulUpdate: updatedAt,
          });
          cache.set(candidateCacheKey, {
            data,
            updatedAt,
            expiresAt: Date.now() + CALENDAR_TTL_MS,
            provider: candidate.provider,
          });
          return successResponse(candidate.provider, data, false, false, updatedAt);
        } catch (error) {
          const providerError = error instanceof ProviderError
            ? error
            : new ProviderError('provider_error', 'provider_temporarily_unavailable');
          if (!firstError) firstError = { candidate, error: providerError };
          if (cached && !staleFallback) staleFallback = { candidate, error: providerError, cached };
          logProviderFailure(candidate, providerError);
        }
      }

      const failedAt = new Date().toISOString();
      const terminalError = firstError?.error ?? new ProviderError('provider_error', 'provider_temporarily_unavailable');
      const terminalProvider = firstError?.candidate.provider ?? config.provider;
      updateDiagnostics({
        provider: terminalProvider,
        configured: true,
        status: terminalError.status === 'rate_limited' ? 'rate_limited' : 'provider_error',
        lastFetchStatus: terminalError.status,
        lastFetchTime: failedAt,
      });

      if (staleFallback) {
        return {
          status: staleFallback.error.status,
          provider: staleFallback.cached.provider,
          data: staleFallback.cached.data,
          cached: true,
          stale: true,
          lastSuccessfulUpdate: staleFallback.cached.updatedAt,
          messageCode: staleFallback.error.messageCode,
        } satisfies ProviderApiResponse<EconomicCalendarEvent[]>;
      }

      return errorResponse(terminalError, terminalProvider);
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
