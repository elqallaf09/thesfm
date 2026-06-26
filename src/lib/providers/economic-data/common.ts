import type {
  EconomicCycleIndicator,
  EconomicIndicatorChange,
  MacroIndicator,
  MacroIndicatorId,
} from './types';

export const ECONOMIC_INDICATOR_IDS: MacroIndicatorId[] = [
  'gdp',
  'pmi',
  'unemployment',
  'confidence',
  'retail',
  'industrial',
  'policyRate',
  'yieldCurve',
  'housing',
];

export const INDICATOR_LABELS: Record<MacroIndicatorId, string> = {
  gdp: 'GDP growth',
  pmi: 'PMI',
  unemployment: 'Unemployment',
  confidence: 'Consumer confidence',
  retail: 'Retail sales',
  industrial: 'Industrial production',
  policyRate: 'Interest rate',
  yieldCurve: 'Yield curve / bond yields',
  housing: 'Housing activity',
  inflation: 'Inflation / CPI',
};

export function cleanEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'your_key_here' || trimmed === 'demo') return null;
  return trimmed;
}

export function safeBaseUrl(value: string | undefined, fallback: string): string {
  const raw = cleanEnv(value) ?? fallback;
  try {
    const url = new URL(raw);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('Economic data provider base URL must use HTTPS in production.');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback.replace(/\/$/, '');
  }
}

export function getString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function getNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized || normalized === '.') continue;
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function stableId(parts: Array<string | number | null | undefined>): string {
  return parts
    .map(part => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(':')
    .replace(/[^a-z0-9:._-]+/g, '-')
    .slice(0, 180);
}

export function formatMacroValue(value: string | number, unit: string | null): string {
  if (typeof value === 'string') return value;
  const rounded = Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2);
  const compact = rounded.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  if (!unit) return compact;
  const normalizedUnit = unit.trim();
  if (!normalizedUnit || normalizedUnit === '%') return `${compact}%`;
  return `${compact} ${normalizedUnit}`;
}

function finiteMacroNumber(value: number | string | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIndicatorChange(indicator: MacroIndicator): EconomicIndicatorChange | null {
  const value = finiteMacroNumber(indicator.value);
  const previous = finiteMacroNumber(indicator.previous);
  const forecast = finiteMacroNumber(indicator.forecast);

  if (value === null) return null;

  if (previous !== null) {
    return {
      delta: value - previous,
      unit: indicator.unit,
      basis: 'previous',
      basisValue: formatMacroValue(previous, indicator.unit),
    };
  }

  if (forecast !== null) {
    return {
      delta: value - forecast,
      unit: indicator.unit,
      basis: 'forecast',
      basisValue: formatMacroValue(forecast, indicator.unit),
    };
  }

  return null;
}

export function toCycleIndicator(indicator: MacroIndicator): EconomicCycleIndicator {
  return {
    id: indicator.id,
    value: formatMacroValue(indicator.value, indicator.unit),
    change: toIndicatorChange(indicator),
    date: indicator.date,
    source: indicator.source,
    status: indicator.status,
  };
}

export function newestIsoDate(dates: Array<string | null | undefined>): string | null {
  const validDates = dates
    .map(value => (value ? new Date(value) : null))
    .filter((value): value is Date => value !== null && !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return validDates[0]?.toISOString() ?? null;
}

export function safeProviderLog(message: string, details: Record<string, unknown>) {
  console.warn(message, {
    ...details,
    hasTradingEconomicsKey: Boolean(cleanEnv(process.env.TRADING_ECONOMICS_API_KEY)),
    hasFredKey: Boolean(cleanEnv(process.env.FRED_API_KEY)),
  });
}
