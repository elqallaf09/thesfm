import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

export interface OmanMohupTransactionRow {
  id?: string;
  governorate?: string;
  wilayat?: string;
  landUse?: string;
  transactionDate?: string;
  saleValue?: number;
  currency?: string;
  areaM2?: number;
}

export function mapOmanMohupRow(row: OmanMohupTransactionRow, sourceUrl: string): RealEstateSourceObservation | null {
  if (!row.saleValue || row.saleValue <= 0 || !row.areaM2 || row.areaM2 <= 0) return null;
  return {
    externalId: row.id,
    evidenceType: 'OFFICIAL_TRANSACTION',
    authority: 'GOVERNMENT',
    sourceName: 'Oman Ministry of Housing and Urban Planning — Land Buying and Selling',
    sourceUrl,
    observedOn: row.transactionDate,
    amount: row.saleValue,
    currency: row.currency ?? 'OMR',
    unitValue: row.saleValue / row.areaM2,
    unitCode: 'M2',
    countryCode: 'OM',
    region: row.governorate,
    city: row.wilayat,
    propertyType: row.landUse,
    limitations: 'Official open-data transaction record. Match quality still depends on available governorate/wilayat/use fields.',
  };
}

/**
 * Boundary for MOHUP open datasets. The fetch/parse implementation must use the
 * ministry/open-data downloadable CSV/JSON/XML/XLS dataset and retain the exact
 * dataset URL/version used. It is intentionally dependency-injected here so a
 * website HTML scraper cannot silently become a production data source.
 */
export function createOmanMohupAdapter(loadRows: () => Promise<{ sourceUrl: string; rows: OmanMohupTransactionRow[] }>): RealEstateEvidenceSourceAdapter {
  return {
    id: 'om-mohup-land-transactions',
    supportedCountries: ['OM'],
    authority: 'GOVERNMENT',
    async search() {
      const dataset = await loadRows();
      return dataset.rows.map((row) => mapOmanMohupRow(row, dataset.sourceUrl)).filter((row): row is RealEstateSourceObservation => row !== null);
    },
  };
}
