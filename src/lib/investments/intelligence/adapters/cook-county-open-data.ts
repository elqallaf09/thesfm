import 'server-only';
import { createHash } from 'node:crypto';
import type { RealEstateAssetInput } from '../real-estate';
import type { OfficialPropertyContext, OfficialPropertyRecord } from '../official-context';

const ENDPOINT = 'https://datacatalog.cookcountyil.gov/resource/wvhk-k5uv.json';
const SOURCE = 'https://datacatalog.cookcountyil.gov/d/wvhk-k5uv';
const PROVIDER_ID = 'us-il-cook-assessor-sales';
const SOURCE_NAME = 'Cook County Assessor Parcel Sales';
const LIMIT = 50;
const MAX_BYTES = 1_500_000;
const CHICAGO_TOWNSHIPS = ['70', '71', '72', '73', '74', '75', '76', '77'] as const;

type CookSaleRow = {
  pin?: unknown;
  township_code?: unknown;
  class?: unknown;
  sale_date?: unknown;
  sale_price?: unknown;
  doc_no?: unknown;
  deed_type?: unknown;
  is_multisale?: unknown;
  num_parcels_sale?: unknown;
  sale_type?: unknown;
  sale_filter_same_sale_within_365?: unknown;
  sale_filter_less_than_10k?: unknown;
  sale_filter_deed_type?: unknown;
  row_id?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function positive(value: unknown): number | null {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}
function booleanValue(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return null;
}
function isoDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}
function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function isChicagoCookCountyAsset(asset: RealEstateAssetInput): boolean {
  if (asset.countryCode !== 'US') return false;
  const region = normalize(asset.region);
  const city = normalize(asset.city ?? asset.municipality);
  return (region === 'il' || region === 'illinois' || !region)
    && (city === 'chicago' || city === 'city of chicago');
}

export function cookCountyContextUnavailable(): OfficialPropertyContext {
  return {
    providerId: PROVIDER_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE,
    licenseName: 'Cook County Open Data public access',
    licenseUrl: 'https://datacatalog.cookcountyil.gov/',
    status: 'UNAVAILABLE',
    retrievedAt: null,
    metadataUpdatedAt: null,
    latestObservationOn: null,
    sampleTotal: null,
    sampleTruncated: false,
    records: [],
    valuationEligible: false,
    reasons: ['SOURCE_UNAVAILABLE'],
  };
}

function eligibleRow(row: CookSaleRow): boolean {
  const township = text(row.township_code);
  const salePrice = positive(row.sale_price);
  if (!township || !CHICAGO_TOWNSHIPS.includes(township as (typeof CHICAGO_TOWNSHIPS)[number])) return false;
  if (salePrice === null || salePrice < 10_000) return false;
  if (booleanValue(row.sale_filter_less_than_10k) !== false) return false;
  if (booleanValue(row.sale_filter_deed_type) !== false) return false;
  if (booleanValue(row.sale_filter_same_sale_within_365) !== false) return false;
  if (booleanValue(row.is_multisale) !== false) return false;
  if (positive(row.num_parcels_sale) !== 1) return false;
  return Boolean(isoDate(row.sale_date));
}

async function fetchCookSales(fetcher: typeof fetch): Promise<CookSaleRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const townships = CHICAGO_TOWNSHIPS.map(code => `'${code}'`).join(',');
  const url = new URL(ENDPOINT);
  url.searchParams.set('$select', 'pin,township_code,class,sale_date,sale_price,doc_no,deed_type,is_multisale,num_parcels_sale,sale_type,sale_filter_same_sale_within_365,sale_filter_less_than_10k,sale_filter_deed_type,row_id');
  url.searchParams.set('$where', `township_code in(${townships}) AND sale_filter_less_than_10k=false AND sale_filter_deed_type=false AND sale_filter_same_sale_within_365=false AND is_multisale=false AND num_parcels_sale=1`);
  url.searchParams.set('$order', 'sale_date DESC');
  url.searchParams.set('$limit', String(LIMIT + 1));
  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('SOURCE_HTTP_ERROR');
    const body = await response.text();
    if (body.length > MAX_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const parsed: unknown = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error('SOURCE_SCHEMA_INVALID');
    return parsed.filter((row): row is CookSaleRow => Boolean(row && typeof row === 'object'));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Cook County Parcel Sales is official transaction context. The Assessor warns
 * that reporting can lag and that non-arm's-length transfers can remain even
 * after its published filters. This adapter therefore stays outside valuation
 * evidence until parcel characteristics/area and comparability are joined and
 * independently validated.
 */
export async function collectCookCountyPropertyContext(
  asset: RealEstateAssetInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OfficialPropertyContext> {
  if (!isChicagoCookCountyAsset(asset)) throw new Error('UNSUPPORTED_JURISDICTION');
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  const rows = await fetchCookSales(fetcher);
  const records: OfficialPropertyRecord[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(0, LIMIT)) {
    if (!eligibleRow(row)) continue;
    const observedOn = isoDate(row.sale_date);
    const reportedValue = positive(row.sale_price);
    const idSource = text(row.row_id) ?? `${text(row.pin) ?? 'unknown'}:${text(row.doc_no) ?? observedOn}`;
    if (!observedOn || !reportedValue || seen.has(idSource)) continue;
    seen.add(idSource);
    const classCode = text(row.class);
    const township = text(row.township_code);
    records.push({
      id: createHash('sha256').update(`${PROVIDER_ID}:${idSource}`).digest('hex'),
      observedOn,
      propertyType: classCode ? `ASSESSOR CLASS ${classCode}` : 'UNKNOWN',
      propertyTypeAr: '',
      usage: text(row.sale_type) ?? text(row.deed_type),
      usageAr: null,
      municipality: 'Chicago',
      municipalityAr: '',
      district: township ? `Assessor township ${township}` : '',
      districtAr: '',
      areaM2: null,
      reportedValue,
      reportedPricePerM2: null,
      currency: 'USD',
      fullOwnership: false,
      sourceUrl: SOURCE,
    });
  }

  const latestObservationOn = records.map(record => record.observedOn).sort().at(-1) ?? null;
  return {
    providerId: PROVIDER_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE,
    licenseName: 'Cook County Open Data public access',
    licenseUrl: 'https://datacatalog.cookcountyil.gov/',
    status: 'CONNECTED_REVIEW_REQUIRED',
    retrievedAt: now.toISOString(),
    // We do not hard-code the catalog metadata timestamp. If/when we add a
    // bounded metadata call, this field can be populated from the live source.
    metadataUpdatedAt: null,
    latestObservationOn,
    sampleTotal: rows.length > LIMIT ? null : records.length,
    sampleTruncated: rows.length > LIMIT,
    records,
    valuationEligible: false,
    reasons: [
      'AREA_METADATA_MISSING',
      'NON_ARMS_LENGTH_SALES_REQUIRE_REVIEW',
      'SALES_REPORTING_LAG',
      'NOT_A_PROPERTY_VALUATION',
      ...(records.length ? [] : ['NO_LOCAL_RECORDS']),
    ],
  };
}
