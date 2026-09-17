import type { ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';

export type ReadinessState = 'READY' | 'PARTIAL' | 'BLOCKED';
export interface RealEstateReadiness {
  state: ReadinessState;
  checks: { assetIdentity: boolean; area: boolean; evidence: boolean; transactionComparables: boolean; currencyConsistency: boolean };
  blockers: string[];
}

export function assessRealEstateReadiness(asset: RealEstateAssetInput, evidence: ValuationEvidence[]): RealEstateReadiness {
  const checks = {
    assetIdentity: Boolean(asset.countryCode && (asset.city || asset.municipality || asset.region)),
    area: Boolean(asset.landArea && asset.landArea > 0 && asset.landAreaUnit),
    evidence: evidence.length > 0,
    transactionComparables: evidence.filter((item) => ['OFFICIAL_TRANSACTION','MARKET_TRANSACTION'].includes(item.type) && Number.isFinite(item.unitValue)).length >= 2,
    currencyConsistency: new Set(evidence.filter((item) => Number.isFinite(item.unitValue)).map((item) => item.currency).filter(Boolean)).size <= 1,
  };
  const blockers: string[] = [];
  if (!checks.assetIdentity) blockers.push('Asset geography is incomplete.');
  if (!checks.area) blockers.push('Land/property area is required.');
  if (!checks.evidence) blockers.push('No valuation evidence is available.');
  if (!checks.transactionComparables) blockers.push('At least two transaction comparables are required for transaction-backed readiness.');
  if (!checks.currencyConsistency) blockers.push('Comparable currencies require verified FX normalization.');
  const passed = Object.values(checks).filter(Boolean).length;
  return { state: passed === Object.keys(checks).length ? 'READY' : passed >= 3 ? 'PARTIAL' : 'BLOCKED', checks, blockers };
}
