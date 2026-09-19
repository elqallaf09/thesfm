import type { IntelligenceContextMacroObservation } from './contextEvidence';

const DAY = 86_400_000;
const MAX_AGE = 7 * DAY; // Daily rates remain useful over weekends and bank holidays.
const SOURCES = [
  { series: 'SOFR', url: 'https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json', sourceUrl: 'https://www.newyorkfed.org/markets/reference-rates/sofr' },
  { series: 'EFFR', url: 'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/5.json', sourceUrl: 'https://www.newyorkfed.org/markets/reference-rates/effr' },
] as const;
type Source = typeof SOURCES[number];

/** Effective dates are observation periods, never release times or forecasts. */
export function parseOfficialRates(payload: unknown, source: Source, now = Date.now()): IntelligenceContextMacroObservation | null {
  if (!payload || typeof payload !== 'object' || !('refRates' in payload) || !Array.isArray(payload.refRates)) return null;
  const seen = new Set<string>();
  const rates = payload.refRates.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    if (row.type !== source.series || typeof row.effectiveDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.effectiveDate)) return [];
    const stamp = Date.parse(`${row.effectiveDate}T00:00:00Z`);
    const value = row.percentRate;
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== row.effectiveDate || stamp > now || now - stamp > MAX_AGE || typeof value !== 'number' || !Number.isFinite(value) || value < -5 || value > 100 || seen.has(row.effectiveDate)) return [];
    seen.add(row.effectiveDate);
    return [{ period: row.effectiveDate, value }];
  }).sort((a, b) => b.period.localeCompare(a.period));
  if (!rates.length) return null;
  return { series: source.series, country: 'US', currency: 'USD', value: rates[0].value, previous: rates[1]?.value ?? null, previousPeriod: rates[1]?.period ?? null, unit: '%', period: rates[0].period, retrievedAt: new Date(now).toISOString(), provider: 'New York Fed', sourceUrl: source.sourceUrl };
}

let cached: { expires: number; observations: IntelligenceContextMacroObservation[] } | null = null;
let pending: Promise<IntelligenceContextMacroObservation[]> | null = null;

/** Public official data: no provider key, subscription or browser-side credentials. */
export async function loadOfficialMacroObservations(): Promise<IntelligenceContextMacroObservation[]> {
  if (cached && cached.expires > Date.now()) return cached.observations;
  if (pending) return pending;
  pending = (async () => {
    const results = await Promise.all(SOURCES.map(async source => {
      try {
        const response = await fetch(source.url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5500), headers: { accept: 'application/json' } });
        if (!response.ok) return null;
        return parseOfficialRates(await response.json(), source);
      } catch { return null; }
    }));
    const observations = results.flatMap((value, index) => {
      if (value) return [value];
      // Retain the last verified sample through a transient outage without renewing its date.
      const previous = cached?.observations.find(item => item.series === SOURCES[index].series);
      return previous && Date.now() - Date.parse(previous.period) <= MAX_AGE ? [previous] : [];
    });
    cached = { expires: Date.now() + (results.some(Boolean) ? 15 * 60_000 : 60_000), observations };
    return observations;
  })().finally(() => { pending = null; });
  return pending;
}
