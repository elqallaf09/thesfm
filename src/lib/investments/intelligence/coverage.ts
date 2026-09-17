export type CoverageCapability =
  | 'ASSET_INPUT'
  | 'PARCEL_CONTEXT'
  | 'OFFICIAL_AGGREGATES'
  | 'TRANSACTION_COMPARABLES'
  | 'MARKET_COMPARABLES'
  | 'FX_READY'
  | 'VALUATION_READY';

export type CoverageState = 'VERIFIED' | 'PARTIAL' | 'RESEARCHING' | 'UNAVAILABLE';

export interface JurisdictionCoverage {
  jurisdictionCode: string;
  countryCode: string;
  label: string;
  capabilities: Partial<Record<CoverageCapability, CoverageState>>;
  verifiedAt?: string;
  notes?: string[];
}

const coverage = new Map<string, JurisdictionCoverage>();

export function registerJurisdictionCoverage(entry: JurisdictionCoverage): void {
  if (coverage.has(entry.jurisdictionCode)) throw new Error(`Duplicate jurisdiction coverage: ${entry.jurisdictionCode}`);
  coverage.set(entry.jurisdictionCode, entry);
}

export function getJurisdictionCoverage(jurisdictionCode: string): JurisdictionCoverage | null {
  return coverage.get(jurisdictionCode) ?? null;
}

export function listCountryJurisdictions(countryCode: string): JurisdictionCoverage[] {
  return [...coverage.values()].filter((entry) => entry.countryCode === countryCode);
}

export function isValuationReady(jurisdictionCode: string): boolean {
  return coverage.get(jurisdictionCode)?.capabilities.VALUATION_READY === 'VERIFIED';
}

// Global asset recording is a product capability independent of automated valuation coverage.
// Verified source capabilities are registered only after source/legal/granularity validation.
