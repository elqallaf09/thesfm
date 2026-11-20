import { concentration } from './core';
import { validatePositionValuations, type PositionValuation } from './valuation';

export type RiskLocale = 'ar' | 'en' | 'fr';
export type RiskPosition = {
  id: string;
  asset: { type: string | null; identifier: string | null; symbol: string | null; exchangeCode: string | null };
  valuation: PositionValuation & { currency: string | null; totalValue: number | null };
  fx: { rateToBaseCurrency: number | null; source: string | null; valuedAt: string | null };
  dataStatus: { migrationState: string };
};
export type CurrentRiskSnapshot = {
  methodologyVersion: 'risk-current-v1';
  currency: string;
  asOf: string;
  calculatedAt: string;
  holdingsCount: number;
  assetsCount: number;
  totalValue: number;
  concentration: { hhi: number; largestWeight: number };
  riskScore: null;
  historicalMetrics: null;
  historicalMetricsStatus: 'VERIFIED_NAV_HISTORY_NOT_CONNECTED';
  dataQuality: { status: 'partial'; coverage: 'recorded_current_positions_only' };
};
export type CurrentRiskResult = { ok: true; snapshot: CurrentRiskSnapshot } | { ok: false; code: string };
const MAX_AGE_MS = 7 * 86400000;
const publicAssets = new Set(['STOCK', 'FUND', 'BOND', 'CRYPTO', 'GOLD', 'SILVER', 'COMMODITY']);
const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const fresh = (date: string | null, now: number) => Boolean(date && Number.isFinite(Date.parse(date)) && Date.parse(date) <= now && now - Date.parse(date) <= MAX_AGE_MS);
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= Math.max(0.005, Math.abs(b) * 1e-6);

/** Current recorded assets, not net NAV, leverage analysis, or a historical risk score. */
export function buildCurrentRisk(positions: RiskPosition[], now: number): CurrentRiskResult {
  // The canonical loader has a 5,000-row limit: never label a capped read complete.
  if (positions.length >= 5000) return { ok: false, code: 'POSITION_LIMIT_REACHED' };
  if (positions.some(p => p.dataStatus.migrationState !== 'VERIFIED') || new Set(positions.map(p => p.id)).size !== positions.length) {
    return { ok: false, code: 'UNVERIFIED_OR_DUPLICATE_POSITIONS' };
  }
  const valuations = validatePositionValuations(positions.map(p => p.valuation), now);
  if (!valuations.ok) return valuations;
  let oldest = Date.parse(valuations.oldestValuationAt);
  const grouped = new Map<string, number>();
  for (const p of positions) {
    const v = p.valuation;
    if (!v.currency || !/^[A-Z]{3}$/.test(v.currency) || !isFiniteNumber(v.totalValue) || v.totalValue < 0) {
      return { ok: false, code: 'INVALID_NATIVE_VALUATION' };
    }
    let expected = v.totalValue;
    if (v.currency !== valuations.currency) {
      const fx = p.fx;
      if (!isFiniteNumber(fx.rateToBaseCurrency) || fx.rateToBaseCurrency <= 0 || !fx.source?.trim() || /stale|failed|unavailable|unknown/i.test(fx.source) || !fresh(fx.valuedAt, now)) {
        return { ok: false, code: 'MISSING_OR_STALE_FX' };
      }
      expected *= fx.rateToBaseCurrency;
      oldest = Math.min(oldest, Date.parse(fx.valuedAt!));
    }
    if (!close(v.valueInBaseCurrency!, expected)) return { ok: false, code: 'FX_VALUE_MISMATCH' };
    const type = p.asset.type?.trim().toUpperCase() || 'OTHER';
    const identifier = p.asset.identifier?.trim();
    const symbol = p.asset.symbol?.trim().toUpperCase();
    const exchange = p.asset.exchangeCode?.trim().toUpperCase();
    // Separate lots of a known asset must not masquerade as diversification.
    const key = identifier ? JSON.stringify([type, identifier]) : symbol && exchange ? JSON.stringify([type, exchange, symbol]) : null;
    if (!key && publicAssets.has(type)) return { ok: false, code: 'ASSET_IDENTITY_UNAVAILABLE' };
    const identity = key ?? JSON.stringify(['private-position', p.id]);
    grouped.set(identity, (grouped.get(identity) ?? 0) + v.valueInBaseCurrency!);
  }
  const exposure = concentration([...grouped.values()].map(value => value / valuations.total));
  if ('error' in exposure) return { ok: false, code: exposure.error };
  return { ok: true, snapshot: {
    methodologyVersion: 'risk-current-v1', currency: valuations.currency,
    asOf: new Date(oldest).toISOString(), calculatedAt: new Date(now).toISOString(),
    holdingsCount: positions.length, assetsCount: grouped.size, totalValue: valuations.total,
    concentration: exposure, riskScore: null, historicalMetrics: null,
    historicalMetricsStatus: 'VERIFIED_NAV_HISTORY_NOT_CONNECTED',
    dataQuality: { status: 'partial', coverage: 'recorded_current_positions_only' },
  } };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** Runtime validation at the browser boundary, including ranges and timestamps. */
export function isCurrentRiskSnapshot(value: unknown): value is CurrentRiskSnapshot {
  if (!record(value) || !record(value.concentration) || !record(value.dataQuality)) return false;
  const { hhi, largestWeight } = value.concentration;
  return value.methodologyVersion === 'risk-current-v1' && typeof value.currency === 'string' && /^[A-Z]{3}$/.test(value.currency) &&
    typeof value.asOf === 'string' && typeof value.calculatedAt === 'string' && Number.isFinite(Date.parse(value.asOf)) && Number.isFinite(Date.parse(value.calculatedAt)) && Date.parse(value.asOf) <= Date.parse(value.calculatedAt) &&
    isFiniteNumber(value.totalValue) && value.totalValue > 0 &&
    isFiniteNumber(value.holdingsCount) && Number.isInteger(value.holdingsCount) && value.holdingsCount > 0 && value.holdingsCount < 5000 &&
    isFiniteNumber(value.assetsCount) && Number.isInteger(value.assetsCount) && value.assetsCount > 0 && value.assetsCount <= value.holdingsCount &&
    isFiniteNumber(hhi) && hhi > 0 && hhi <= 1 + 1e-9 && isFiniteNumber(largestWeight) && largestWeight > 0 && largestWeight <= 1 + 1e-9 &&
    hhi + 1e-9 >= largestWeight * largestWeight && hhi <= largestWeight + 1e-9 &&
    value.riskScore === null && value.historicalMetrics === null && value.historicalMetricsStatus === 'VERIFIED_NAV_HISTORY_NOT_CONNECTED' &&
    value.dataQuality.status === 'partial' && value.dataQuality.coverage === 'recorded_current_positions_only';
}
