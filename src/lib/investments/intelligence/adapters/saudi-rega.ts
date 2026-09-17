import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

export interface SaudiRegaDealRow {
  id?: string;
  date?: string;
  region?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  valueSar?: number;
  areaM2?: number;
}

export function mapSaudiRegaDeal(row: SaudiRegaDealRow, sourceUrl: string): RealEstateSourceObservation | null {
  if (!row.valueSar || row.valueSar <= 0 || !row.areaM2 || row.areaM2 <= 0) return null;
  return {
    externalId: row.id,
    evidenceType: 'OFFICIAL_TRANSACTION',
    authority: 'GOVERNMENT',
    sourceName: 'Saudi Real Estate General Authority — Real Estate Indicators',
    sourceUrl,
    observedOn: row.date,
    amount: row.valueSar,
    currency: 'SAR',
    unitValue: row.valueSar / row.areaM2,
    unitCode: 'M2',
    countryCode: 'SA',
    region: row.region,
    city: row.city,
    district: row.district,
    propertyType: row.propertyType,
    limitations: 'Official historical sale-deal evidence. Access method and authentication requirements must be respected; no credential or browser-session scraping.',
  };
}

/**
 * REGA/MOJ service boundary. A production loader must use a permitted authenticated
 * or published data interface and preserve the official query/source URL. This
 * adapter does not bypass Nafath/login or scrape a user session.
 */
export function createSaudiRegaAdapter(loadRows: () => Promise<{ sourceUrl: string; rows: SaudiRegaDealRow[] }>): RealEstateEvidenceSourceAdapter {
  return {
    id: 'sa-rega-sale-deals',
    supportedCountries: ['SA'],
    authority: 'GOVERNMENT',
    async search() {
      const dataset = await loadRows();
      return dataset.rows.map((row) => mapSaudiRegaDeal(row, dataset.sourceUrl)).filter((row): row is RealEstateSourceObservation => row !== null);
    },
  };
}
