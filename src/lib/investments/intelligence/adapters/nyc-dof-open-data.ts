import 'server-only';
import { createHash } from 'node:crypto';
import type { RealEstateAssetInput } from '../real-estate';
import type { OfficialPropertyContext, OfficialPropertyRecord } from '../official-context';

const ENDPOINT = 'https://data.cityofnewyork.us/resource/usep-8jbt.json';
const SOURCE = 'https://data.cityofnewyork.us/dataset/NYC-Citywide-Rolling-Calendar-Sales/usep-8jbt';
const LICENSE = 'https://data.cityofnewyork.us/stories/s/Terms-of-Use/k9k7-3cje/';
const PROVIDER_ID = 'us-nyc-dof-rolling-sales';
const SOURCE_NAME = 'NYC Department of Finance · Citywide Rolling Calendar Sales';
const LIMIT = 50;
const SQFT_PER_SQM = 10.76391041671;
const BOROUGHS: Record<string, string> = { manhattan: '1', bronx: '2', brooklyn: '3', queens: '4', 'staten island': '5' };

function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function positive(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/,/g, '')) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}
function dateOnly(value: unknown): string | null {
  const raw = text(value); if (!raw) return null;
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/); return match ? match[0] : null;
}
function soqlLiteral(value: string): string { return `'${value.replace(/'/g, "''")}'`; }
function areaFor(asset: RealEstateAssetInput, row: Record<string, unknown>): number | null {
  const sqft = asset.propertyType === 'LAND' ? positive(row.land_square_feet) : positive(row.gross_square_feet) ?? positive(row.land_square_feet);
  return sqft ? sqft / SQFT_PER_SQM : null;
}
function propertyType(row: Record<string, unknown>): string { return text(row.building_class_category) ?? text(row.building_class_at_time_of) ?? 'UNKNOWN'; }

export function nycContextUnavailable(): OfficialPropertyContext {
  return { providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'NYC Open Data Terms of Use', licenseUrl: LICENSE,
    status: 'UNAVAILABLE', retrievedAt: null, metadataUpdatedAt: null, latestObservationOn: null, sampleTotal: null, sampleTruncated: false,
    records: [], valuationEligible: false, reasons: ['SOURCE_UNAVAILABLE'] };
}

export function isNewYorkCityAsset(asset: RealEstateAssetInput): boolean {
  if (asset.countryCode !== 'US') return false;
  const state = (asset.region ?? '').trim().toLowerCase();
  const city = (asset.city ?? asset.municipality ?? '').trim().toLowerCase();
  const district = (asset.district ?? '').trim().toLowerCase();
  // A state alone does not identify NYC (e.g. Buffalo, NY is outside this dataset).
  return (!state || state === 'ny' || state === 'new york')
    && (city === 'new york' || city === 'new york city' || (!city && Object.hasOwn(BOROUGHS, district)));
}

/** Rolling sales are authoritative public-sale context, not automatic current-value evidence. */
export async function collectNycPropertyContext(
  asset: RealEstateAssetInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OfficialPropertyContext> {
  if (!isNewYorkCityAsset(asset)) throw new Error('UNSUPPORTED_JURISDICTION');
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  const districtRaw = (asset.district ?? '').trim();
  if (!districtRaw) {
    return { providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'NYC Open Data Terms of Use', licenseUrl: LICENSE,
      status: 'INPUT_REQUIRED', retrievedAt: now.toISOString(), metadataUpdatedAt: null, latestObservationOn: null, sampleTotal: null, sampleTruncated: false,
      records: [], valuationEligible: false, reasons: ['ENTER_BOROUGH_OR_NEIGHBORHOOD', 'NON_MARKET_SALES_REQUIRE_FILTERING', 'NOT_A_PROPERTY_VALUATION'] };
  }
  const district = districtRaw.toLowerCase();
  const boroughCode = BOROUGHS[district];
  const where = boroughCode ? `borough=${soqlLiteral(boroughCode)}` : `neighborhood=${soqlLiteral(districtRaw.toUpperCase())}`;
  const select = ['borough','neighborhood','building_class_category','block','lot','address','apartment_number','zip_code','land_square_feet','gross_square_feet','building_class_at_time_of','sale_price','sale_date'].join(',');
  const url = new URL(ENDPOINT);
  url.searchParams.set('$select', select);
  url.searchParams.set('$where', `${where} AND sale_price > 0`);
  url.searchParams.set('$order', 'sale_date DESC');
  url.searchParams.set('$limit', String(LIMIT + 1));
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10_000);
  let rows: unknown;
  try {
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    const body = await response.text(); if (body.length > 1_500_000) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    rows = JSON.parse(body);
  } finally { clearTimeout(timeout); }
  if (!Array.isArray(rows)) throw new Error('SOURCE_SCHEMA_INVALID');
  const records: OfficialPropertyRecord[] = [];
  const seen = new Set<string>();
  for (const raw of rows.slice(0, LIMIT)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const saleDate = dateOnly(row.sale_date); const salePrice = positive(row.sale_price);
    const block = text(row.block); const lotRaw = row.lot; const lot = text(lotRaw) ?? (typeof lotRaw === 'number' ? String(lotRaw) : null); const address = text(row.address);
    if (!saleDate || saleDate > now.toISOString().slice(0, 10) || !salePrice || !block || !lot) continue;
    const identity = `${text(row.borough) ?? ''}:${block}:${lot}:${saleDate}:${salePrice}:${address ?? ''}`;
    if (seen.has(identity)) continue; seen.add(identity);
    const areaM2 = areaFor(asset, row);
    const neighborhood = text(row.neighborhood) ?? districtRaw;
    const sourceUrl = new URL(SOURCE); sourceUrl.searchParams.set('refine', `${block}-${lot}`);
    records.push({
      id: createHash('sha256').update(`${PROVIDER_ID}:${identity}`).digest('hex'), observedOn: saleDate,
      municipality: 'New York City', municipalityAr: '', district: neighborhood, districtAr: '',
      propertyType: propertyType(row), propertyTypeAr: '', usage: text(row.building_class_at_time_of), usageAr: null,
      areaM2, reportedValue: salePrice, reportedPricePerM2: areaM2 ? salePrice / areaM2 : null,
      currency: 'USD', fullOwnership: false, sourceUrl: sourceUrl.href,
    });
  }
  const latestObservationOn = records.map(record => record.observedOn).sort().at(-1) ?? null;
  return {
    providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'NYC Open Data Terms of Use', licenseUrl: LICENSE,
    status: 'CONNECTED_REVIEW_REQUIRED', retrievedAt: now.toISOString(), metadataUpdatedAt: null, latestObservationOn,
    sampleTotal: rows.length > LIMIT ? null : records.length, sampleTruncated: rows.length > LIMIT, records, valuationEligible: false,
    reasons: ['NON_MARKET_SALES_REQUIRE_FILTERING', 'BUILDING_CLASS_MAPPING_REVIEW', 'NOT_A_PROPERTY_VALUATION', ...(records.length ? [] : ['NO_LOCAL_RECORDS'])],
  };
}
