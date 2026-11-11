/**
 * Portfolio risk primitives. Pure calculations: no network calls, no synthetic prices.
 * Inputs must be aligned, validated daily returns in the same base currency.
 */
export type RiskResult = { observations: number; volatilityAnnualized: number; historicalVar95: number; historicalCvar95: number; maximumDrawdown: number };
export type RiskFailure = { error: string };
const finite = (n: number) => Number.isFinite(n);
export function analyzeDailyReturns(returns: number[], periodsPerYear = 252): RiskResult | RiskFailure {
  if (!Number.isInteger(periodsPerYear) || periodsPerYear <= 0) return { error: "INVALID_CALENDAR" };
  if (returns.length < 60 || returns.some(r => !finite(r) || r < -1)) return { error: "INSUFFICIENT_OR_INVALID_RETURNS" };
  const n = returns.length;
  const mean = returns.reduce((a,b) => a+b,0)/n;
  const variance = returns.reduce((a,b)=>a+(b-mean)**2,0)/(n-1);
  const sorted = [...returns].sort((a,b)=>a-b);
  const tailCount = Math.ceil(n*0.05);
  // Empirical loss quantile, expressed as a nonnegative loss fraction.
  const historicalVar95 = Math.max(0,-sorted[tailCount-1]);
  const historicalCvar95 = Math.max(0,-sorted.slice(0,tailCount).reduce((a,b)=>a+b,0)/tailCount);
  let wealth=1,peak=1,maxDrawdown=0;
  for (const r of returns) {
    wealth *= 1+r;
    peak=Math.max(peak,wealth);
    maxDrawdown=Math.max(maxDrawdown,1-wealth/peak);
  }
  return { observations:n, volatilityAnnualized:Math.sqrt(variance*periodsPerYear),historicalVar95,historicalCvar95,maximumDrawdown:maxDrawdown };
}
export function concentration(weights: number[]): { hhi: number; largestWeight: number } | RiskFailure {
  if (!weights.length || weights.some(w=>!finite(w)||w<0) || Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-6) return {error:"INVALID_WEIGHTS"};
  return {hhi:weights.reduce((a,w)=>a+w*w,0),largestWeight:Math.max(...weights)};
}
