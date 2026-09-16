/** Source observations are deliberately separate from valuation evidence. */
export interface OfficialPropertyLocation {
  municipality: string;
  municipalityAr: string;
  district: string;
  districtAr: string;
}

export interface OfficialPropertyRecord extends OfficialPropertyLocation {
  id: string;
  observedOn: string;
  propertyType: string;
  propertyTypeAr: string;
  usage: string | null;
  usageAr: string | null;
  areaM2: number | null;
  reportedValue: number | null;
  reportedPricePerM2: number | null;
  // The reviewed API fields do not declare currency. Do not infer it from a country.
  currency: null;
  fullOwnership: boolean;
  sourceUrl: string;
}

export interface OfficialPropertyContext {
  providerId: string;
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
  status: 'CONNECTED_REVIEW_REQUIRED' | 'INPUT_REQUIRED' | 'UNAVAILABLE';
  retrievedAt: string | null;
  metadataUpdatedAt: string | null;
  latestObservationOn: string | null;
  sampleTotal: number | null;
  sampleTruncated: boolean;
  records: OfficialPropertyRecord[];
  // This feed is connected for source inspection, NOT approved for automated valuation.
  valuationEligible: false;
  reasons: string[];
}
