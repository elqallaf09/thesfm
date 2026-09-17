import type { RealEstateAssetInput } from '../real-estate';
import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

/**
 * Federation of Bosnia and Herzegovina official market-report source.
 *
 * The FGU/katastar.ba Real Estate Price Register publishes official market reports
 * based on registered purchase contracts. This adapter deliberately does NOT scrape
 * protected/public-view registry records or invent parcel-level comparables. It exposes
 * report-level evidence only when an ingestion pipeline has supplied extracted,
 * attributable observations from an official published report.
 */
export const BOSNIA_FBIH_RCN_SOURCE = {
  id: 'ba-fbih-fgu-rcn',
  countryCode: 'BA',
  authority: 'GOVERNMENT' as const,
  sourceName: 'Federal Administration for Geodetic and Real Property Affairs — Real Estate Price Register',
  reportsUrl: 'https://katastar.ba/rcn',
  legalUseNote: 'Use official published reports or explicitly licensed/public data only. Do not bulk-copy protected cadastral/RCN public-view data.',
};

export interface BosniaFbihReportObservation {
  reportYear: number;
  observedOn?: string;
  region?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  currency: 'BAM';
  unitValue?: number;
  amount?: number;
  sourceUrl: string;
  sourceRecordIdentifier?: string;
  limitations?: string;
}

export function bosniaReportObservationToSource(input: BosniaFbihReportObservation): RealEstateSourceObservation {
  return {
    externalId: input.sourceRecordIdentifier ?? `report-${input.reportYear}-${input.region ?? 'fbih'}`,
    evidenceType: 'OFFICIAL_REPORT',
    authority: 'GOVERNMENT',
    sourceName: BOSNIA_FBIH_RCN_SOURCE.sourceName,
    sourceUrl: input.sourceUrl,
    observedOn: input.observedOn,
    amount: input.amount,
    currency: input.currency,
    unitValue: input.unitValue,
    unitCode: input.unitValue == null ? undefined : 'M2',
    countryCode: 'BA',
    region: input.region,
    city: input.city,
    district: input.district,
    propertyType: input.propertyType,
    limitations: input.limitations ?? 'Official report-level evidence; not represented as a parcel-level completed transaction unless the report explicitly provides that observation.',
  };
}

export function createBosniaFbihReportAdapter(
  load: (asset: RealEstateAssetInput) => Promise<BosniaFbihReportObservation[]>,
): RealEstateEvidenceSourceAdapter {
  return {
    id: BOSNIA_FBIH_RCN_SOURCE.id,
    supportedCountries: ['BA'],
    authority: 'GOVERNMENT',
    async search(asset) {
      return (await load(asset)).map(bosniaReportObservationToSource);
    },
  };
}
