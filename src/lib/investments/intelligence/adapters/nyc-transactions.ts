import 'server-only';
import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';
import { valuationArea, type RealEstateAssetInput } from '../real-estate';
import { isNewYorkCityAsset } from './nyc-dof-open-data';
import { comparableArea, literal, recentCutoff, recentSale, sourceNumber as num, sourceText as text, transactionRows, type SourceRow } from './transaction-data';

const ENDPOINT = 'https://data.cityofnewyork.us/resource/usep-8jbt.json';
const BOROUGHS: Record<string, string> = { manhattan: '1', bronx: '2', brooklyn: '3', queens: '4', 'staten island': '5' };
const CLASSES: Record<string, string[]> = { LAND: ['V0', 'V3'], HOUSE: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A9'] };
const SQFT_PER_M2 = 10.76391041671;

export function nycComparableObservations(asset: RealEstateAssetInput, rows: SourceRow[], now: Date): RealEstateSourceObservation[] {
  const area = valuationArea(asset); const borough = BOROUGHS[(asset.municipality ?? '').toLowerCase()];
  if (!area || !borough || !asset.district) return [];
  const result: RealEstateSourceObservation[] = []; const seenParcels = new Set<string>();
  // One most recent eligible sale per parcel; repeated transfers cannot inflate evidence count.
  for (const row of [...rows].sort((a, b) => text(b.sale_date).localeCompare(text(a.sale_date)))) {
    const date = recentSale(row.sale_date, now); const price = num(row.sale_price);
    const block = text(row.block); const lot = text(row.lot);
    const sqft = num(area.basis === 'LAND' ? row.land_square_feet : row.gross_square_feet);
    const parcel = `${borough}:${block}:${lot}`;
    if (!date || !Number.isFinite(price) || price < 10_000 || !/^\d+$/.test(block) || !/^\d+$/.test(lot)
      || text(row.borough) !== borough || text(row.neighborhood).toUpperCase() !== asset.district.trim().toUpperCase()
      || !CLASSES[asset.propertyType]?.includes(text(row.building_class_at_time_of)) || text(row.ease_ment)
      || !comparableArea(sqft / SQFT_PER_M2, area.value) || seenParcels.has(parcel)) continue;
    if (asset.propertyType === 'HOUSE' && (num(row.residential_units) !== 1 || num(row.commercial_units) !== 0 || num(row.total_units) !== 1)) continue;
    if (asset.propertyType === 'LAND' && (num(row.gross_square_feet) !== 0 || num(row.total_units) !== 0)) continue;
    const subjectParcel = asset.parcelIdentifier?.replace(/[^0-9]/g, '');
    if (subjectParcel && subjectParcel === `${borough}${block.padStart(5, '0')}${lot.padStart(4, '0')}`) continue;
    seenParcels.add(parcel);
    const url = new URL(ENDPOINT);
    url.searchParams.set('$where', `borough=${literal(borough)} AND block=${literal(block)} AND lot=${literal(lot)} AND sale_date=${literal(text(row.sale_date))}`);
    result.push({ externalId: `${parcel}:${date}`, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT',
      sourceName: 'NYC Department of Finance Rolling Sales', sourceUrl: url.href, observedOn: date,
      amount: price, currency: 'USD', unitValue: price / sqft, unitCode: 'FT2', areaBasis: area.basis,
      countryCode: 'US', city: asset.city ?? 'New York City', district: asset.district, propertyType: asset.propertyType,
      limitations: 'Screened recorded sale; arm’s-length status, condition and title are not independently verified. Same borough/neighborhood and 0.5–2× area. Residential vacant land only for LAND; one-family dwellings only for HOUSE. No adjustment for condition or zoning.' });
  }
  return result;
}

export const nycTransactionAdapter: RealEstateEvidenceSourceAdapter = {
  id: 'us-nyc-qualified-sales', supportedCountries: ['US'], authority: 'GOVERNMENT', supportsAsset: isNewYorkCityAsset,
  async search(asset) {
    if (!CLASSES[asset.propertyType]) throw new Error('PROPERTY_TYPE_UNSUPPORTED');
    if (!valuationArea(asset)) throw new Error('AREA_REQUIRED');
    const borough = BOROUGHS[(asset.municipality ?? '').toLowerCase()];
    if (!borough || !asset.district?.trim() || BOROUGHS[asset.district.trim().toLowerCase()]) throw new Error('NYC_NEIGHBORHOOD_REQUIRED');
    const now = new Date();
    const where = `borough=${literal(borough)} AND neighborhood=${literal(asset.district.trim().toUpperCase())} AND building_class_at_time_of in(${CLASSES[asset.propertyType].map(literal).join(',')}) AND sale_price>=10000 AND sale_date>=${literal(recentCutoff(now))}`;
    const rows = await transactionRows(ENDPOINT, { $where: where, $order: 'sale_date DESC,block,lot', $limit: '200' });
    return nycComparableObservations(asset, rows, now);
  },
};
