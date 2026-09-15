import type { RealEstateAssetInput } from '../real-estate';
import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';

export interface KuwaitMojSaleRecord { id?: string; date?: string; area?: string; propertyType?: string; totalValueKwd?: number; landAreaM2?: number; sourceUrl?: string; }
export function kuwaitMojRecordToObservation(row: KuwaitMojSaleRecord): RealEstateSourceObservation | null {
  if (!Number.isFinite(row.totalValueKwd) || !Number.isFinite(row.landAreaM2) || (row.landAreaM2 ?? 0) <= 0) return null;
  return { externalId: row.id, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'Kuwait Ministry of Justice — Real Estate Registration', sourceUrl: row.sourceUrl, observedOn: row.date, amount: row.totalValueKwd, currency: 'KWD', unitValue: (row.totalValueKwd as number) / (row.landAreaM2 as number), unitCode: 'M2', countryCode: 'KW', district: row.area, propertyType: row.propertyType, limitations: 'Use only records published by the Ministry of Justice real-estate registration statistics/sale-price service.' };
}
export function createKuwaitMojAdapter(fetchRows: (asset: RealEstateAssetInput) => Promise<KuwaitMojSaleRecord[]>): RealEstateEvidenceSourceAdapter { return { id: 'kw-moj-real-estate-sales', supportedCountries: ['KW'], authority: 'GOVERNMENT', async search(asset) { return (await fetchRows(asset)).map(kuwaitMojRecordToObservation).filter((x): x is RealEstateSourceObservation => x !== null); } }; }

export interface QatarMojBulletinRecord { id?: string; date?: string; municipality?: string; propertyType?: string; totalValueQar?: number; areaM2?: number; sourceUrl?: string; }
export function qatarMojRecordToObservation(row: QatarMojBulletinRecord): RealEstateSourceObservation | null {
  if (!Number.isFinite(row.totalValueQar) || !Number.isFinite(row.areaM2) || (row.areaM2 ?? 0) <= 0) return null;
  return { externalId: row.id, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'Qatar Ministry of Justice — Real Estate Registration Bulletin', sourceUrl: row.sourceUrl, observedOn: row.date, amount: row.totalValueQar, currency: 'QAR', unitValue: (row.totalValueQar as number) / (row.areaM2 as number), unitCode: 'M2', countryCode: 'QA', city: row.municipality, propertyType: row.propertyType, limitations: 'Only transaction-level rows with price and area may become comparables; aggregate bulletin totals remain context evidence.' };
}
export function createQatarMojAdapter(fetchRows: (asset: RealEstateAssetInput) => Promise<QatarMojBulletinRecord[]>): RealEstateEvidenceSourceAdapter { return { id: 'qa-moj-real-estate-bulletins', supportedCountries: ['QA'], authority: 'GOVERNMENT', async search(asset) { return (await fetchRows(asset)).map(qatarMojRecordToObservation).filter((x): x is RealEstateSourceObservation => x !== null); } }; }

export interface BahrainSlrbRecord { id?: string; date?: string; area?: string; propertyType?: string; totalValueBhd?: number; areaM2?: number; sourceUrl?: string; }
export function bahrainSlrbRecordToObservation(row: BahrainSlrbRecord): RealEstateSourceObservation | null {
  if (!Number.isFinite(row.totalValueBhd) || !Number.isFinite(row.areaM2) || (row.areaM2 ?? 0) <= 0) return null;
  return { externalId: row.id, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'Bahrain Survey and Land Registration Bureau', sourceUrl: row.sourceUrl, observedOn: row.date, amount: row.totalValueBhd, currency: 'BHD', unitValue: (row.totalValueBhd as number) / (row.areaM2 as number), unitCode: 'M2', countryCode: 'BH', district: row.area, propertyType: row.propertyType, limitations: 'Transaction reports and released open data are official evidence. A dashboard described as not yet launched must not be treated as a production feed.' };
}
export function createBahrainSlrbAdapter(fetchRows: (asset: RealEstateAssetInput) => Promise<BahrainSlrbRecord[]>): RealEstateEvidenceSourceAdapter { return { id: 'bh-slrb-transactions', supportedCountries: ['BH'], authority: 'GOVERNMENT', async search(asset) { return (await fetchRows(asset)).map(bahrainSlrbRecordToObservation).filter((x): x is RealEstateSourceObservation => x !== null); } }; }

export interface AbuDhabiAdrecRecord { id?: string; date?: string; district?: string; community?: string; assetType?: string; saleType?: string; totalValueAed?: number; areaM2?: number; sourceUrl?: string; }
export function abuDhabiAdrecRecordToObservation(row: AbuDhabiAdrecRecord): RealEstateSourceObservation | null {
  if (!Number.isFinite(row.totalValueAed) || !Number.isFinite(row.areaM2) || (row.areaM2 ?? 0) <= 0) return null;
  return { externalId: row.id, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT', sourceName: 'Abu Dhabi Real Estate Centre (ADREC)', sourceUrl: row.sourceUrl, observedOn: row.date, amount: row.totalValueAed, currency: 'AED', unitValue: (row.totalValueAed as number) / (row.areaM2 as number), unitCode: 'M2', countryCode: 'AE', region: 'Abu Dhabi', district: row.district ?? row.community, propertyType: row.assetType, limitations: 'Use exported/retrieved official ADREC sale records with explicit value and area. Dashboard aggregates and price indices are context, not parcel transaction comparables.' };
}
export function createAbuDhabiAdrecAdapter(fetchRows: (asset: RealEstateAssetInput) => Promise<AbuDhabiAdrecRecord[]>): RealEstateEvidenceSourceAdapter { return { id: 'ae-adrec-abu-dhabi-sales', supportedCountries: ['AE'], authority: 'GOVERNMENT', async search(asset) { if (asset.region && !asset.region.toLowerCase().includes('abu dhabi') && !asset.region.includes('أبوظبي')) return []; return (await fetchRows(asset)).map(abuDhabiAdrecRecordToObservation).filter((x): x is RealEstateSourceObservation => x !== null); } }; }
