export type MacroSeries = 'SOFR' | 'EFFR' | 'CPI_YOY' | 'UNEMPLOYMENT' | 'GDP_QOQ_ANNUALIZED' | 'GDP_ANNUAL' | 'CPI_ANNUAL' | 'UNEMPLOYMENT_ANNUAL';
export type MacroObservation = {
  series: MacroSeries; country: string; currency: string; value: number; previous: number | null;
  previousPeriod: string | null; unit: '%'; period: string; retrievedAt: string; provider: string; sourceUrl: string;
};
const DAY = 86_400_000;
export const MACRO_SERIES: Record<MacroSeries, { frequency: 'daily' | 'monthly' | 'quarterly' | 'annual'; maxAgeDays: number }> = {
  SOFR: { frequency: 'daily', maxAgeDays: 7 }, EFFR: { frequency: 'daily', maxAgeDays: 7 },
  CPI_YOY: { frequency: 'monthly', maxAgeDays: 100 }, UNEMPLOYMENT: { frequency: 'monthly', maxAgeDays: 100 },
  GDP_QOQ_ANNUALIZED: { frequency: 'quarterly', maxAgeDays: 210 },
  GDP_ANNUAL: { frequency: 'annual', maxAgeDays: 730 }, CPI_ANNUAL: { frequency: 'annual', maxAgeDays: 730 },
  UNEMPLOYMENT_ANNUAL: { frequency: 'annual', maxAgeDays: 730 },
};

/** A period is an effective day or the END of a completed month/quarter/year, never a release time. */
export function currentMacroObservation(sample: MacroObservation, now = Date.now()) {
  const policy = MACRO_SERIES[sample.series];
  const period = Date.parse(sample.period), retrieved = Date.parse(sample.retrievedAt);
  return Boolean(policy) && typeof sample.value === 'number' && Number.isFinite(sample.value)
    && /^\d{4}-\d{2}-\d{2}$/.test(sample.period) && Number.isFinite(period)
    && new Date(period).toISOString().slice(0, 10) === sample.period && period <= now
    && now - period <= policy.maxAgeDays * DAY && Number.isFinite(retrieved)
    && retrieved <= now && now - retrieved <= 7 * DAY;
}

export function macroNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim()))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function periodEnd(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
