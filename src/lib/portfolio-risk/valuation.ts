/** Pure valuation validation for a user-scoped canonical position snapshot. */
export type PositionValuation = {
  valueInBaseCurrency: number | null;
  baseCurrency: string | null;
  valuedAt: string | null;
  source: string | null;
  sourceQuality: string | null;
};
export type ValuationSummary =
  | { ok: true; currency: string; weights: number[]; total: number; oldestValuationAt: string }
  | { ok: false; code: "NO_POSITIONS" | "INCOMPLETE_OR_STALE_VALUATIONS" | "ZERO_PORTFOLIO_VALUE" };

export function validatePositionValuations(
  positions: PositionValuation[],
  now: number,
  maxAgeMs = 7 * 86400000,
): ValuationSummary {
  if (!positions.length) return { ok: false, code: "NO_POSITIONS" };
  if (!Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0)
    return { ok: false, code: "INCOMPLETE_OR_STALE_VALUATIONS" };
  let currency: string | null = null;
  let oldest = now;
  const values: number[] = [];
  for (const p of positions) {
    const amount = p.valueInBaseCurrency;
    const code = p.baseCurrency;
    const timestamp = p.valuedAt ? Date.parse(p.valuedAt) : NaN;
    if (amount === null || !Number.isFinite(amount) || amount < 0 ||
        !code || !/^[A-Z]{3}$/.test(code) || (currency !== null && currency !== code) ||
        !Number.isFinite(timestamp) || timestamp > now || now - timestamp > maxAgeMs ||
        !p.source?.trim() || !p.sourceQuality?.trim() ||
        /stale|failed|unavailable|unknown/i.test(p.sourceQuality)) {
      return { ok: false, code: "INCOMPLETE_OR_STALE_VALUATIONS" };
    }
    currency = code;
    oldest = Math.min(oldest, timestamp);
    values.push(amount);
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) return { ok: false, code: "ZERO_PORTFOLIO_VALUE" };
  return { ok: true, currency: currency!, total, weights: values.map(value => value / total), oldestValuationAt: new Date(oldest).toISOString() };
}
