/** Instrument choices are per screen; an absent entry means the whole market. */
export type TvSelections = Record<string, string[]>;
export const TV_SELECTIONS_KEY = 'sfm-markets-tv-instruments-v1';
export const validTvSymbol = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9.^=/:_-]{1,64}$/.test(value);
export function normalizeTvSelections(value: unknown): TvSelections {
  const result: TvSelections = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  let remaining = 50000;
  for (const [market, symbols] of Object.entries(value).slice(0, 150)) {
    if (!/^[A-Za-z0-9_]{1,32}$/.test(market) || ['__proto__','constructor','prototype'].includes(market) || !Array.isArray(symbols)) continue;
    const selected = [...new Set(symbols.filter(validTvSymbol))].slice(0, Math.min(20000, remaining));
    result[market] = selected; remaining -= selected.length;
  }
  return result;
}
export type TvInstrument = { symbol: string; displaySymbol?: string; name: string; nameAr?: string; currency?: string | null; region?: string };
export type TvInstrumentPage = { items: TvInstrument[]; total: number; directoryTotal: number; page: number; pageSize: number };
