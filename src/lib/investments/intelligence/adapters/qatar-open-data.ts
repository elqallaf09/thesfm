import 'server-only';
import { createHash } from 'node:crypto';
import type { RealEstateAssetInput } from '../real-estate';
import type { OfficialPropertyContext, OfficialPropertyLocation, OfficialPropertyRecord } from '../official-context';
import { dateOnly, normalized, object, QATAR_LICENSE, QATAR_PROVIDER_ID, QATAR_SOURCE, QATAR_SOURCE_NAME, readQatarPublicJson, rows, text, verifyQatarDataset } from './qatar-public-client';

const LOCATION_FIELDS = 'municipality_name,sm_lbldy,district_name,sm_lmntq';
const RECORD_FIELDS = `encrypted_transaction_number,registration_date,${LOCATION_FIELDS},property_type,nw_l_qr,usage,lstkhdm,area_square_meters,property_value,price_per_square_meter,number_of_shares_2400,share_area,share_value`;
const SAMPLE_LIMIT = 50;
function location(row: Record<string, unknown>): OfficialPropertyLocation | null {
  const municipality = text(row.municipality_name); const municipalityAr = text(row.sm_lbldy);
  const district = text(row.district_name); const districtAr = text(row.sm_lmntq);
  return municipality && district ? { municipality, municipalityAr, district, districtAr } : null;
}
function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER ? value : null;
}
function literal(value: string) { return JSON.stringify(value); }

export async function getQatarPropertyLocations(fetcher: typeof fetch = fetch): Promise<OfficialPropertyLocation[]> {
  await verifyQatarDataset(fetcher);
  const locations: OfficialPropertyLocation[] = [];
  const seen = new Set<string>();
  // The verified public API caps grouped total_count to the returned page.
  // Continue until a short page, not until that count appears exhausted.
  // A full final allowed page fails closed rather than truncating the directory.
  for (let offset = 0; offset < 500; offset += 100) {
    const data = object(await readQatarPublicJson('records', { select: LOCATION_FIELDS, group_by: LOCATION_FIELDS, order_by: LOCATION_FIELDS, limit: '100', offset: String(offset) }, fetcher));
    const batch = rows(data, 100);
    for (const row of batch) {
      const item = location(row); if (!item) continue;
      const key = `${item.municipality}\u0000${item.district}`;
      if (!seen.has(key)) { seen.add(key); locations.push(item); }
    }
    if (batch.length < 100) return locations;
  }
  throw new Error('SOURCE_DIRECTORY_TRUNCATED');
}

export function qatarContextUnavailable(): OfficialPropertyContext {
  return { providerId: QATAR_PROVIDER_ID, sourceName: QATAR_SOURCE_NAME, sourceUrl: QATAR_SOURCE,
    licenseName: 'CC BY 4.0', licenseUrl: QATAR_LICENSE, status: 'UNAVAILABLE', retrievedAt: null,
    metadataUpdatedAt: null, latestObservationOn: null, sampleTotal: null, sampleTruncated: false,
    records: [], valuationEligible: false, reasons: ['SOURCE_UNAVAILABLE'] };
}

/** Official rows are visible context, never automatic valuation inputs, even if newer rows arrive. */
export async function collectQatarPropertyContext(
  asset: RealEstateAssetInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OfficialPropertyContext> {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  if (asset.countryCode !== 'QA') throw new Error('UNSUPPORTED_COUNTRY');
  const verified = await verifyQatarDataset(fetcher);
  const latestData = await readQatarPublicJson('records', { select: 'max(registration_date) as last_date', limit: '1' }, fetcher);
  const latestObservationOn = dateOnly(rows(latestData, 1)[0]?.last_date);
  if (!latestObservationOn || latestObservationOn > now.toISOString().slice(0, 10)) throw new Error('SOURCE_DATE_INVALID');
  const report: OfficialPropertyContext = {
    providerId: QATAR_PROVIDER_ID, sourceName: QATAR_SOURCE_NAME, sourceUrl: QATAR_SOURCE,
    licenseName: 'CC BY 4.0', licenseUrl: QATAR_LICENSE,
    status: 'CONNECTED_REVIEW_REQUIRED', retrievedAt: now.toISOString(), ...verified,
    latestObservationOn, sampleTotal: null, sampleTruncated: false, records: [], valuationEligible: false,
    reasons: ['SOURCE_CLASSIFICATION_REVIEW', 'CURRENCY_METADATA_MISSING', 'NOT_A_PROPERTY_VALUATION'],
  };
  if (now.getTime() - Date.parse(`${latestObservationOn}T00:00:00Z`) > 180 * 86400000) report.reasons.push('STALE_OBSERVATIONS');
  const municipality = normalized(asset.municipality ?? asset.city).replace(/ municipality$/u, '');
  const district = normalized(asset.district);
  if (!municipality || !district) { report.status = 'INPUT_REQUIRED'; report.reasons.push('SELECT_OFFICIAL_LOCATION'); return report; }
  const locations = await getQatarPropertyLocations(fetcher);
  const selected = locations.filter(item => (normalized(item.municipality).replace(/ municipality$/u, '') === municipality || normalized(item.municipalityAr) === municipality)
    && (normalized(item.district) === district || normalized(item.districtAr) === district));
  if (selected.length !== 1) { report.status = 'INPUT_REQUIRED'; report.reasons.push('SELECT_OFFICIAL_LOCATION'); return report; }
  const chosen = selected[0];
  // Only verified public area labels enter the query; private addresses/IDs/prices never leave SFM.
  const where = `municipality_name=${literal(chosen.municipality)} AND district_name=${literal(chosen.district)}`;
  const data = object(await readQatarPublicJson('records', { select: RECORD_FIELDS, where, order_by: 'registration_date desc,encrypted_transaction_number', limit: String(SAMPLE_LIMIT) }, fetcher));
  report.sampleTotal = Number(data.total_count);
  report.sampleTruncated = report.sampleTotal > SAMPLE_LIMIT;
  const seen = new Set<string>();
  for (const row of rows(data, SAMPLE_LIMIT)) {
    const observedOn = dateOnly(row.registration_date);
    const itemLocation = location(row);
    const externalId = text(row.encrypted_transaction_number);
    if (!observedOn || observedOn > now.toISOString().slice(0, 10) || !externalId || !itemLocation
      || normalized(itemLocation.municipality) !== normalized(chosen.municipality) || normalized(itemLocation.district) !== normalized(chosen.district)) continue;
    // Distinct records inside a transaction may exist. This conservative public context sample
    // deduplicates transaction IDs rather than presenting repeated sales as independent evidence.
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    const sourceUrl = new URL(`${QATAR_SOURCE}table/`);
    sourceUrl.searchParams.set('refine.encrypted_transaction_number', externalId);
    const areaM2 = positive(row.area_square_meters); const reportedValue = positive(row.property_value);
    const record: OfficialPropertyRecord = {
      ...itemLocation, id: createHash('sha256').update(`${QATAR_PROVIDER_ID}:${externalId}`).digest('hex'),
      observedOn, propertyType: text(row.property_type), propertyTypeAr: text(row.nw_l_qr),
      usage: text(row.usage) || null, usageAr: text(row.lstkhdm) || null,
      areaM2, reportedValue, reportedPricePerM2: positive(row.price_per_square_meter), currency: null,
      fullOwnership: row.number_of_shares_2400 === 2400 && areaM2 !== null && row.share_area === areaM2 && reportedValue !== null && row.share_value === reportedValue,
      sourceUrl: sourceUrl.href,
    };
    report.records.push(record);
  }
  if (report.records.length === 0) report.reasons.push('NO_LOCAL_RECORDS');
  if (report.sampleTruncated) report.reasons.push('PARTIAL_SAMPLE');
  return report;
}
