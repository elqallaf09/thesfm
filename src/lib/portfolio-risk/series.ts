import { analyzeDailyReturns, concentration, type RiskFailure, type RiskResult } from "./core";

/** A complete, timestamped, base-currency portfolio NAV history. */
export type NavPoint = { date: string; nav: number; netExternalFlow: number };
export type PortfolioRiskSnapshot = {
  methodologyVersion: "risk-v1";
  periodStart: string;
  periodEnd: string;
  currency: string;
  metrics: RiskResult;
  concentration: { hhi: number; largestWeight: number };
  dataQuality: { status: "complete"; observations: number };
};
export type SnapshotFailure = RiskFailure | { error: "INVALID_NAV_SERIES" | "INVALID_CURRENCY" | "INVALID_POSITIONS" };

/**
 * Time-weighted daily returns: (ending NAV - net external contributions) / opening NAV - 1.
 * Requires daily valuations, correctly timestamped external flows and adjusted corporate actions.
 * This method is not appropriate if cash flows are misclassified or valuation gaps exist.
 */
export function analyzePortfolioSeries(input: {
  points: NavPoint[];
  weights: number[];
  currency: string;
  periodsPerYear?: number;
  /** Exact expected valuation dates for the selected market/portfolio calendar. */
  expectedDates?: string[];
}): PortfolioRiskSnapshot | SnapshotFailure {
  const { points, weights, currency } = input;
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "INVALID_CURRENCY" };
  if (points.length < 61 || points.some(p =>
    !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
    !Number.isFinite(Date.parse(p.date)) ||
    new Date(p.date).toISOString().slice(0, 10) !== p.date ||
    !Number.isFinite(p.nav) || p.nav <= 0 ||
    !Number.isFinite(p.netExternalFlow)
  ) || points.some((p,i) => i > 0 && p.date <= points[i-1].date)) return { error: "INVALID_NAV_SERIES" };
  // Never silently treat sparse snapshots as consecutive daily observations.
  // A verified market calendar is mandatory before annualizing daily returns.
  const expectedDates = input.expectedDates;
  if (!expectedDates || expectedDates.length !== points.length ||
      expectedDates.some((date, index) => date !== points[index].date)) {
    return { error: "INVALID_NAV_SERIES" };
  }
  const exposure = concentration(weights);
  if ("error" in exposure) return { error: "INVALID_POSITIONS" };
  const returns = points.slice(1).map((p,i) => (p.nav - p.netExternalFlow)/points[i].nav - 1);
  const metrics = analyzeDailyReturns(returns, input.periodsPerYear);
  if ("error" in metrics) return metrics;
  return {
    methodologyVersion: "risk-v1", periodStart: points[0].date,
    periodEnd: points[points.length-1].date, currency,
    metrics, concentration: exposure,
    dataQuality: { status: "complete", observations: metrics.observations },
  };
}
