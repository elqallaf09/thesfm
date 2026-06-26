import {
  cleanEnv,
  getNumber,
  getString,
  INDICATOR_LABELS,
  normalizeDate,
  safeBaseUrl,
  stableId,
} from './common';
import type {
  EconomicCalendarImpact,
  EconomicCalendarQuery,
  EconomicDataCalendarEvent,
  EconomicDataProvider,
  MacroIndicator,
  MacroIndicatorId,
  MacroIndicatorQuery,
} from './types';

const DEFAULT_BASE_URL = 'https://api.tradingeconomics.com';

const TE_INDICATORS: Record<MacroIndicatorId, string[]> = {
  gdp: ['GDP Growth Rate', 'GDP Annual Growth Rate', 'GDP'],
  pmi: ['Manufacturing PMI', 'Composite PMI', 'Services PMI'],
  unemployment: ['Unemployment Rate'],
  confidence: ['Consumer Confidence', 'Consumer Confidence Index'],
  retail: ['Retail Sales MoM', 'Retail Sales YoY', 'Retail Sales'],
  industrial: ['Industrial Production', 'Industrial Production YoY'],
  policyRate: ['Interest Rate'],
  yieldCurve: ['Government Bond 10Y', 'Government Bond 2Y'],
  housing: ['Housing Starts', 'Building Permits', 'Existing Home Sales'],
  inflation: ['Inflation Rate', 'Consumer Price Index CPI', 'Core Inflation Rate'],
};

function credentials() {
  return cleanEnv(process.env.TRADING_ECONOMICS_API_KEY);
}

function baseUrl() {
  return safeBaseUrl(process.env.TRADING_ECONOMICS_BASE_URL, DEFAULT_BASE_URL);
}

function buildUrl(path: string, params: Record<string, string | undefined> = {}) {
  const key = credentials();
  if (!key) throw new Error('TRADING_ECONOMICS_NOT_CONFIGURED');
  const url = new URL(`${baseUrl()}/${path.replace(/^\//, '')}`);
  url.searchParams.set('c', key);
  url.searchParams.set('format', 'json');
  Object.entries(params).forEach(([name, value]) => {
    if (value) url.searchParams.set(name, value);
  });
  return url;
}

async function fetchTradingEconomics<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`TRADING_ECONOMICS_HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeImpact(value: string | number | null): EconomicCalendarImpact {
  if (typeof value === 'number') {
    if (value >= 3) return 'high';
    if (value === 2) return 'medium';
    if (value === 1) return 'low';
    return 'unknown';
  }

  const normalized = value?.toLowerCase().trim();
  if (!normalized) return 'unknown';
  if (['3', 'high', 'important'].includes(normalized)) return 'high';
  if (['2', 'medium', 'moderate'].includes(normalized)) return 'medium';
  if (['1', 'low'].includes(normalized)) return 'low';
  return 'unknown';
}

export function normalizeTradingEconomicsCalendarEvent(record: Record<string, unknown>): EconomicDataCalendarEvent | null {
  const title = getString(record, ['Event', 'event', 'Title', 'title', 'Category', 'category']);
  const date = normalizeDate(getString(record, ['Date', 'date', 'DateTime', 'datetime', 'LatestValueDate']));
  if (!title || !date) return null;

  const country = getString(record, ['Country', 'country']);
  const category = getString(record, ['Category', 'category']);
  const currency = getString(record, ['Currency', 'currency', 'Ticker']);
  const importance = getString(record, ['Importance', 'importance']) ?? getNumber(record, ['Importance', 'importance']);

  return {
    id: stableId(['te', getString(record, ['CalendarId', 'calendarId', 'ID', 'id']), country, title, date]),
    title,
    country,
    currency,
    dateTimeUtc: date,
    impact: normalizeImpact(importance),
    actual: getString(record, ['Actual', 'actual']) ?? getNumber(record, ['Actual', 'actual']),
    forecast: getString(record, ['Forecast', 'forecast', 'TEForecast', 'teForecast']) ?? getNumber(record, ['Forecast', 'forecast', 'TEForecast', 'teForecast']),
    previous: getString(record, ['Previous', 'previous']) ?? getNumber(record, ['Previous', 'previous']),
    unit: getString(record, ['Unit', 'unit']),
    category,
    source: getString(record, ['Source', 'source']) ?? 'Trading Economics',
    provider: 'tradingeconomics',
  };
}

export function normalizeTradingEconomicsMacroRecord(
  record: Record<string, unknown>,
  id: MacroIndicatorId,
  country: string,
  indicator: string,
): MacroIndicator | null {
  const value = getNumber(record, ['Close', 'close', 'Value', 'value', 'LatestValue', 'latestValue', 'Actual', 'actual']);
  const date = normalizeDate(getString(record, ['DateTime', 'datetime', 'Date', 'date', 'LastUpdate', 'lastupdate', 'LatestValueDate']));
  if (value === null || !date) return null;

  return {
    id,
    country: getString(record, ['Country', 'country']) ?? country,
    indicator: getString(record, ['Category', 'category', 'Indicator', 'indicator']) ?? indicator,
    value,
    unit: getString(record, ['Unit', 'unit']),
    date,
    source: 'Trading Economics',
    provider: 'tradingeconomics',
    previous: getNumber(record, ['Previous', 'previous']),
    forecast: getNumber(record, ['Forecast', 'forecast']),
    status: 'actual',
  };
}

async function getHistoricalIndicator(country: string, id: MacroIndicatorId): Promise<MacroIndicator | null> {
  const candidates = TE_INDICATORS[id] ?? [INDICATOR_LABELS[id]];

  for (const indicator of candidates) {
    try {
      const records = await fetchTradingEconomics<unknown[]>(
        `historical/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}`,
      );
      const normalized = Array.isArray(records)
        ? records
            .map(record => normalizeTradingEconomicsMacroRecord(record as Record<string, unknown>, id, country, indicator))
            .filter((record): record is MacroIndicator => Boolean(record))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      if (normalized.length > 0) return normalized[0];
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[economic-data:tradingeconomics] indicator candidate failed', {
          country,
          indicator,
          code: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }

  return null;
}

export const tradingEconomicsProvider: EconomicDataProvider = {
  name: 'tradingeconomics',

  async getMacroIndicator(query: MacroIndicatorQuery) {
    const country = query.country?.trim() || 'United States';
    return getHistoricalIndicator(country, query.indicator);
  },

  async getEconomicCalendar(query: EconomicCalendarQuery) {
    const rows = await fetchTradingEconomics<unknown[]>('calendar', {
      d1: query.from,
      d2: query.to,
      country: query.country,
    });

    const seen = new Set<string>();
    return (Array.isArray(rows) ? rows : [])
      .map(record => normalizeTradingEconomicsCalendarEvent(record as Record<string, unknown>))
      .filter((event): event is EconomicDataCalendarEvent => Boolean(event))
      .filter(event => {
        if (query.currency && event.currency?.toUpperCase() !== query.currency.toUpperCase()) return false;
        if (query.impact && event.impact !== query.impact) return false;
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .sort((a, b) => new Date(a.dateTimeUtc).getTime() - new Date(b.dateTimeUtc).getTime());
  },
};
