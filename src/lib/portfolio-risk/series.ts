import { analyzeDailyReturns, concentration, type RiskFailure, type RiskResult } from './core';

export type NavPoint = { date: string; nav: number; netExternalFlow: number };
export type PortfolioRiskSnapshot = {
  methodologyVersion: 'risk-v1'; periodStart: string; periodEnd: string; currency: string;
  metrics: RiskResult; concentration: { hhi: number; largestWeight: number };
  dataQuality: { status: 'complete'; observations: number };
};
export type SnapshotFailure = RiskFailure;
const dateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/**
 * Flow-adjusted return assumes END-OF-PERIOD external cash flows.
 * Intraday flows require sub-period valuations for exact time-weighted returns.
 * expectedDates must come from an independent verified portfolio calendar,
 * never from the NAV rows being tested for completeness.
 */
export function analyzePortfolioSeries(input: {
  points: NavPoint[]; weights: number[]; currency: string;
  periodsPerYear?: number; expectedDates?: string[];
}): PortfolioRiskSnapshot | SnapshotFailure {
  const { points, weights, currency, expectedDates } = input;
  if (!/^[A-Z]{3}$/.test(currency)) return { error: 'INVALID_CURRENCY' };
  if (points.some(p => !dateOnly(p.date) || !Number.isFinite(p.nav) || p.nav <= 0 || !Number.isFinite(p.netExternalFlow)) || points.some((p, i) => i > 0 && p.date <= points[i - 1].date)) {
    return { error: 'INVALID_NAV_SERIES' };
  }
  if (!expectedDates) return { error: 'MISSING_VALUATION_CALENDAR' };
  if (expectedDates.length < 61 || expectedDates.some((date, i) => !dateOnly(date) || (i > 0 && date <= expectedDates[i - 1]))) {
    return { error: 'INVALID_VALUATION_CALENDAR' };
  }
  if (expectedDates.length !== points.length || expectedDates.some((date, i) => date !== points[i].date)) {
    return { error: 'INCOMPLETE_NAV_HISTORY' };
  }
  const exposure = concentration(weights);
  if ('error' in exposure) return { error: 'INVALID_POSITIONS' };
  const returns = points.slice(1).map((p, i) => (p.nav - p.netExternalFlow) / points[i].nav - 1);
  const metrics = analyzeDailyReturns(returns, input.periodsPerYear);
  if ('error' in metrics) return metrics;
  return {
    methodologyVersion: 'risk-v1', periodStart: points[0].date, periodEnd: points[points.length - 1].date,
    currency, metrics, concentration: exposure, dataQuality: { status: 'complete', observations: metrics.observations },
  };
}
