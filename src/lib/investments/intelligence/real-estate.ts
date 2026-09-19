import type { ValuationEvidence } from './contracts';
import { assessEvidenceSufficiency } from './contracts';

export interface RealEstateAssetInput {
  countryCode: string;
  region?: string;
  city?: string;
  municipality?: string;
  district?: string;
  propertyType: string;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  landArea?: number;
  landAreaUnit?: 'M2' | 'FT2';
  builtArea?: number;
  builtAreaUnit?: 'M2' | 'FT2';
  parcelIdentifier?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface NormalizedComparable {
  evidenceId: string;
  sourceName: string;
  currency: string;
  valuePerM2: number;
  evidence: ValuationEvidence;
}

const SQFT_PER_SQM = 10.76391041671;

/** Never substitute land area for a dwelling's floor area. */
export function valuationArea(asset: RealEstateAssetInput): { value: number; basis: 'LAND' | 'BUILT' } | null {
  const basis = asset.propertyType === 'LAND' ? 'LAND' : 'BUILT';
  const value = basis === 'LAND' ? asset.landArea : asset.builtArea;
  const unit = basis === 'LAND' ? asset.landAreaUnit : asset.builtAreaUnit;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && unit
    ? { value: areaToSquareMeters(value, unit), basis } : null;
}

export function areaToSquareMeters(value: number, unit: 'M2' | 'FT2'): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Area must be a positive finite number.');
  return unit === 'M2' ? value : value / SQFT_PER_SQM;
}

export function normalizeComparableToM2(evidence: ValuationEvidence): NormalizedComparable | null {
  if (!evidence.currency || !Number.isFinite(evidence.unitValue) || !evidence.unitCode) return null;
  const unitValue = evidence.unitValue as number;
  if (unitValue <= 0) return null;

  if (evidence.unitCode === 'M2') {
    return { evidenceId: evidence.id, sourceName: evidence.sourceName, currency: evidence.currency, valuePerM2: unitValue, evidence };
  }
  if (evidence.unitCode === 'FT2') {
    return { evidenceId: evidence.id, sourceName: evidence.sourceName, currency: evidence.currency, valuePerM2: unitValue * SQFT_PER_SQM, evidence };
  }
  return null;
}

/**
 * Prepares comparables without performing FX conversion. Currency normalization belongs
 * to the valuation engine, where every non-identity conversion must have a supplied,
 * auditable FX quote. This keeps raw evidence intact and prevents guessed conversion.
 */
export function prepareRealEstateEvidence(evidence: ValuationEvidence[]) {
  const sufficiency = assessEvidenceSufficiency(evidence);
  const comparables = sufficiency.usableEvidence
    .map(normalizeComparableToM2)
    .filter((item): item is NormalizedComparable => item !== null);

  return { ...sufficiency, comparables };
}
