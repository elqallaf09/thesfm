import type { MacroIndicatorId } from '@/lib/providers/economic-data/types';

export type EconomicDirection = 'rising' | 'falling' | 'steady' | 'unknown';
export type EconomicPolicyRegime = 'tightening' | 'easing' | 'stable' | 'unknown';
export type EconomicLaborSignal = 'improving' | 'weakening' | 'stable' | 'unknown';

export type EconomicContextIndicatorInput = {
  id: MacroIndicatorId;
  value: number | string;
  previous?: number | string | null;
  unit?: string | null;
  date: string;
  source: string;
  provider: string;
};

export type EconomicContextIndicator = {
  id: MacroIndicatorId;
  value: number | null;
  previous: number | null;
  unit: string | null;
  date: string;
  source: string;
  provider: string;
  direction: EconomicDirection;
};

export type EconomicContextSnapshot = {
  status: 'available' | 'partial' | 'empty';
  country: string;
  generatedAt: string;
  freshestDataAt: string | null;
  sources: string[];
  indicators: Partial<Record<MacroIndicatorId, EconomicContextIndicator>>;
  signals: {
    inflation: EconomicDirection;
    policyRate: EconomicDirection;
    policyRegime: EconomicPolicyRegime;
    growth: EconomicDirection;
    labor: EconomicLaborSignal;
    yieldCurve: EconomicDirection;
  };
  missing: MacroIndicatorId[];
};

const CORE_CONTEXT_IDS: MacroIndicatorId[] = ['inflation', 'policyRate', 'gdp', 'unemployment', 'yieldCurve'];

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function direction(current: number | null, previous: number | null): EconomicDirection {
  if (current === null || previous === null) return 'unknown';
  const tolerance = Math.max(1e-9, Math.abs(previous) * 0.0001);
  if (current > previous + tolerance) return 'rising';
  if (current < previous - tolerance) return 'falling';
  return 'steady';
}

function newestDate(values: string[]) {
  const valid = values
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time);
  return valid[0]?.value ?? null;
}

export function buildEconomicContextFromIndicators(
  country: string,
  inputs: EconomicContextIndicatorInput[],
  generatedAt = new Date(),
): EconomicContextSnapshot {
  const indicators: Partial<Record<MacroIndicatorId, EconomicContextIndicator>> = {};

  for (const input of inputs) {
    const value = numeric(input.value);
    const previous = numeric(input.previous);
    indicators[input.id] = {
      id: input.id,
      value,
      previous,
      unit: input.unit ?? null,
      date: input.date,
      source: input.source,
      provider: input.provider,
      direction: direction(value, previous),
    };
  }

  const missing = CORE_CONTEXT_IDS.filter((id) => !indicators[id]);
  const policyRateDirection = indicators.policyRate?.direction ?? 'unknown';
  const unemploymentDirection = indicators.unemployment?.direction ?? 'unknown';

  const policyRegime: EconomicPolicyRegime = policyRateDirection === 'rising'
    ? 'tightening'
    : policyRateDirection === 'falling'
      ? 'easing'
      : policyRateDirection === 'steady'
        ? 'stable'
        : 'unknown';

  const labor: EconomicLaborSignal = unemploymentDirection === 'falling'
    ? 'improving'
    : unemploymentDirection === 'rising'
      ? 'weakening'
      : unemploymentDirection === 'steady'
        ? 'stable'
        : 'unknown';

  const availableCount = CORE_CONTEXT_IDS.length - missing.length;
  const status: EconomicContextSnapshot['status'] = availableCount === 0
    ? 'empty'
    : missing.length === 0
      ? 'available'
      : 'partial';

  return {
    status,
    country,
    generatedAt: generatedAt.toISOString(),
    freshestDataAt: newestDate(Object.values(indicators).map((item) => item?.date ?? '').filter(Boolean)),
    sources: [...new Set(Object.values(indicators).flatMap((item) => item ? [item.source, item.provider] : []).filter(Boolean))],
    indicators,
    signals: {
      inflation: indicators.inflation?.direction ?? 'unknown',
      policyRate: policyRateDirection,
      policyRegime,
      growth: indicators.gdp?.direction ?? 'unknown',
      labor,
      yieldCurve: indicators.yieldCurve?.direction ?? 'unknown',
    },
    missing,
  };
}

export const ECONOMIC_CONTEXT_INDICATORS = [...CORE_CONTEXT_IDS];
