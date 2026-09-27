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
  strictIsoDate,
  validateDateRange,
} from './shared';

const PROVIDER_ID = 'official-dfm-disclosures';
const PROVIDER_NAME = 'Dubai Financial Market — Disclosures';
const DFM_EFSAH_ENDPOINT = new URL('https://api2.dfm.ae/efsah/v1/prototype_efsah');
const DFM_DISCLOSURE_PAGE = 'https://www.dfm.ae/the-exchange/news-disclosures/disclosures';
const SUPPORTED_MARKETS = ['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm'];

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

function disclosureUrl(id: string) {
  return normalizeCanonicalUrl(`${DFM_DISCLOSURE_PAGE}/${encodeURIComponent(id)}`, PROVIDER_ID);
}

function resourceSummary(resources: unknown) {
  if (!Array.isArray(resources)) return null;
  const names = resources
    .map(resource => asRecord(resource) as DfmEfsahResource | null)
    .map(resource => sanitizeExternalText(resource?.description ?? '', 180))
    .filter(Boolean);
  return names.length > 0 ? names.slice(0, 2).join(' · ') : null;
}

/** Parse DFM's publicly consumed Efsah response without trusting any fields. */
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
    const publishedAt = strictIsoDate(record?.publication_date);
    const canonicalUrl = id ? disclosureUrl(id) : null;
    if (!id || !title || !publishedAt || !canonicalUrl) continue;

    const issuer = sanitizeExternalText(record?.issuer ?? '', 240);
    const symbol = sanitizeExternalText(record?.issuer_symbol ?? '', 32).toUpperCase();
    const attachment = resourceSummary(record?.resources);
    const summary = [issuer, attachment].filter(Boolean).join(' · ') || null;

    items.push({
      id: `${PROVIDER_ID}-${id}`,
      providerId: PROVIDER_ID,
      providerName: PROVIDER_NAME,
      canonicalUrl,
      originalUrl: canonicalUrl,
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
      marketCodes: ['GULF', 'DFM', 'AE', 'UAE'],
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
        payload = JSON.parse(response.text);
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
