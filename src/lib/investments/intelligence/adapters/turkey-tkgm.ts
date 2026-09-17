import type { RealEstateAssetInput } from '../real-estate';
import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

export const TURKEY_TKGM_SOURCE = {
  id: 'tr-tkgm-official',
  countryCode: 'TR',
  authority: 'GOVERNMENT' as const,
  sourceName: 'Tapu ve Kadastro Genel Müdürlüğü (TKGM)',
  officialUrl: 'https://www.tkgm.gov.tr/',
  evidenceBoundary: 'TKGM parcel/property services establish official parcel and declared-value context, but must not be represented as open parcel-level transaction-price evidence unless an authorized source explicitly supplies such prices.',
};

export interface TurkeyTkgmObservation {
  externalId: string;
  evidenceType: 'OFFICIAL_REGISTRY' | 'OFFICIAL_REPORT' | 'OFFICIAL_STATISTIC';
  observedOn?: string;
  region?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  amount?: number;
  currency?: 'TRY';
  unitValue?: number;
  sourceUrl: string;
  limitations?: string;
}

export function turkeyTkgmObservationToSource(input: TurkeyTkgmObservation): RealEstateSourceObservation {
  return {
    externalId: input.externalId,
    evidenceType: input.evidenceType,
    authority: 'GOVERNMENT',
    sourceName: TURKEY_TKGM_SOURCE.sourceName,
    sourceUrl: input.sourceUrl,
    observedOn: input.observedOn,
    amount: input.amount,
    currency: input.currency,
    unitValue: input.unitValue,
    unitCode: input.unitValue == null ? undefined : 'M2',
    countryCode: 'TR',
    region: input.region,
    city: input.city,
    district: input.district,
    propertyType: input.propertyType,
    limitations: input.limitations ?? TURKEY_TKGM_SOURCE.evidenceBoundary,
  };
}

export function createTurkeyTkgmAdapter(
  load: (asset: RealEstateAssetInput) => Promise<TurkeyTkgmObservation[]>,
): RealEstateEvidenceSourceAdapter {
  return {
    id: TURKEY_TKGM_SOURCE.id,
    supportedCountries: ['TR'],
    authority: 'GOVERNMENT',
    async search(asset) {
      return (await load(asset)).map(turkeyTkgmObservationToSource);
    },
  };
}
