import {
  cleanEnv,
  getNumber,
  normalizeDate,
  safeBaseUrl,
} from './common';
import type {
  EconomicCalendarQuery,
  EconomicDataCalendarEvent,
  EconomicDataProvider,
  MacroIndicator,
  MacroIndicatorId,
  MacroIndicatorQuery,
} from './types';

const DEFAULT_BASE_URL = 'https://api.stlouisfed.org/fred';

const FRED_SERIES: Record<MacroIndicatorId, { seriesId: string; label: string; unit: string | null }> = {
  gdp: { seriesId: 'A191RL1Q225SBEA', label: 'Real GDP growth', unit: '%' },
  pmi: { seriesId: 'NAPM', label: 'ISM manufacturing PMI', unit: null },
  unemployment: { seriesId: 'UNRATE', label: 'Unemployment rate', unit: '%' },
  confidence: { seriesId: 'UMCSENT', label: 'Consumer sentiment', unit: null },
  retail: { seriesId: 'RSAFS', label: 'Retail and food services sales', unit: 'USD millions' },
  industrial: { seriesId: 'INDPRO', label: 'Industrial production index', unit: 'index' },
  policyRate: { seriesId: 'FEDFUNDS', label: 'Federal funds rate', unit: '%' },
  yieldCurve: { seriesId: 'T10Y2Y', label: '10Y-2Y Treasury spread', unit: '%' },
  housing: { seriesId: 'HOUST', label: 'Housing starts', unit: 'thousands' },
  inflation: { seriesId: 'CPIAUCSL', label: 'Consumer Price Index', unit: 'index' },
};

type FredObservation = {
  realtime_start?: string;
  realtime_end?: string;
  date?: string;
  value?: string;
};

type FredObservationResponse = {
  observations?: FredObservation[];
};

function apiKey() {
  return cleanEnv(process.env.FRED_API_KEY);
}

function baseUrl() {
  return safeBaseUrl(process.env.FRED_BASE_URL, DEFAULT_BASE_URL);
}

function buildUrl(path: string, params: Record<string, string>) {
  const key = apiKey();
  if (!key) throw new Error('FRED_NOT_CONFIGURED');
  const url = new URL(`${baseUrl()}/${path.replace(/^\//, '')}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('file_type', 'json');
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  return url;
}

async function fetchFred<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`FRED_HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeObservation(
  observation: FredObservation,
  id: MacroIndicatorId,
  previous: number | null,
): MacroIndicator | null {
  const value = getNumber({ value: observation.value }, ['value']);
  const date = normalizeDate(observation.date ?? null);
  if (value === null || !date) return null;

  const series = FRED_SERIES[id];
  return {
    id,
    country: 'United States',
    indicator: series.label,
    value,
    unit: series.unit,
    date,
    source: `FRED (${series.seriesId})`,
    provider: 'fred',
    previous,
    forecast: null,
    status: 'actual',
  };
}

async function getSeriesIndicator(id: MacroIndicatorId): Promise<MacroIndicator | null> {
  const series = FRED_SERIES[id];
  const data = await fetchFred<FredObservationResponse>('series/observations', {
    series_id: series.seriesId,
    sort_order: 'desc',
    limit: '8',
  });

  const usable = (data.observations ?? [])
    .map(observation => ({
      observation,
      value: getNumber({ value: observation.value }, ['value']),
    }))
    .filter((entry): entry is { observation: FredObservation; value: number } => entry.value !== null);

  if (usable.length === 0) return null;
  const [latest, previous] = usable;
  return normalizeObservation(latest.observation, id, previous?.value ?? null);
}

export const fredProvider: EconomicDataProvider = {
  name: 'fred',

  async getMacroIndicator(query: MacroIndicatorQuery) {
    const country = query.country?.trim().toLowerCase() || 'united states';
    if (!['united states', 'us', 'usa', 'united states of america'].includes(country)) return null;
    return getSeriesIndicator(query.indicator);
  },

  async getEconomicCalendar(_query: EconomicCalendarQuery): Promise<EconomicDataCalendarEvent[]> {
    return [];
  },
};
