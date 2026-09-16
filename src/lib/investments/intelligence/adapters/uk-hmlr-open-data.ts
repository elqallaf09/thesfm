import 'server-only';
import { createHash } from 'node:crypto';
import type { RealEstateAssetInput } from '../real-estate';
import type { OfficialPropertyContext, OfficialPropertyRecord } from '../official-context';

const ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';
const SOURCE = 'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads';
const LICENSE = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';
const PROVIDER_ID = 'uk-hmlr-price-paid';
const SOURCE_NAME = 'HM Land Registry Price Paid Data';
const LIMIT = 50;
const MAX_BYTES = 1_500_000;

function sparqlLiteral(value: string): string {
  return JSON.stringify(value.trim().toUpperCase());
}
function binding(row: Record<string, unknown>, key: string): string | null {
  const item = row[key];
  if (!item || typeof item !== 'object') return null;
  const value = (item as { value?: unknown }).value;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function finitePositive(value: string | null): number | null {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function isoDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}
function propertyType(value: string | null): string {
  if (!value) return 'UNKNOWN';
  const tail = decodeURIComponent(value.split('/').pop() ?? value).replace(/([a-z])([A-Z])/g, '$1 $2');
  return tail.replace(/[-_]+/g, ' ').trim().toUpperCase();
}
async function queryHmlr(query: string, fetcher: typeof fetch): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const body = new URLSearchParams({ query, output: 'json' });
    const response = await fetcher(ENDPOINT, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/sparql-results+json, application/json;q=0.9', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    });
    if (!response.ok) throw new Error('SOURCE_HTTP_ERROR');
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('SOURCE_SCHEMA_INVALID');
    const results = (parsed as { results?: { bindings?: unknown } }).results?.bindings;
    if (!Array.isArray(results)) throw new Error('SOURCE_SCHEMA_INVALID');
    return results.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
  } finally { clearTimeout(timeout); }
}

export function ukHmlrContextUnavailable(): OfficialPropertyContext {
  return { providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'Open Government Licence v3.0', licenseUrl: LICENSE,
    status: 'UNAVAILABLE', retrievedAt: null, metadataUpdatedAt: null, latestObservationOn: null, sampleTotal: null, sampleTruncated: false,
    records: [], valuationEligible: false, reasons: ['SOURCE_UNAVAILABLE'] };
}

/**
 * Price Paid Data is authoritative sale-price context but has no dependable floor/land area.
 * It therefore remains outside the valuation engine until an independently licensed area source
 * can be matched at property level with deterministic confidence.
 */
export async function collectUkHmlrPropertyContext(
  asset: RealEstateAssetInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OfficialPropertyContext> {
  if (asset.countryCode !== 'GB') throw new Error('UNSUPPORTED_COUNTRY');
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  const district = (asset.district ?? '').trim();
  const city = (asset.city ?? asset.municipality ?? '').trim();
  const region = (asset.region ?? '').trim().toLowerCase();
  if (/scotland|northern ireland/.test(region)) {
    return { ...ukHmlrContextUnavailable(), status: 'INPUT_REQUIRED', reasons: ['ENGLAND_WALES_ONLY'] };
  }
  if (!district && !city) {
    return { providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'Open Government Licence v3.0', licenseUrl: LICENSE,
      status: 'INPUT_REQUIRED', retrievedAt: now.toISOString(), metadataUpdatedAt: null, latestObservationOn: null, sampleTotal: null, sampleTruncated: false,
      records: [], valuationEligible: false, reasons: ['ENTER_CITY_OR_DISTRICT', 'AREA_METADATA_MISSING', 'NOT_A_PROPERTY_VALUATION'] };
  }

  const locationFilter = district
    ? `?addr lrcommon:district ?district . FILTER(UCASE(STR(?district)) = ${sparqlLiteral(district)})`
    : `?addr lrcommon:town ?town . FILTER(UCASE(STR(?town)) = ${sparqlLiteral(city)})`;
  const query = `
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
SELECT ?transaction ?amount ?date ?propertyType ?estateType ?postcode ?town ?district ?county ?paon ?saon ?street
WHERE {
  ?transaction a lrppi:TransactionRecord ;
    lrppi:pricePaid ?amount ;
    lrppi:transactionDate ?date ;
    lrppi:propertyAddress ?addr .
  OPTIONAL { ?transaction lrppi:propertyType ?propertyType }
  OPTIONAL { ?transaction lrppi:estateType ?estateType }
  ${locationFilter}
  OPTIONAL { ?addr lrcommon:postcode ?postcode }
  OPTIONAL { ?addr lrcommon:town ?town }
  OPTIONAL { ?addr lrcommon:district ?district }
  OPTIONAL { ?addr lrcommon:county ?county }
  OPTIONAL { ?addr lrcommon:paon ?paon }
  OPTIONAL { ?addr lrcommon:saon ?saon }
  OPTIONAL { ?addr lrcommon:street ?street }
}
ORDER BY DESC(?date)
LIMIT ${LIMIT + 1}`;
  const rows = await queryHmlr(query, fetcher);
  const records: OfficialPropertyRecord[] = [];
  const seen = new Set<string>();
  for (const row of rows.slice(0, LIMIT)) {
    const transaction = binding(row, 'transaction');
    const observedOn = isoDate(binding(row, 'date'));
    const reportedValue = finitePositive(binding(row, 'amount'));
    if (!transaction || !observedOn || observedOn > now.toISOString().slice(0, 10) || !reportedValue || seen.has(transaction)) continue;
    seen.add(transaction);
    const town = binding(row, 'town') ?? city;
    const rowDistrict = binding(row, 'district') ?? district;
    const sourceUrl = transaction.replace(/^http:/, 'https:');
    records.push({
      id: createHash('sha256').update(`${PROVIDER_ID}:${transaction}`).digest('hex'),
      observedOn, propertyType: propertyType(binding(row, 'propertyType')), propertyTypeAr: '', usage: binding(row, 'estateType'), usageAr: null,
      municipality: town, municipalityAr: '', district: rowDistrict, districtAr: '',
      areaM2: null, reportedValue, reportedPricePerM2: null, currency: 'GBP', fullOwnership: false, sourceUrl,
    });
  }
  const latestObservationOn = records.map(record => record.observedOn).sort().at(-1) ?? null;
  return {
    providerId: PROVIDER_ID, sourceName: SOURCE_NAME, sourceUrl: SOURCE, licenseName: 'Open Government Licence v3.0', licenseUrl: LICENSE,
    status: 'CONNECTED_REVIEW_REQUIRED', retrievedAt: now.toISOString(), metadataUpdatedAt: null, latestObservationOn,
    sampleTotal: rows.length > LIMIT ? null : records.length, sampleTruncated: rows.length > LIMIT, records, valuationEligible: false,
    reasons: ['AREA_METADATA_MISSING', 'ADDRESS_RIGHTS_CONDITIONS', 'REGISTRATION_LAG', 'NOT_A_PROPERTY_VALUATION', ...(records.length ? [] : ['NO_LOCAL_RECORDS'])],
  };
}
