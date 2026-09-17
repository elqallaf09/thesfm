import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

export interface DubaiDldTransactionRow {
  transactionNumber?: string;
  transactionDate?: string;
  transactionType?: string;
  area?: string;
  propertyType?: string;
  propertyUsage?: string;
  amount?: number;
  transactionSizeM2?: number;
  propertyAreaM2?: number;
}

export function mapDubaiDldTransaction(row: DubaiDldTransactionRow, sourceUrl: string): RealEstateSourceObservation | null {
  const area = row.propertyAreaM2 ?? row.transactionSizeM2;
  if (!row.amount || row.amount <= 0 || !area || area <= 0) return null;
  return {
    externalId: row.transactionNumber,
    evidenceType: 'OFFICIAL_TRANSACTION',
    authority: 'GOVERNMENT',
    sourceName: 'Dubai Land Department — Real Estate Transactions',
    sourceUrl,
    observedOn: row.transactionDate,
    amount: row.amount,
    currency: 'AED',
    unitValue: row.amount / area,
    unitCode: 'M2',
    countryCode: 'AE',
    region: 'Dubai',
    district: row.area,
    propertyType: row.propertyType ?? row.propertyUsage,
    limitations: 'Official DLD transaction evidence. Transaction/registration subtypes must remain visible when filtering comparables.',
  };
}

/** Uses DLD downloadable/open-data transaction rows; CAPTCHA/HTML automation is not a data contract. */
export function createDubaiDldAdapter(loadRows: () => Promise<{ sourceUrl: string; rows: DubaiDldTransactionRow[] }>): RealEstateEvidenceSourceAdapter {
  return {
    id: 'ae-dubai-dld-transactions',
    supportedCountries: ['AE'],
    authority: 'GOVERNMENT',
    async search(asset) {
      if (asset.region && asset.region.trim().toLowerCase() !== 'dubai') return [];
      const dataset = await loadRows();
      return dataset.rows.map((row) => mapDubaiDldTransaction(row, dataset.sourceUrl)).filter((row): row is RealEstateSourceObservation => row !== null);
    },
  };
}
