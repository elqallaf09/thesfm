import { currentMacroObservation, macroNumber, periodEnd, type MacroObservation } from '@/domain/intelligence/macroObservations';
import { cachedMacroObservations, macroSourceText } from './macroObservationCache';

export const BLS_SERIES = { CPI_YOY: 'CUUR0000SA0', UNEMPLOYMENT: 'LNS14000000' } as const;
type BlsSeries = keyof typeof BLS_SERIES;
const GDP_SERIES = 'A191RL1Q225SBEA';
const CACHE_SECONDS = 6 * 3600;

export function parseBlsObservations(payload: unknown, series: BlsSeries, now = Date.now()): MacroObservation[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { status?: unknown; Results?: { series?: { seriesID?: unknown; data?: unknown }[] } };
  if (root.status !== 'REQUEST_SUCCEEDED' || !Array.isArray(root.Results?.series)) return [];
  const entries = root.Results.series.filter(item => item.seriesID === BLS_SERIES[series]);
  if (entries.length !== 1 || !Array.isArray(entries[0].data)) return [];
  const rows = new Map<number, number>();
  for (const raw of entries[0].data) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.year !== 'string' || !/^\d{4}$/.test(row.year) || typeof row.period !== 'string' || !/^M(0[1-9]|1[0-2])$/.test(row.period)) continue;
    const year = Number(row.year), month = Number(row.period.slice(1)), value = macroNumber(row.value);
    const index = year * 12 + month - 1;
    if (year < 1900 || value === null || value < 0 || (series === 'UNEMPLOYMENT' && value > 100) || (series === 'CPI_YOY' && value === 0)
      || Date.parse(periodEnd(year, month)) >= now) continue;
    // Conflicting duplicate observations are not resolved by payload order.
    if (rows.has(index) && rows.get(index) !== value) return [];
    rows.set(index, value);
  }
  const index = [...rows.keys()].sort((a, b) => b - a)[0];
  if (index === undefined) return [];
  const valueAt = (key: number) => {
    const value = rows.get(key), base = rows.get(key - 12);
    if (value === undefined) return null;
    return series === 'UNEMPLOYMENT' ? value : base !== undefined && base > 0 ? (value / base - 1) * 100 : null;
  };
  const value = valueAt(index), previous = valueAt(index - 1);
  if (value === null) return [];
  const end = (key: number) => periodEnd(Math.floor(key / 12), key % 12 + 1);
  const observation: MacroObservation = { series, country: 'US', currency: 'USD', value,
    previous, previousPeriod: previous === null ? null : end(index - 1), unit: '%', period: end(index),
    retrievedAt: new Date(now).toISOString(), provider: 'BLS',
    sourceUrl: `https://data.bls.gov/timeseries/${BLS_SERIES[series]}` };
  return currentMacroObservation(observation, now) ? [observation] : [];
}

export function parseUsGdpCsv(text: string, now = Date.now()): MacroObservation[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (header !== `observation_date,${GDP_SERIES}` && header !== `DATE,${GDP_SERIES}`) return [];
  const rows = new Map<string, number>();
  for (const line of lines) {
    const [date, raw, extra] = line.split(',');
    if (extra !== undefined || !/^\d{4}-(01|04|07|10)-01$/.test(date)) continue;
    const value = macroNumber(raw), period = periodEnd(Number(date.slice(0, 4)), Number(date.slice(5, 7)) + 2);
    if (value === null || value < -100 || Date.parse(period) >= now) continue;
    if (rows.has(period) && rows.get(period) !== value) return [];
    rows.set(period, value);
  }
  const periods = [...rows.keys()].sort().reverse(), period = periods[0];
  if (!period) return [];
  const quarter = new Date(`${period}T00:00:00Z`);
  const previousDate = new Date(Date.UTC(quarter.getUTCFullYear(), quarter.getUTCMonth() - 2, 0)).toISOString().slice(0, 10);
  const previous = rows.get(previousDate) ?? null;
  const observation: MacroObservation = { series: 'GDP_QOQ_ANNUALIZED', country: 'US', currency: 'USD', value: rows.get(period)!, previous,
    previousPeriod: previous === null ? null : previousDate, unit: '%', period, retrievedAt: new Date(now).toISOString(),
    provider: 'BEA via FRED', sourceUrl: `https://fred.stlouisfed.org/series/${GDP_SERIES}` };
  return currentMacroObservation(observation, now) ? [observation] : [];
}

export async function loadUsMacroObservations() {
  const year = new Date().getUTCFullYear();
  const jobs = (Object.keys(BLS_SERIES) as BlsSeries[]).map(series => cachedMacroObservations(`bls:${series}`, CACHE_SECONDS, async () => {
    const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${BLS_SERIES[series]}?startyear=${year - 2}&endyear=${year}`;
    return parseBlsObservations(JSON.parse(await macroSourceText(url, CACHE_SECONDS)), series);
  }));
  jobs.push(cachedMacroObservations('bea:gdp', CACHE_SECONDS, async () => parseUsGdpCsv(await macroSourceText(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${GDP_SERIES}&cosd=${year - 2}-01-01`, CACHE_SECONDS))));
  return (await Promise.all(jobs)).flat();
}
