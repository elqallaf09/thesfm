/** Pure calculations on validated, aligned simple daily returns in one currency. */
export type RiskResult = {
  observations: number;
  volatilityAnnualized: number;
  historicalVar95: number;
  historicalCvar95: number;
  maximumDrawdown: number;
};
export type RiskFailure = { error: string };
export const HISTORICAL_RISK_METHODOLOGY = 'risk-v2' as const;

export function analyzeDailyReturns(returns: number[], periodsPerYear = 252): RiskResult | RiskFailure {
  if (!Number.isSafeInteger(periodsPerYear) || periodsPerYear <= 0) return { error: 'INVALID_CALENDAR' };
  if (!Array.isArray(returns) || returns.length < 60) return { error: 'INSUFFICIENT_OR_INVALID_RETURNS' };
  // for-of also rejects sparse arrays, unlike Array.some().
  let mean = 0;
  let sumSquares = 0;
  let count = 0;
  let wealthToPeak = 1;
  let maximumDrawdown = 0;
  for (const value of returns) {
    if (!Number.isFinite(value) || value < -1) return { error: 'INSUFFICIENT_OR_INVALID_RETURNS' };
    count += 1;
    const delta = value - mean;
    mean += delta / count;
    sumSquares += delta * (value - mean);
    // Normalize at every new peak. An unbounded compounded wealth series can
    // overflow even when every input and the resulting drawdown are finite.
    wealthToPeak = Math.min(1, wealthToPeak * (1 + value));
    maximumDrawdown = Math.max(maximumDrawdown, 1 - wealthToPeak);
  }
  const volatilityAnnualized = Math.sqrt(Math.max(0, sumSquares / (count - 1))) * Math.sqrt(periodsPerYear);
  if (!Number.isFinite(volatilityAnnualized) || !Number.isFinite(mean)) return { error: 'NUMERIC_RANGE_EXCEEDED' };

  const sorted = [...returns].sort((a, b) => a - b);
  // Generalized inverse of the empirical LOSS CDF, not a linear interpolation:
  // min{x : P(loss <= x) >= .95}. The corresponding ascending-return index is
  // floor(n / 20). Gains are reported as zero loss, never a negative loss limit.
  const whole = Math.floor(count / 20);
  const fraction = (count % 20) / 20;
  const historicalVar95 = Math.max(0, -sorted[whole]);
  // Expected shortfall integrates exactly 5% of empirical probability mass.
  // At n=61 this is 3 full observations plus 0.05 of the fourth, NOT 4/61.
  let tailMean = 0;
  let tailWeight = 0;
  for (let i = 0; i < whole + (fraction > 0 ? 1 : 0); i += 1) {
    const weight = i < whole ? 1 : fraction;
    tailWeight += weight;
    tailMean += (-sorted[i] - tailMean) * (weight / tailWeight);
  }
  const historicalCvar95 = Math.max(0, tailMean);
  if (![historicalVar95, historicalCvar95, maximumDrawdown].every(Number.isFinite)) return { error: 'NUMERIC_RANGE_EXCEEDED' };
  return { observations: count, volatilityAnnualized, historicalVar95, historicalCvar95, maximumDrawdown };
}

export function concentration(weights: number[]): { hhi: number; largestWeight: number } | RiskFailure {
  if (!Array.isArray(weights) || !weights.length) return { error: 'INVALID_WEIGHTS' };
  let total = 0;
  let hhi = 0;
  let largestWeight = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) return { error: 'INVALID_WEIGHTS' };
    total += weight;
    hhi += weight * weight;
    largestWeight = Math.max(largestWeight, weight);
  }
  if (Math.abs(total - 1) > 1e-6) return { error: 'INVALID_WEIGHTS' };
  return { hhi, largestWeight };
}
