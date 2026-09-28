import 'server-only';

import {
  normalizeCanonicalUrl,
  safeFetchText,
  sanitizeExternalText,
} from '../security';
import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
  type FinancialNewsProvider,
  type NewsFetchParams,
  type NewsSearchParams,
  type NormalizedNewsItem,
  type ProviderRateLimitState,
} from '../types';
import {
  asProviderError,
  clampProviderLimit,
  deduplicateProviderItems,
  itemMatchesQuery,
  itemWithinDateRange,
  normalizeProviderTitle,
  ProviderRuntimeState,
  validateDateRange,
} from './shared';

const PROVIDER_ID = 'official-dfm-disclosures';
const PROVIDER_NAME = 'Dubai Financial Market — Disclosures';
const DFM_EFSAH_ENDPOINT = new URL('https://api2.dfm.ae/efsah/v1/prototype_efsah');
const DFM_DOCUMENTS_ORIGIN = 'https://feeds.dfm.ae';
const DFM_DOCUMENTS_PATH = '/documents';
const DFM_UTC_OFFSET_MS = 4 * 60 * 60 * 1_000;
const MAX_RESOURCE_PATH_LENGTH = 1_500;
const MAX_RESOURCE_PATH_SEGMENTS = 8;
const SUPPORTED_MARKETS = ['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm'];

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

type DfmEfsahResource = {
  description?: unknown;
  r_path?: unknown;
};

type DfmEfsahRecord = {
  id?: unknown;
  publication_date?: unknown;
  headline?: unknown;
  issuer_symbol?: unknown;
  issuer?: unknown;
  resources?: unknown;
};

function overlap(requested: string[] | undefined) {
  if (!requested?.length) return true;
  const supported = new Set(SUPPORTED_MARKETS.map(value => value.toLowerCase()));
  return requested.some(value => supported.has(value.toLowerCase()));
}

function appliesToRequest(params: NewsFetchParams) {
  if (params.sourceTypes?.length && !params.sourceTypes.includes('official_exchange')) return false;
  return overlap(params.marketCodes);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeResourcePathSegment(value: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (
    !decoded
    || decoded !== decoded.trim()
    || decoded === '.'
    || decoded === '..'
    || decoded.includes('/')
    || decoded.includes('\\')
    || decoded.includes(':')
    || decoded.includes('?')
    || decoded.includes('#')
    || /%[0-9a-f]{2}/i.test(decoded)
    || /[\u0000-\u001F\u007F]/.test(decoded)
  ) {
    return null;
  }
  return decoded;
}

/** Build a first-party document URL without allowing an upstream path to choose its origin. */
export function dfmResourceDocumentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value !== value.trim()) return null;
  const resourcePath = value;
  if (
    !resourcePath
    || resourcePath.length > MAX_RESOURCE_PATH_LENGTH
    || !resourcePath.startsWith('/')
    || resourcePath.startsWith('//')
    || resourcePath.includes('\\')
    || resourcePath.includes('?')
    || resourcePath.includes('#')
    || resourcePath.includes('\u0000')
  ) {
    return null;
  }

  const segments = resourcePath.slice(1).split('/');
  if (segments.length === 0 || segments.length > MAX_RESOURCE_PATH_SEGMENTS) return null;
  const safeSegments: string[] = [];
  for (const segment of segments) {
    const safeSegment = safeResourcePathSegment(segment);
    if (!safeSegment) return null;
    safeSegments.push(safeSegment);
  }

  const documentUrl = new URL(DFM_DOCUMENTS_ORIGIN);
  documentUrl.pathname = `${DFM_DOCUMENTS_PATH}/${safeSegments.map(segment => encodeURIComponent(segment)).join('/')}`;
  if (
    documentUrl.protocol !== 'https:'
    || documentUrl.hostname !== 'feeds.dfm.ae'
    || documentUrl.port
    || documentUrl.username
    || documentUrl.password
    || documentUrl.search
    || documentUrl.hash
    || !documentUrl.pathname.startsWith(`${DFM_DOCUMENTS_PATH}/`)
  ) return null;
  return normalizeCanonicalUrl(documentUrl.toString(), PROVIDER_ID);
}

/** Parse DFM's format as Dubai time (UTC+4), without depending on the host timezone. */
export function parseDfmPublicationDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const month = MONTH_INDEX[match[1].toLowerCase()];
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);
  if (
    month === undefined
    || year < 1970
    || year > 2100
    || day < 1
    || hour > 23
    || minute > 59
    || second > 59
  ) {
    return null;
  }

  const localTimestamp = Date.UTC(year, month, day, hour, minute, second);
  const localDate = new Date(localTimestamp);
  if (
    localDate.getUTCFullYear() !== year
    || localDate.getUTCMonth() !== month
    || localDate.getUTCDate() !== day
    || localDate.getUTCHours() !== hour
    || localDate.getUTCMinutes() !== minute
    || localDate.getUTCSeconds() !== second
  ) {
    return null;
  }

  return new Date(localTimestamp - DFM_UTC_OFFSET_MS).toISOString();
}

function resourceSummary(resources: unknown) {
  if (!Array.isArray(resources)) return null;
  const names = resources
    .map(resource => asRecord(resource) as DfmEfsahResource | null)
    .map(resource => sanitizeExternalText(resource?.description ?? '', 180))
    .filter(Boolean);
  return names.length > 0 ? names.slice(0, 2).join(' · ') : null;
}

function officialDocumentUrl(resources: unknown) {
  if (!Array.isArray(resources)) return null;
  for (const resource of resources) {
    const record = asRecord(resource) as DfmEfsahResource | null;
    const documentUrl = dfmResourceDocumentUrl(record?.r_path);
    if (documentUrl) return documentUrl;
  }
  return null;
}

/** Parse DFM's public Efsah response without trusting its text, time zone, or resource URLs. */
export function parseDfmEfsahPayload(payload: unknown, fetchedAt = new Date().toISOString()): NormalizedNewsItem[] {
  const root = asRecord(payload)?.root;
  if (!Array.isArray(root)) {
    throw new FinancialNewsProviderError(PROVIDER_ID, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
  }

  const items: NormalizedNewsItem[] = [];
  for (const candidate of root) {
    const record = asRecord(candidate) as DfmEfsahRecord | null;
    const id = sanitizeExternalText(record?.id ?? '', 120);
    const title = sanitizeExternalText(record?.headline ?? '', 320);
    const publishedAt = parseDfmPublicationDate(record?.publication_date);
    const documentUrl = officialDocumentUrl(record?.resources);
    if (!id || !title || !publishedAt || !documentUrl) continue;

    const issuer = sanitizeExternalText(record?.issuer ?? '', 240);
    const symbol = sanitizeExternalText(record?.issuer_symbol ?? '', 32).toUpperCase();
    const attachment = resourceSummary(record?.resources);
    const summary = [issuer, attachment].filter(Boolean).join(' · ') || null;

    items.push({
      id: `${PROVIDER_ID}-${id}`,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      canonicalUrl: documentUrl,
      originalUrl: documentUrl,
      imageUrl: null,
      title,
      normalizedTitle: normalizeProviderTitle(title),
      summary,
      originalLanguage: 'en',
      translatedLanguage: null,
      translatedTitle: null,
      translatedSummary: null,
      sourceId: PROVIDER_ID,
      sourceName: PROVIDER_NAME,
      sourceType: 'official_exchange',
      sourceDomain: 'dfm.ae',
      sourceNetworkId: 'dfm.ae',
      sourceNetwork: 'dfm.ae',
      sourceReliability: 0.99,
      sourcePriority: 1,
      isOfficial: true,
      publishedAt,
      updatedAt: null,
      fetchedAt,
      marketCodes: ['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm'],
      exchangeCodes: ['DFM'],
      countries: ['AE'],
      sectors: [],
      industries: [],
      symbols: symbol ? [symbol] : [],
      companyNames: issuer ? [issuer] : [],
      assetTypes: ['equity', 'fund'],
      currencies: ['AED'],
      eventType: 'exchange_announcement',
      relevanceScore: 0,
      importanceScore: 0,
      entityConfidenceScore: symbol ? 0.85 : 0.5,
      entityConfidence: symbol ? 0.85 : 0.5,
      confidenceScore: 0.99,
      sentiment: 'unknown',
      expectedImpact: 'unknown',
      impactDirection: 'unknown',
      impactHorizon: 'unknown',
      impactReason: null,
      verificationStatus: 'official',
      corroboratingSourceCount: 0,
      duplicateGroupId: null,
      contentHash: null,
      eventFingerprint: null,
      processingStatus: 'normalized',
      processingVersion: null,
    });
  }

  return deduplicateProviderItems(items);
}

function filterItems(items: NormalizedNewsItem[], params: NewsFetchParams, query?: string | null) {
  const languages = new Set((params.languages ?? []).map(value => value.trim().toLowerCase()).filter(Boolean));
  return items.filter(item => (
    itemWithinDateRange(item, params)
    && (languages.size === 0 || languages.has(item.originalLanguage.toLowerCase()))
    && itemMatchesQuery(item, query)
  ));
}

export class DfmEfsahFinancialNewsProvider implements FinancialNewsProvider {
  readonly id = PROVIDER_ID;
  readonly name = PROVIDER_NAME;
  readonly sourceId = PROVIDER_ID;
  readonly sourceName = PROVIDER_NAME;
  readonly sourceType = 'official_exchange' as const;
  readonly sourceDomain = 'dfm.ae';
  readonly sourceNetworkId = 'dfm.ae';
  readonly sourceNetwork = 'dfm.ae';
  readonly reliabilityScore = 0.99;
  readonly priority = 1;
  readonly officialSource = true;
  readonly supportedMarkets = [...SUPPORTED_MARKETS];
  readonly enabled = true;

  private readonly runtime = new ProviderRuntimeState(this.enabled);

  get lastSuccessfulFetch() { return this.runtime.lastSuccessfulFetch; }
  get lastFailedFetch() { return this.runtime.lastFailedFetch; }
  get averageLatency() { return this.runtime.averageLatency; }
  get healthStatus() { return this.runtime.healthStatus; }
  get failureCount() { return this.runtime.failureCount; }
  get rateLimitState(): ProviderRateLimitState { return this.runtime.rateLimitState; }
  get disabledUntil() { return this.runtime.disabledUntil; }

  async fetchNews(params: NewsFetchParams) {
    validateDateRange(params, this.id);
    if (!appliesToRequest(params)) return [];
    const items = await this.load(params);
    return filterItems(items, params, params.query).slice(0, clampProviderLimit(params.limit));
  }

  async searchNews(params: NewsSearchParams | NewsFetchParams) {
    validateDateRange(params, this.id);
    if (!appliesToRequest(params)) return [];
    const items = await this.load({ ...params, limit: 100 });
    return filterItems(items, params, params.query).slice(0, clampProviderLimit(params.limit));
  }

  async healthCheck() {
    try {
      await this.load({ limit: 1, forceRefresh: true });
    } catch {
      // Runtime state retains the safe upstream error code.
    }
    return this.runtime.health(this.id, this.name, this.enabled, this.supportedMarkets);
  }

  private async load(params: NewsFetchParams) {
    const startedAt = Date.now();
    try {
      const url = new URL(DFM_EFSAH_ENDPOINT);
      url.searchParams.set('lang', 'en');
      url.searchParams.set('h7_datetime_format', 'MMM dd, yyyy HH:mm:ss');
      url.searchParams.set('from', '');
      url.searchParams.set('to', '');
      url.searchParams.set('announcement_type', 'Disclosure');
      url.searchParams.set('types', '');
      url.searchParams.set('symbol', ' ');
      url.searchParams.set('keyword', '');
      url.searchParams.set('cms_resources', 'true');
      url.searchParams.set('take', '100');
      url.searchParams.set('skip', '0');
      const response = await safeFetchText(url, {
        providerId: this.id,
        timeoutMs: 8_000,
        maxBytes: 2 * 1024 * 1024,
        maxRedirects: 3,
        allowedContentTypes: ['application/json', 'text/json', 'text/plain'],
        signal: params.signal,
        cache: params.forceRefresh ? 'no-store' : undefined,
        revalidateSeconds: params.forceRefresh ? undefined : 180,
        headers: { accept: 'application/json' },
      });
      let payload: unknown;
      try {
        payload = JSON.parse(response.text.replace(/^\uFEFF/, ''));
      } catch {
        throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
      }
      const items = parseDfmEfsahPayload(payload);
      this.runtime.recordSuccess(startedAt);
      return items;
    } catch (error) {
      const providerError = asProviderError(error, this.id);
      this.runtime.recordFailure(startedAt, providerError);
      throw providerError;
    }
  }
}

export function createDfmEfsahNewsProvider(): FinancialNewsProvider {
  return new DfmEfsahFinancialNewsProvider();
}
