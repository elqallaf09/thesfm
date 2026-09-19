import 'server-only';
import type { RealEstateEvidenceSourceAdapter, RealEstateSourceObservation } from '../sources';
import { valuationArea, type RealEstateAssetInput } from '../real-estate';
import { isChicagoCookCountyAsset } from './cook-county-open-data';
import { comparableArea, literal, recentCutoff, recentSale, sourceFalse, sourceNumber as num, sourceText as text, transactionRows, type SourceRow } from './transaction-data';

const SALES = 'https://datacatalog.cookcountyil.gov/resource/wvhk-k5uv.json';
const CHARACTERISTICS = 'https://datacatalog.cookcountyil.gov/resource/x54s-btds.json';
const HOUSE_CLASSES = ['202', '203', '204', '205', '206', '207', '208', '209'];
const salesFields = 'pin,year,nbhd,class,township_code,sale_date,sale_price,doc_no,is_multisale,num_parcels_sale,sale_filter_same_sale_within_365,sale_filter_less_than_10k,sale_filter_deed_type';
const propertyFields = 'pin,year,class,char_bldg_sf,pin_is_multicard,pin_num_cards,tieback_proration_rate,card_proration_rate,char_ncu,char_use';

export function cookComparableObservations(asset: RealEstateAssetInput, sales: SourceRow[], characteristics: SourceRow[], now: Date): RealEstateSourceObservation[] {
  const area = valuationArea(asset);
  if (asset.propertyType !== 'HOUSE' || !area || !/^7[0-7]\d{3}$/.test(asset.district ?? '')) return [];
  const byParcelYear = new Map<string, SourceRow[]>();
  for (const row of characteristics) {
    const key = `${text(row.pin)}:${num(row.year)}`;
    byParcelYear.set(key, [...(byParcelYear.get(key) ?? []), row]);
  }
  const results: RealEstateSourceObservation[] = []; const seen = new Set<string>();
  for (const sale of [...sales].sort((a, b) => text(b.sale_date).localeCompare(text(a.sale_date)))) {
    const pin = text(sale.pin); const date = recentSale(sale.sale_date, now); const price = num(sale.sale_price); const doc = text(sale.doc_no);
    if (!/^\d{14}$/.test(pin) || !date || !/^\d+$/.test(doc) || seen.has(pin) || pin === asset.parcelIdentifier?.replace(/\D/g, '')
      || !Number.isFinite(price) || price < 10_000 || text(sale.nbhd) !== asset.district || text(sale.township_code) !== asset.district.slice(0, 2)
      || !HOUSE_CLASSES.includes(text(sale.class)) || !sourceFalse(sale.is_multisale) || num(sale.num_parcels_sale) !== 1
      || !sourceFalse(sale.sale_filter_same_sale_within_365) || !sourceFalse(sale.sale_filter_less_than_10k) || !sourceFalse(sale.sale_filter_deed_type)) continue;
    // Join the exact sale-year assessment. No current-year replacement or summed multi-building area.
    const matches = byParcelYear.get(`${pin}:${Number(date.slice(0, 4))}`) ?? [];
    if (matches.length !== 1) continue;
    const property = matches[0]; const sqft = num(property.char_bldg_sf);
    if (text(property.class) !== text(sale.class) || !sourceFalse(property.pin_is_multicard) || num(property.pin_num_cards) !== 1
      || num(property.tieback_proration_rate) !== 1 || num(property.char_ncu) !== 0 || text(property.char_use) !== 'Single-Family'
      || !comparableArea(sqft / 10.76391041671, area.value)) continue;
    seen.add(pin);
    const url = new URL(SALES); url.searchParams.set('$select', salesFields); url.searchParams.set('$where', `pin=${literal(pin)} AND doc_no=${literal(doc)}`);
    results.push({ externalId: `${pin}:${doc}`, evidenceType: 'OFFICIAL_TRANSACTION', authority: 'GOVERNMENT',
      sourceName: 'Cook County Assessor Sales + Improvement Characteristics', sourceUrl: url.href, observedOn: date,
      amount: price, currency: 'USD', unitValue: price / sqft, unitCode: 'FT2', areaBasis: 'BUILT', countryCode: 'US',
      city: asset.city ?? 'Chicago', district: asset.district, propertyType: 'HOUSE',
      limitations: `Same assessor neighborhood; single parcel/building; official sales filters applied. Area joined by PIN and sale year (${date.slice(0, 4)}) from https://datacatalog.cookcountyil.gov/d/x54s-btds. Reporting lag and possible non-arm’s-length transfers remain; condition is not adjusted.` });
  }
  return results;
}

export const cookTransactionAdapter: RealEstateEvidenceSourceAdapter = {
  id: 'us-cook-qualified-sales', supportedCountries: ['US'], authority: 'GOVERNMENT', supportsAsset: isChicagoCookCountyAsset,
  async search(asset) {
    if (asset.propertyType !== 'HOUSE') throw new Error('PROPERTY_TYPE_UNSUPPORTED');
    if (!valuationArea(asset)) throw new Error('AREA_REQUIRED');
    if (!/^7[0-7]\d{3}$/.test(asset.district ?? '')) throw new Error('COOK_NEIGHBORHOOD_REQUIRED');
    const now = new Date();
    const sales = await transactionRows(SALES, { $select: salesFields, $where: `nbhd=${literal(asset.district!)} AND class in(${HOUSE_CLASSES.map(literal).join(',')}) AND sale_date>=${literal(recentCutoff(now))} AND sale_filter_less_than_10k=false AND sale_filter_deed_type=false AND sale_filter_same_sale_within_365=false AND is_multisale=false AND num_parcels_sale=1`, $order: 'sale_date DESC,pin,doc_no', $limit: '200' });
    const pins = [...new Set(sales.map(row => text(row.pin)).filter(pin => /^\d{14}$/.test(pin)))];
    if (!pins.length) return [];
    // Batches bound URL size, memory and provider work; omit owner/buyer/seller fields.
    const batches: Array<Promise<SourceRow[]>> = [];
    for (let start = 0; start < pins.length; start += 50) {
      batches.push(transactionRows(CHARACTERISTICS, { $select: propertyFields,
        $where: `pin in(${pins.slice(start, start + 50).map(literal).join(',')}) AND year>=${now.getUTCFullYear() - 1} AND year<=${now.getUTCFullYear()}`,
        $order: 'pin,year', $limit: '400' }));
    }
    const characteristics = (await Promise.all(batches)).flat();
    return cookComparableObservations(asset, sales, characteristics, now);
  },
};
