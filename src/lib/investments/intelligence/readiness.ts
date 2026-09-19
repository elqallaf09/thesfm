import type { ValuationEvidence } from './contracts';
import type { RealEstateAssetInput } from './real-estate';
import { qualifiedTransactionEvidence } from './transactionEvidence';
import { valuationArea } from './real-estate';

export type ReadinessState = 'READY' | 'PARTIAL' | 'BLOCKED';
export interface RealEstateReadiness {
  state: ReadinessState;
  checks: { assetIdentity: boolean; area: boolean; evidence: boolean; transactionComparables: boolean; currencyConsistency: boolean };
  blockers: string[];
}

export function assessRealEstateReadiness(asset: RealEstateAssetInput, evidence: ValuationEvidence[], now = new Date()): RealEstateReadiness {
  const area = valuationArea(asset);
  const qualified = qualifiedTransactionEvidence(evidence, now).filter(item => (item.areaBasis ?? 'LAND') === area?.basis);
  const checks = {
    assetIdentity: Boolean(asset.countryCode && [asset.city, asset.municipality, asset.region].some(value => value?.trim())),
    area: Boolean(area),
    evidence: evidence.length > 0,
    transactionComparables: qualified.length >= 2,
    currencyConsistency: qualified.length >= 2 && new Set(qualified.map(item => item.currency)).size === 1,
  };
  const blockers: string[] = [];
  if (!checks.assetIdentity) blockers.push('Asset geography is incomplete.');
  if (!checks.area) blockers.push('Land/property area is required.');
  if (!checks.evidence) blockers.push('No valuation evidence is available.');
  if (!checks.transactionComparables) blockers.push('At least two dated, source-linked, distinct and strongly matched transaction comparables from the last 366 days are required.');
  if (!checks.currencyConsistency) blockers.push('Comparable currencies require verified FX normalization.');
  const passed = Object.values(checks).filter(Boolean).length;
  return { state: passed === Object.keys(checks).length ? 'READY' : passed >= 3 ? 'PARTIAL' : 'BLOCKED', checks, blockers };
}
