import 'server-only';
import { createHash } from 'node:crypto';
import type { RealEstateAssetInput } from '../real-estate';
import type { OfficialPropertyContext, OfficialPropertyRecord } from '../official-context';

const ENDPOINT = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_sales_parcels/MapServer/0/query';
const SOURCE = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_sales_parcels/MapServer/0';
const LICENSE_SOURCE = 'https://assessor.lacounty.gov/';
const PROVIDER_ID = 'us-ca-la-assessor-recent-sales';
const SOURCE_NAME = 'Los Angeles County Assessor Recent Sales';
const MAX_BYTES = 250_000;
const FETCH_TIMEOUT_MS = 5_000;

const USE_TYPE_LABELS: Record<string, string> = {
  'C/I': 'Commercial / Industrial',
  CND: 'Condominium',
  OTH: 'Other',
  'R-I': 'Multiple Family Residence',
  SFR: 'Single Family Residence',
  VAC: 'Vacant Land',
};

type LaSaleAttributes = {
  OBJECTID?: unknown;
  AIN?: unknown;
  FORMATTED_AIN?: unknown;
  SALEDATE?: unknown;
  FORMATTED_SALEDATE?: unknown;
  SALEPRICE?: unknown;
  FORMATTED_SALEPRICE?: unknown;
  YEARBUILT?: unknown;
  USECODE?: unknown;
  USETYPE?: unknown;
};

type ArcGisFeature = { attributes?: LaSaleAttributes };
type ArcGisResponse = {
  features?: unknown;
  error?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function positive(value: unknown): number | null {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeLaCountyAin(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D+/g, '');
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function isLosAngelesCountyAsset(asset: RealEstateAssetInput): boolean {
  if (asset.countryCode !== 'US') return false;
  const region = normalize(asset.region);
  if (region && region !== 'ca' && region !== 'california') return false;

  const locations = [asset.city, asset.municipality, asset.district].map(normalize).filter(Boolean);
  return locations.some(location => location === 'los angeles' || location === 'los angeles county');
}

function inputRequired(): OfficialPropertyContext {
  return {
    providerId: PROVIDER_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE,
    licenseName: 'Los Angeles County Assessor public property information',
    licenseUrl: LICENSE_SOURCE,
    status: 'INPUT_REQUIRED',
    retrievedAt: null,
    metadataUpdatedAt: null,
    latestObservationOn: null,
    sampleTotal: null,
    sampleTruncated: false,
    records: [],
    valuationEligible: false,
    reasons: ['VALID_10_DIGIT_AIN_REQUIRED', 'NOT_A_PROPERTY_VALUATION'],
  };
}

export function laCountyContextUnavailable(): OfficialPropertyContext {
  return {
    providerId: PROVIDER_ID,
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE,
    licenseName: 'Los Angeles County Assessor public property information',
    licenseUrl: LICENSE_SOURCE,
    status: 'UNAVAILABLE',
    retrievedAt: null,
    metadataUpdatedAt: null,
    latestObservationOn: null,
    sampleTotal: null,
    sampleTruncated: false,
    records: [],
    valuationEligible: false,
    reasons: ['SOURCE_UNAVAILABLE', 'NOT_A_PROPERTY_VALUATION'],
  };
}

function isoDate(attributes: LaSaleAttributes): string | null {
  const rawMillis = positive(attributes.SALEDATE);
  if (rawMillis !== null) {
    const parsed = new Date(rawMillis);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const formatted = text(attributes.FORMATTED_SALEDATE);
  const match = formatted?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function propertyType(attributes: LaSaleAttributes): string {
  const useType = text(attributes.USETYPE);
  return useType ? (USE_TYPE_LABELS[useType] ?? `Assessor use type ${useType}`) : 'UNKNOWN';
}

async function fetchSaleByAin(ain: string, fetcher: typeof fetch): Promise<LaSaleAttributes[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('f', 'json');
  url.searchParams.set('where', `AIN='${ain}'`);
  url.searchParams.set('outFields', 'OBJECTID,AIN,FORMATTED_AIN,SALEDATE,FORMATTED_SALEDATE,SALEPRICE,FORMATTED_SALEPRICE,YEARBUILT,USECODE,USETYPE');
  url.searchParams.set('returnGeometry', 'false');
  url.searchParams.set('resultRecordCount', '2');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('SOURCE_SCHEMA_INVALID');
    const payload = parsed as ArcGisResponse;
    if (payload.error || !Array.isArray(payload.features)) throw new Error('SOURCE_SCHEMA_INVALID');

    return payload.features
      .filter((feature): feature is ArcGisFeature => Boolean(feature && typeof feature === 'object' && !Array.isArray(feature)))
      .map(feature => feature.attributes)
      .filter((attributes): attributes is LaSaleAttributes => Boolean(attributes && typeof attributes === 'object'));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * LA County publishes recent-sale parcel context for the prior ~24 months.
 * The Assessor explicitly describes the displayed records as unverified
 * single-parcel sales and notes that indicated prices can be derived from DTT.
 * Consequently these rows are official context only and are never valuation
 * evidence or automatic price-per-area comparables.
 */
export async function collectLaCountyPropertyContext(
  asset: RealEstateAssetInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OfficialPropertyContext> {
  if (!isLosAngelesCountyAsset(asset)) throw new Error('UNSUPPORTED_JURISDICTION');
  const ain = normalizeLaCountyAin(asset.parcelIdentifier);
  if (!ain) return inputRequired();

  const rows = await fetchSaleByAin(ain, dependencies.fetcher ?? fetch);
  const records: OfficialPropertyRecord[] = [];

  for (const attributes of rows) {
    if (normalizeLaCountyAin(attributes.AIN) !== ain) continue;
    const observedOn = isoDate(attributes);
    const reportedValue = positive(attributes.SALEPRICE);
    if (!observedOn || reportedValue === null) continue;

    const objectId = positive(attributes.OBJECTID);
    const stableKey = objectId !== null ? String(objectId) : `${ain}:${observedOn}:${reportedValue}`;
    records.push({
      id: createHash('sha256').update(`${PROVIDER_ID}:${stableKey}`).digest('hex'),
      observedOn,
      propertyType: propertyType(attributes),
      propertyTypeAr: '',
      usage: text(attributes.USECODE),
      usageAr: null,
      municipality: 'Los Angeles County',
      municipalityAr: '',
      district: '',
      districtAr: '',
      // SIZE is intentionally not mapped until the source semantics are
      // documented well enough to distinguish land and building area.
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
    licenseName: 'Los Angeles County Assessor public property information',
    licenseUrl: LICENSE_SOURCE,
    status: 'CONNECTED_REVIEW_REQUIRED',
    retrievedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    metadataUpdatedAt: null,
    latestObservationOn,
    sampleTotal: records.length,
    sampleTruncated: rows.length > records.length,
    records,
    valuationEligible: false,
    reasons: [
      'UNVERIFIED_SINGLE_PARCEL_SALE',
      'INDICATED_SALE_PRICE_MAY_BE_DTT_DERIVED',
      'AREA_SEMANTICS_NOT_VERIFIED',
      'RECENT_SALES_WINDOW_APPROX_24_MONTHS',
      'NOT_A_PROPERTY_VALUATION',
      ...(records.length ? [] : ['NO_RECENT_SALE_RECORD']),
    ],
  };
}
