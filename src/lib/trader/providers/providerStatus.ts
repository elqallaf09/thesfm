import { cleanEnv } from '@/lib/market/providerConfig';
import {
  addUtcDays,
  formatIsoDate,
  messageCodeForStatus,
  ProviderError,
  shortText,
  validIsoDate,
  type ProviderApiStatus,
} from '@/lib/providers/shared';
import {
  fetchFmpDividendsCalendar,
  fetchFmpEarningsCalendar,
  fetchFmpEconomicCalendar,
  fetchFmpIpoCalendar,
} from './fmp';
import {
  fetchFinnhubDividendsCalendar,
  fetchFinnhubEarningsCalendar,
  fetchFinnhubEconomicCalendar,
} from './finnhub';
import { fetchTradingEconomicsCalendar } from './tradingEconomics';
import type {
  TraderCalendarDataMap,
  TraderCalendarFeature,
  TraderCalendarProvider,
  TraderCalendarQuery,
  TraderCalendarRange,
  TraderFeatureStatus,
  TraderProviderFeature,
  TraderProviderName,
  TraderProviderResult,
  TraderProviderStatusResponse,
} from './types';
import { getFmpRuntimeStatus } from './fmpRuntime';

type AnyCalendarEvent = TraderCalendarDataMap[TraderCalendarFeature];

type CalendarCandidate = {
  provider: TraderCalendarProvider;
  apiKey: string;
  endpoint: string;
  fetchEvents: () => Promise<AnyCalendarEvent[]>;
};

type CacheEntry = {
  provider: TraderCalendarProvider;
  data: AnyCalendarEvent[];
  updatedAt: string;
  expiresAt: number;
};

const TTL_MS: Record<TraderCalendarFeature, number> = {
  earnings: 3 * 60 * 60 * 1000,
  dividends: 3 * 60 * 60 * 1000,
  ipos: 3 * 60 * 60 * 1000,
  economic: 60 * 60 * 1000,
};

const FEATURE_LABELS: Record<TraderCalendarFeature, string> = {
  earnings: 'earnings-calendar',
  dividends: 'dividends-calendar',
  ipos: 'ipos-calendar',
  economic: 'economic-calendar',
};

const PROVIDER_FEATURES: Record<TraderProviderName, TraderProviderFeature[]> = {
  fmp: ['prices', 'earnings', 'dividends', 'ipos', 'economic'],
  finnhub: ['earnings', 'dividends', 'economic', 'news'],
  tradingeconomics: ['economic'],
  yahoo: ['prices'],
  openbb: [], // OpenBB service removed
};

const CALENDAR_SUPPORTED_PROVIDERS: Record<TraderCalendarFeature, TraderCalendarProvider[]> = {
  earnings: ['fmp', 'finnhub'],
  dividends: ['fmp', 'finnhub'],
  ipos: ['fmp'],
  economic: ['tradingeconomics', 'fmp', 'finnhub'],
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<TraderProviderResult<AnyCalendarEvent>>>();
let featureState = createInitialFeatureState();

function createInitialFeatureState(): Record<TraderProviderFeature, TraderFeatureStatus> {
  return {
    earnings: baseFeatureStatus('earnings', ['fmp', 'finnhub']),
    dividends: baseFeatureStatus('dividends', ['fmp', 'finnhub']),
    ipos: baseFeatureStatus('ipos', ['fmp']),
    economic: baseFeatureStatus('economic', ['tradingeconomics', 'fmp', 'finnhub']),
    prices: {
      feature: 'prices',
      configured: true,
      provider: 'fmp',
      status: 'available',
      resultCount: null,
      lastUpdated: null,
      lastSuccessfulUpdate: null,
      failureReason: null,
      supportedProviders: ['fmp', 'yahoo', 'finnhub'],
      supportedFeatures: PROVIDER_FEATURES.fmp,
    },
    news: {
      feature: 'news',
      configured: false,
      provider: 'finnhub',
      status: 'not_configured',
      resultCount: null,
      lastUpdated: null,
      lastSuccessfulUpdate: null,
      failureReason: null,
      supportedProviders: ['finnhub'],
      supportedFeatures: PROVIDER_FEATURES.finnhub,
    },
  };
}

function baseFeatureStatus(feature: TraderCalendarFeature, providers: TraderCalendarProvider[]): TraderFeatureStatus {
  return {
    feature,
    configured: false,
    provider: null,
    status: 'not_configured',
    resultCount: null,
    lastUpdated: null,
    lastSuccessfulUpdate: null,
    failureReason: null,
    supportedProviders: providers,
    supportedFeatures: [feature],
  };
}

function configuredKeys() {
  return {
    fmp: cleanEnv(process.env.FMP_API_KEY),
    finnhub: cleanEnv(process.env.FINNHUB_API_KEY),
    tradingeconomics: cleanEnv(process.env.TRADING_ECONOMICS_API_KEY),
    openbb: '', // OpenBB service removed — always unconfigured
  };
}

function providerConfigured(provider: TraderCalendarProvider) {
  return Boolean(configuredKeys()[provider]);
}

function supportedFeaturesForProvider(provider: TraderCalendarProvider | null) {
  return provider ? PROVIDER_FEATURES[provider] : [];
}

function redactProviderMessage(value: unknown) {
  return shortText(value, 300)
    .replace(/([?&](apikey|token|c)=)[^&\s]+/gi, '$1[redacted]');
}

function errorFromUnknown(error: unknown) {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? redactProviderMessage(error.message || error.name) : 'provider_error';
  return new ProviderError('provider_error', 'provider_temporarily_unavailable', undefined, message);
}

function logProviderAttempt(args: {
  provider: TraderCalendarProvider | null;
  feature: TraderCalendarFeature;
  endpoint: string;
  configured: boolean;
  status: ProviderApiStatus | 'success' | 'not_configured';
  statusCode?: number | null;
  resultCount: number;
  errorMessage?: string | null;
}) {
  console.info('[trader-provider] request', {
    provider: args.provider,
    endpoint: args.endpoint,
    feature: args.feature,
    configured: args.configured,
    status: args.status,
    statusCode: args.statusCode ?? null,
    resultCount: args.resultCount,
    errorMessage: args.errorMessage ? redactProviderMessage(args.errorMessage) : null,
    entitlementOrPlanError: args.status === 'not_entitled' || args.status === 'forbidden' || args.status === 'unauthorized',
  });
}

function updateFeatureStatus(feature: TraderCalendarFeature, partial: Partial<TraderFeatureStatus>) {
  featureState = {
    ...featureState,
    [feature]: {
      ...featureState[feature],
      ...partial,
    },
  };
}

function cacheKey(feature: TraderCalendarFeature, provider: TraderCalendarProvider, query: TraderCalendarQuery) {
  return [
    feature,
    provider,
    query.range,
    query.from,
    query.to,
    query.country ?? '',
    query.currency ?? '',
    query.impact ?? '',
    (query.symbols ?? []).map(symbol => symbol.trim().toUpperCase()).sort().join(','),
  ].join('|').toUpperCase();
}

function requestKey(feature: TraderCalendarFeature, query: TraderCalendarQuery) {
  return [
    feature,
    query.range,
    query.from,
    query.to,
    query.country ?? '',
    query.currency ?? '',
    query.impact ?? '',
    (query.symbols ?? []).map(symbol => symbol.trim().toUpperCase()).sort().join(','),
  ].join('|').toUpperCase();
}

function toResult<T extends AnyCalendarEvent>(
  feature: TraderCalendarFeature,
  query: TraderCalendarQuery,
  provider: TraderCalendarProvider | null,
  status: ProviderApiStatus,
  data: T[],
  options: {
    cached?: boolean;
    stale?: boolean;
    updatedAt?: string | null;
    lastSuccessfulUpdate?: string | null;
    messageCode?: string | null;
    failureReason?: string | null;
    providerStatusCode?: number | null;
  } = {},
): TraderProviderResult<T> {
  return {
    status,
    provider,
    data,
    cached: options.cached ?? false,
    stale: options.stale ?? false,
    lastUpdated: options.updatedAt ?? null,
    lastSuccessfulUpdate: options.lastSuccessfulUpdate ?? options.updatedAt ?? null,
    resultCount: data.length,
    messageCode: options.messageCode ?? (data.length === 0 && status === 'success' ? `${feature}_calendar_no_events` : messageCodeForStatus(status)),
    failureReason: options.failureReason ?? null,
    providerStatusCode: options.providerStatusCode ?? null,
    supportedFeatures: supportedFeaturesForProvider(provider),
    range: {
      key: query.range,
      from: query.from,
      to: query.to,
    },
  };
}

function candidatesForFeature(feature: TraderCalendarFeature, query: TraderCalendarQuery): CalendarCandidate[] {
  const keys = configuredKeys();
  const candidates: CalendarCandidate[] = [];

  if (feature === 'earnings') {
    if (keys.fmp) {
      candidates.push({
        provider: 'fmp',
        apiKey: keys.fmp,
        endpoint: 'https://financialmodelingprep.com/stable/earnings-calendar',
        fetchEvents: () => fetchFmpEarningsCalendar(keys.fmp, query) as Promise<AnyCalendarEvent[]>,
      });
    }
    if (keys.finnhub) {
      candidates.push({
        provider: 'finnhub',
        apiKey: keys.finnhub,
        endpoint: 'https://finnhub.io/api/v1/calendar/earnings',
        fetchEvents: () => fetchFinnhubEarningsCalendar(keys.finnhub, query) as Promise<AnyCalendarEvent[]>,
      });
    }
  }

  if (feature === 'dividends') {
    if (keys.fmp) {
      candidates.push({
        provider: 'fmp',
        apiKey: keys.fmp,
        endpoint: 'https://financialmodelingprep.com/stable/dividends-calendar',
        fetchEvents: () => fetchFmpDividendsCalendar(keys.fmp, query) as Promise<AnyCalendarEvent[]>,
      });
    }
    if (keys.finnhub) {
      candidates.push({
        provider: 'finnhub',
        apiKey: keys.finnhub,
        endpoint: 'https://finnhub.io/api/v1/stock/dividend',
        fetchEvents: () => fetchFinnhubDividendsCalendar(keys.finnhub, query) as Promise<AnyCalendarEvent[]>,
      });
    }
  }

  if (feature === 'ipos' && keys.fmp) {
    candidates.push({
      provider: 'fmp',
      apiKey: keys.fmp,
      endpoint: 'https://financialmodelingprep.com/stable/ipos-calendar',
      fetchEvents: () => fetchFmpIpoCalendar(keys.fmp, query) as Promise<AnyCalendarEvent[]>,
    });
  }

  if (feature === 'economic') {
    if (keys.tradingeconomics) {
      candidates.push({
        provider: 'tradingeconomics',
        apiKey: keys.tradingeconomics,
        endpoint: 'https://api.tradingeconomics.com/calendar',
        fetchEvents: () => fetchTradingEconomicsCalendar(keys.tradingeconomics, query) as Promise<AnyCalendarEvent[]>,
      });
    }
    if (keys.fmp) {
      candidates.push({
        provider: 'fmp',
        apiKey: keys.fmp,
        endpoint: 'https://financialmodelingprep.com/stable/economic-calendar',
        fetchEvents: () => fetchFmpEconomicCalendar(keys.fmp, query) as Promise<AnyCalendarEvent[]>,
      });
    }
    if (keys.finnhub) {
      candidates.push({
        provider: 'finnhub',
        apiKey: keys.finnhub,
        endpoint: 'https://finnhub.io/api/v1/calendar/economic',
        fetchEvents: () => fetchFinnhubEconomicCalendar(keys.finnhub, query) as Promise<AnyCalendarEvent[]>,
      });
    }
  }

  return candidates;
}

function dedupeCalendarEvents<K extends TraderCalendarFeature>(
  feature: K,
  data: TraderCalendarDataMap[K][],
): TraderCalendarDataMap[K][] {
  if (feature !== 'earnings') return data;

  const seen = new Set<string>();
  return data.filter((event) => {
    const earningsEvent = event as TraderCalendarDataMap['earnings'];
    const key = [
      earningsEvent.symbol.trim().toUpperCase(),
      earningsEvent.reportDate ?? '',
      earningsEvent.fiscalDateEnding ?? '',
      (earningsEvent.source || earningsEvent.provider || '').trim().toLowerCase(),
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildTraderCalendarQuery(searchParams: URLSearchParams): TraderCalendarQuery {
  const requestedRange = searchParams.get('range');
  const range: TraderCalendarRange = requestedRange === 'today' || requestedRange === '7' || requestedRange === '30' || requestedRange === '90' || requestedRange === 'all'
    ? requestedRange
    : '30';
  const today = new Date();
  const todayIso = formatIsoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  let from = todayIso;
  let to = formatIsoDate(addUtcDays(new Date(`${todayIso}T00:00:00.000Z`), 30));

  if (range === 'today') to = todayIso;
  if (range === '7') to = formatIsoDate(addUtcDays(new Date(`${todayIso}T00:00:00.000Z`), 7));
  if (range === '90') to = formatIsoDate(addUtcDays(new Date(`${todayIso}T00:00:00.000Z`), 90));
  if (range === 'all') {
    from = formatIsoDate(addUtcDays(new Date(`${todayIso}T00:00:00.000Z`), -90));
    to = formatIsoDate(addUtcDays(new Date(`${todayIso}T00:00:00.000Z`), 365));
  }

  const explicitFrom = searchParams.get('from');
  const explicitTo = searchParams.get('to');
  if (explicitFrom && validIsoDate(explicitFrom)) from = explicitFrom;
  if (explicitTo && validIsoDate(explicitTo)) to = explicitTo;

  const symbols = (searchParams.get('symbols') ?? '')
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);
  const impact = searchParams.get('impact');

  return {
    range,
    from,
    to,
    force: searchParams.has('refresh') || searchParams.get('force') === '1',
    symbols,
    country: searchParams.get('country') || null,
    currency: searchParams.get('currency')?.toUpperCase() || null,
    impact: impact === 'high' || impact === 'medium' || impact === 'low' ? impact : null,
  };
}

export async function getTraderCalendar<K extends TraderCalendarFeature>(
  feature: K,
  query: TraderCalendarQuery,
): Promise<TraderProviderResult<TraderCalendarDataMap[K]>> {
  const candidates = candidatesForFeature(feature, query);
  const supportedProviders = CALENDAR_SUPPORTED_PROVIDERS[feature];
  const firstConfiguredProvider = candidates[0]?.provider ?? null;

  updateFeatureStatus(feature, {
    configured: candidates.length > 0,
    provider: firstConfiguredProvider,
    status: candidates.length > 0 ? 'available' : 'not_configured',
    supportedProviders,
    supportedFeatures: [feature],
    failureReason: candidates.length > 0 ? null : 'provider_not_configured',
  });

  if (candidates.length === 0) {
    logProviderAttempt({
      provider: null,
      feature,
      endpoint: FEATURE_LABELS[feature],
      configured: false,
      status: 'not_configured',
      resultCount: 0,
      errorMessage: 'provider_not_configured',
    });
    return toResult(feature, query, null, 'not_configured', [] as TraderCalendarDataMap[K][], {
      messageCode: 'provider_not_configured',
      failureReason: 'provider_not_configured',
    });
  }

  const request = requestKey(feature, query);
  const existing = inFlight.get(request);
  if (existing && !query.force) {
    return existing as Promise<TraderProviderResult<TraderCalendarDataMap[K]>>;
  }

  const run = (async () => {
    let firstError: { candidate: CalendarCandidate; error: ProviderError } | null = null;
    let staleFallback: { candidate: CalendarCandidate; error: ProviderError; cached: CacheEntry } | null = null;

    try {
      for (const candidate of candidates) {
        const key = cacheKey(feature, candidate.provider, query);
        const cached = cache.get(key);
        if (cached && cached.expiresAt > Date.now() && !query.force) {
          return toResult(feature, query, cached.provider, 'success', cached.data, {
            cached: true,
            updatedAt: cached.updatedAt,
            lastSuccessfulUpdate: cached.updatedAt,
          });
        }

        try {
          const data = dedupeCalendarEvents(feature, await candidate.fetchEvents() as TraderCalendarDataMap[K][]);
          const updatedAt = new Date().toISOString();
          cache.set(key, {
            provider: candidate.provider,
            data,
            updatedAt,
            expiresAt: Date.now() + TTL_MS[feature],
          });
          logProviderAttempt({
            provider: candidate.provider,
            feature,
            endpoint: candidate.endpoint,
            configured: true,
            status: 'success',
            resultCount: data.length,
          });
          updateFeatureStatus(feature, {
            configured: true,
            provider: candidate.provider,
            status: 'success',
            resultCount: data.length,
            lastUpdated: updatedAt,
            lastSuccessfulUpdate: updatedAt,
            failureReason: null,
            supportedFeatures: supportedFeaturesForProvider(candidate.provider),
          });
          return toResult(feature, query, candidate.provider, 'success', data, {
            updatedAt,
            lastSuccessfulUpdate: updatedAt,
          });
        } catch (error) {
          const providerError = errorFromUnknown(error);
          if (!firstError) firstError = { candidate, error: providerError };
          if (cached && !staleFallback) staleFallback = { candidate, error: providerError, cached };
          logProviderAttempt({
            provider: candidate.provider,
            feature,
            endpoint: candidate.endpoint,
            configured: true,
            status: providerError.status,
            statusCode: providerError.providerStatus ?? null,
            resultCount: 0,
            errorMessage: providerError.providerMessage ?? providerError.messageCode,
          });
        }
      }

      const failedAt = new Date().toISOString();
      const terminal = firstError ?? {
        candidate: candidates[0],
        error: new ProviderError('provider_error', 'provider_temporarily_unavailable'),
      };
      updateFeatureStatus(feature, {
        configured: true,
        provider: terminal.candidate.provider,
        status: terminal.error.status,
        resultCount: 0,
        lastUpdated: failedAt,
        failureReason: terminal.error.providerMessage ?? terminal.error.messageCode,
        supportedFeatures: supportedFeaturesForProvider(terminal.candidate.provider),
      });

      if (staleFallback) {
        return toResult(feature, query, staleFallback.cached.provider, staleFallback.error.status, staleFallback.cached.data, {
          cached: true,
          stale: true,
          updatedAt: failedAt,
          lastSuccessfulUpdate: staleFallback.cached.updatedAt,
          messageCode: staleFallback.error.messageCode,
          failureReason: staleFallback.error.providerMessage ?? staleFallback.error.messageCode,
          providerStatusCode: staleFallback.error.providerStatus ?? null,
        });
      }

      return toResult(feature, query, terminal.candidate.provider, terminal.error.status, [], {
        updatedAt: failedAt,
        lastSuccessfulUpdate: null,
        messageCode: terminal.error.messageCode,
        failureReason: terminal.error.providerMessage ?? terminal.error.messageCode,
        providerStatusCode: terminal.error.providerStatus ?? null,
      });
    } finally {
      inFlight.delete(request);
    }
  })();

  inFlight.set(request, run);
  return run as Promise<TraderProviderResult<TraderCalendarDataMap[K]>>;
}

function statusForCalendarFeature(feature: TraderCalendarFeature): TraderFeatureStatus {
  const supportedProviders = CALENDAR_SUPPORTED_PROVIDERS[feature];
  const configuredProviders = supportedProviders.filter(provider => providerConfigured(provider));
  const current = featureState[feature];
  return {
    ...current,
    configured: configuredProviders.length > 0,
    provider: current.provider ?? configuredProviders[0] ?? null,
    status: configuredProviders.length > 0
      ? current.status === 'not_configured' ? 'available' : current.status
      : 'not_configured',
    failureReason: configuredProviders.length > 0 ? current.failureReason : 'provider_not_configured',
    supportedProviders,
  };
}

export function getTraderProviderStatus(): TraderProviderStatusResponse {
  const keys = configuredKeys();
  const fmpRuntime = getFmpRuntimeStatus(Boolean(keys.fmp));
  const priceProvider: TraderProviderName = keys.fmp ? 'fmp' : 'yahoo';
  const features: Record<TraderProviderFeature, TraderFeatureStatus> = {
    earnings: statusForCalendarFeature('earnings'),
    dividends: statusForCalendarFeature('dividends'),
    ipos: statusForCalendarFeature('ipos'),
    economic: statusForCalendarFeature('economic'),
    prices: {
      ...featureState.prices,
      configured: true,
      provider: priceProvider,
      status: priceProvider === 'fmp' && fmpRuntime.rateLimited ? 'rate_limited' : 'available',
      failureReason: priceProvider === 'fmp' ? fmpRuntime.lastError : null,
      supportedProviders: ['fmp', 'yahoo', 'finnhub'],
      supportedFeatures: PROVIDER_FEATURES[priceProvider],
    },
    news: {
      ...featureState.news,
      configured: Boolean(keys.finnhub),
      provider: 'finnhub',
      status: keys.finnhub ? 'available' : 'not_configured',
      failureReason: keys.finnhub ? null : 'provider_not_configured',
    },
  };
  featureState = features;

  const activeFeature = (['earnings', 'dividends', 'ipos', 'economic', 'news', 'prices'] as TraderProviderFeature[])
    .map(feature => features[feature])
    .find(feature => feature.configured && feature.status !== 'not_configured') ?? features.prices;

  return {
    generatedAt: new Date().toISOString(),
    providers: {
      fmpConfigured: Boolean(keys.fmp),
      finnhubConfigured: Boolean(keys.finnhub),
      tradingEconomicsConfigured: Boolean(keys.tradingeconomics),
      openbbConfigured: false, // OpenBB service removed
    },
    features,
    dataProvider: {
      configured: activeFeature.configured,
      active: activeFeature.provider,
      provider: activeFeature.provider,
      status: activeFeature.status,
      supportedFeatures: activeFeature.supportedFeatures,
      lastUpdated: activeFeature.lastUpdated,
      resultCount: activeFeature.resultCount,
      failureReason: activeFeature.failureReason,
    },
  };
}

export function __resetTraderProviderStateForTests() {
  cache.clear();
  inFlight.clear();
  featureState = createInitialFeatureState();
}
