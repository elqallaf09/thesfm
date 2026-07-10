import 'server-only';

import { createHash } from 'node:crypto';

import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
  ProviderHealthStatus,
  type NewsFetchParams,
  type NewsSourceType,
  type NormalizedNewsItem,
  type ProviderHealthResult,
  type ProviderRateLimitState,
} from '../types';

export class ProviderRuntimeState {
  lastSuccessfulFetch: string | null = null;
  lastFailedFetch: string | null = null;
  averageLatency: number | null = null;
  healthStatus: ProviderHealthStatus;
  failureCount = 0;
  successCount = 0;
  rateLimitState: ProviderRateLimitState = 'unknown';
  disabledUntil: string | null = null;
  lastErrorCode: FinancialNewsProviderErrorCode | null = null;
  private consecutiveFailures = 0;

  constructor(enabled: boolean) {
    this.healthStatus = enabled ? 'unknown' : 'disabled';
  }

  recordSuccess(startedAt: number) {
    this.recordLatency(startedAt);
    this.successCount += 1;
    this.consecutiveFailures = 0;
    this.lastSuccessfulFetch = new Date().toISOString();
    this.healthStatus = 'healthy';
    this.rateLimitState = 'available';
    this.disabledUntil = null;
    this.lastErrorCode = null;
  }

  recordFailure(startedAt: number, error: FinancialNewsProviderError) {
    this.recordLatency(startedAt);
    this.failureCount += 1;
    this.consecutiveFailures += 1;
    this.lastFailedFetch = new Date().toISOString();
    this.lastErrorCode = error.code;
    if (error.code === FinancialNewsProviderErrorCode.RATE_LIMITED) {
      this.healthStatus = 'rate_limited';
      this.rateLimitState = 'limited';
      this.disabledUntil = error.retryAfterSeconds
        ? new Date(Date.now() + error.retryAfterSeconds * 1_000).toISOString()
        : null;
    } else {
      this.healthStatus = this.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded';
    }
  }

  health(providerId: string, providerName: string, enabled: boolean, supportedMarkets: string[]): ProviderHealthResult {
    const total = this.successCount + this.failureCount;
    return {
      providerId,
      providerName,
      enabled,
      healthStatus: enabled ? this.healthStatus : 'disabled',
      lastSuccessfulFetch: this.lastSuccessfulFetch,
      lastFailedFetch: this.lastFailedFetch,
      averageLatency: this.averageLatency ?? 0,
      failureCount: this.failureCount,
      successRate: total > 0 ? this.successCount / total : null,
      failureRate: total > 0 ? this.failureCount / total : null,
      lastError: this.lastErrorCode,
      rateLimitState: this.rateLimitState,
      disabledUntil: this.disabledUntil,
      supportedMarkets: [...supportedMarkets],
      status: enabled ? this.healthStatus : 'disabled',
      checkedAt: new Date().toISOString(),
      latencyMs: this.averageLatency,
      errorCode: this.lastErrorCode,
    };
  }

  private recordLatency(startedAt: number) {
    const latency = Math.max(0, Date.now() - startedAt);
    this.averageLatency = this.averageLatency === null
      ? latency
      : Math.round((this.averageLatency * 0.8) + (latency * 0.2));
  }
}

export function asProviderError(error: unknown, providerId: string) {
  if (error instanceof FinancialNewsProviderError) return error;
  return new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.TEMPORARILY_UNAVAILABLE, {
    retryable: true,
  });
}

export function clampProviderLimit(value: number | undefined, fallback = 50, maximum = 100) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(value ?? fallback)));
}

export function cleanCredential(value: string | null | undefined) {
  const credential = String(value ?? '').trim();
  if (!credential || /^(your[_ -]?key|replace[_ -]?me|changeme|example)$/i.test(credential)) return null;
  return credential;
}

export function cleanSymbol(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._:^=-]/g, '')
    .slice(0, 32);
}

export function normalizeProviderTitle(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}%$€£¥]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stableProviderId(prefix: string, ...values: string[]) {
  const hash = createHash('sha256').update(values.join('\u001f')).digest('hex').slice(0, 24);
  return `${prefix}-${hash}`;
}

const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'com.br', 'com.mx', 'co.jp', 'co.kr', 'co.in',
  'com.sa', 'com.kw', 'com.qa', 'com.bh', 'com.om', 'co.ae',
]);

const PUBLISHER_NETWORK_ALIASES: Record<string, string> = {
  'finance.yahoo.com': 'yahoo.com',
  'news.yahoo.com': 'yahoo.com',
  'uk.finance.yahoo.com': 'yahoo.com',
};

export function publisherNetworkKey(value: string | null | undefined) {
  let hostname = String(value ?? '').trim().toLowerCase();
  if (!hostname) return '';
  try {
    hostname = new URL(hostname.includes('://') ? hostname : `https://${hostname}`).hostname.toLowerCase();
  } catch {
    return hostname.replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);
  }
  hostname = hostname.replace(/^www\./, '').replace(/\.$/, '');
  if (PUBLISHER_NETWORK_ALIASES[hostname]) return PUBLISHER_NETWORK_ALIASES[hostname];
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2 || /^\d+(?:\.\d+){3}$/.test(hostname)) return hostname;
  const suffix = labels.slice(-2).join('.');
  return labels.slice(MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix) ? -3 : -2).join('.');
}

export function publisherSourceId(networkId: string) {
  return stableProviderId('publisher', publisherNetworkKey(networkId));
}

const REVIEWED_PUBLISHERS: Array<{ domains: string[]; reliability: number; sourceType: NewsSourceType }> = [
  { domains: ['reuters.com'], reliability: 0.94, sourceType: 'financial_news_agency' },
  { domains: ['bloomberg.com'], reliability: 0.92, sourceType: 'financial_news_agency' },
  { domains: ['apnews.com'], reliability: 0.9, sourceType: 'financial_news_agency' },
  { domains: ['ft.com', 'wsj.com'], reliability: 0.88, sourceType: 'financial_publication' },
  { domains: ['barrons.com'], reliability: 0.86, sourceType: 'financial_publication' },
  { domains: ['cnbc.com'], reliability: 0.84, sourceType: 'financial_publication' },
  { domains: ['marketwatch.com'], reliability: 0.8, sourceType: 'financial_publication' },
  { domains: ['coindesk.com'], reliability: 0.79, sourceType: 'industry_publication' },
  { domains: ['yahoo.com', 'finance.yahoo.com'], reliability: 0.74, sourceType: 'market_data_provider' },
  { domains: ['investing.com', 'businessinsider.com'], reliability: 0.72, sourceType: 'financial_publication' },
];

export function publisherEvidenceProfile(domain: string | null) {
  const normalized = publisherNetworkKey(domain);
  const reviewed = REVIEWED_PUBLISHERS.find(entry => entry.domains.some(candidate => normalized === candidate || normalized.endsWith(`.${candidate}`)));
  return reviewed ?? { reliability: 0.55, sourceType: 'financial_publication' as const };
}

export function contentHash(title: string, summary: string | null, publishedAt: string) {
  return createHash('sha256')
    .update([normalizeProviderTitle(title), normalizeProviderTitle(summary ?? ''), publishedAt.slice(0, 10)].join('\u001f'))
    .digest('hex');
}

export function uniqueStrings(values: Array<string | null | undefined> | null | undefined) {
  return [...new Set((values ?? []).map(value => String(value ?? '').trim()).filter(Boolean))];
}

export function strictIsoDate(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && (!value.trim() || /^\d+$/.test(value.trim()))) return null;
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) return null;
  return date.toISOString();
}

export function validateDateRange(params: NewsFetchParams, providerId: string) {
  const from = params.from ? Date.parse(params.from) : null;
  const to = params.to ? Date.parse(params.to) : null;
  if ((params.from && !Number.isFinite(from)) || (params.to && !Number.isFinite(to)) || (from !== null && to !== null && from > to)) {
    throw new FinancialNewsProviderError(providerId, FinancialNewsProviderErrorCode.INVALID_REQUEST);
  }
  return { from, to };
}

export function defaultProviderDateRange(days = 7) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function itemWithinDateRange(item: NormalizedNewsItem, params: NewsFetchParams) {
  const timestamp = Date.parse(item.publishedAt);
  if (!Number.isFinite(timestamp)) return false;
  const { from, to } = validateDateRange(params, item.providerId);
  if (from !== null && timestamp < from) return false;
  if (to !== null && timestamp > to + 86_400_000) return false;
  return true;
}

export function itemMatchesQuery(item: NormalizedNewsItem, query: string | null | undefined) {
  const rawQuery = String(query ?? '').trim();
  const terms = normalizeProviderTitle(rawQuery).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const text = normalizeProviderTitle([
    item.title,
    item.summary ?? '',
    item.sourceName,
    item.symbols.join(' '),
    item.companyNames.join(' '),
    item.marketCodes.join(' '),
    item.exchangeCodes.join(' '),
    item.sectors.join(' '),
  ].join(' '));
  if (/\s+OR\s+/i.test(rawQuery)) {
    return rawQuery
      .split(/\s+OR\s+/i)
      .map(clause => normalizeProviderTitle(clause).split(' ').filter(Boolean))
      .some(clauseTerms => clauseTerms.length > 0 && clauseTerms.every(term => text.includes(term)));
  }
  const matched = terms.filter(term => text.includes(term)).length;
  return terms.length <= 3
    ? matched === terms.length
    : matched >= Math.min(2, Math.ceil(terms.length * 0.25));
}

export function deduplicateProviderItems(items: NormalizedNewsItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.canonicalUrl || item.contentHash || `${item.sourceNetworkId}:${item.normalizedTitle}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
