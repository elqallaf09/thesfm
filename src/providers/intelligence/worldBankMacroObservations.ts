import { currentMacroObservation, type MacroObservation, type MacroSeries } from '@/domain/intelligence/macroObservations';
import { cachedMacroObservations, macroSourceText } from './macroObservationCache';

const INDICATORS = {
  'NY.GDP.MKTP.KD.ZG': 'GDP_ANNUAL',
  'FP.CPI.TOTL.ZG': 'CPI_ANNUAL',
  'SL.UEM.TOTL.ZS': 'UNEMPLOYMENT_ANNUAL',
} as const satisfies Record<string, MacroSeries>;

export function parseWorldBankObservations(payload: unknown, country: string, currency: string, now = Date.now()): MacroObservation[] {
  if (!/^[A-Z]{2}$/.test(country) || !Array.isArray(payload) || !Array.isArray(payload[1])) return [];
  const observations: MacroObservation[] = [];
  for (const [indicator, series] of Object.entries(INDICATORS)) {
    const rows = new Map<string, number>();
    let conflict = false;
    for (const raw of payload[1]) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as { indicator?: { id?: unknown }; country?: { id?: unknown }; date?: unknown; value?: unknown };
      if (row.indicator?.id !== indicator || row.country?.id !== country || typeof row.date !== 'string' || !/^\d{4}$/.test(row.date)
        || typeof row.value !== 'number' || !Number.isFinite(row.value) || Date.parse(`${row.date}-12-31`) >= now
        || (series === 'UNEMPLOYMENT_ANNUAL' && (row.value < 0 || row.value > 100))) continue;
      if (rows.has(row.date) && rows.get(row.date) !== row.value) { conflict = true; break; }
      rows.set(row.date, row.value);
    }
    const year = [...rows.keys()].sort().at(-1);
    if (!year || conflict) continue;
    const previous = rows.get(String(Number(year) - 1)) ?? null;
    const sample: MacroObservation = { series, country, currency, value: rows.get(year)!, previous,
      previousPeriod: previous === null ? null : `${Number(year) - 1}-12-31`, unit: '%', period: `${year}-12-31`,
      retrievedAt: new Date(now).toISOString(), provider: series === 'UNEMPLOYMENT_ANNUAL' ? 'World Bank / ILO modelled estimate' : 'World Bank',
      sourceUrl: `https://data.worldbank.org/indicator/${indicator}?locations=${country}` };
    if (currentMacroObservation(sample, now)) observations.push(sample);
  }
  return observations;
}

/** Annual country context is explicitly distinct from monthly releases and forecasts. */
export async function loadWorldBankMacroObservations(country: string, currency: string) {
  if (!/^[A-Z]{2}$/.test(country)) return [];
  return cachedMacroObservations(`worldbank:${country}:${currency}`, 86_400, async () => {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${Object.keys(INDICATORS).join(';')}?source=2&format=json&per_page=12&mrnev=2`;
    return parseWorldBankObservations(JSON.parse(await macroSourceText(url, 86_400)), country, currency);
  });
}
