import { safePublicHttpUrl } from '@/lib/market-news/security';
import {
  EXPECTED_IMPACTS,
  FINANCIAL_EVENT_TYPES,
  IMPACT_DIRECTIONS,
  IMPACT_HORIZONS,
  NEWS_SENTIMENTS,
  VERIFICATION_STATUSES,
  type ExpectedImpact,
  type FinancialEventType,
  type ImpactDirection,
  type ImpactHorizon,
  type NewsSentiment,
  type VerificationStatus,
} from '@/lib/market-news/types';

export const DEFAULT_NEWS_LIMIT = 50;
export const MAX_NEWS_LIMIT = 60;

export function parseNewsLimit(value: string | null) {
  if (!value) return DEFAULT_NEWS_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_NEWS_LIMIT;
  return Math.min(MAX_NEWS_LIMIT, Math.max(1, parsed));
}

type SupportingSourceLike = {
  sourceName?: unknown;
  sourceDomain?: unknown;
  originalUrl?: unknown;
  publishedAt?: unknown;
  isOfficial?: unknown;
  reliabilityScore?: unknown;
  independent?: unknown;
};

type NewsLike = {
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translationSource?: string;
  translatedTo?: string;
  isOfficial?: unknown;
  sourceReliability?: unknown;
  verificationStatus?: unknown;
  independentSourceCount?: unknown;
  corroboratingSourceCount?: unknown;
  supportingSources?: unknown;
  eventType?: unknown;
  importanceScore?: unknown;
  relevanceScore?: unknown;
  confidenceScore?: unknown;
  entityConfidenceScore?: unknown;
  sentiment?: unknown;
  expectedImpact?: unknown;
  impactDirection?: unknown;
  impactHorizon?: unknown;
  impactReason?: unknown;
  conflictSummary?: unknown;
  whyItMatters?: unknown;
  marketCodes?: unknown;
  exchangeCodes?: unknown;
  symbols?: unknown;
  ticker?: unknown;
  sectors?: unknown;
};

const verificationStatuses = new Set<string>(VERIFICATION_STATUSES);
const eventTypes = new Set<string>(FINANCIAL_EVENT_TYPES);
const sentiments = new Set<string>(NEWS_SENTIMENTS);
const expectedImpacts = new Set<string>(EXPECTED_IMPACTS);
const impactDirections = new Set<string>(IMPACT_DIRECTIONS);
const impactHorizons = new Set<string>(IMPACT_HORIZONS);

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function finiteNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

function nonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? Math.min(value, 10_000)
    : undefined;
}

function enumValue<T extends string>(value: unknown, allowed: Set<string>) {
  return typeof value === 'string' && allowed.has(value) ? value as T : undefined;
}

function cleanCodeList(value: unknown, maxItems = 40) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => cleanText(entry, 80))
    .filter(Boolean))]
    .slice(0, maxItems);
}

function cleanDomain(value: unknown) {
  const domain = cleanText(value, 253).toLowerCase().replace(/^www\./, '');
  if (!domain || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return domain;
}

function cleanPublishedAt(value: unknown) {
  const text = cleanText(value, 64);
  return text && Number.isFinite(new Date(text).getTime()) ? text : '';
}

function sanitizeSupportingSources(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const sources: Array<{
    sourceName: string;
    sourceDomain: string | null;
    originalUrl: string;
    publishedAt: string;
    isOfficial: boolean;
    reliabilityScore: number | null;
    independent?: boolean;
  }> = [];

  for (const candidate of value.slice(0, 50)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const row = candidate as SupportingSourceLike;
    const sourceName = cleanText(row.sourceName, 160);
    const sourceDomain = cleanDomain(row.sourceDomain);
    const originalUrl = safePublicHttpUrl(row.originalUrl, 'news-api-payload') ?? '';
    const publishedAt = cleanPublishedAt(row.publishedAt);
    if (!sourceName) continue;

    const key = `${sourceName.toLowerCase()}|${sourceDomain ?? ''}|${originalUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);

    sources.push({
      sourceName,
      sourceDomain,
      originalUrl,
      publishedAt,
      isOfficial: row.isOfficial === true,
      reliabilityScore: finiteNumber(row.reliabilityScore, 0, 1) ?? null,
      ...(typeof row.independent === 'boolean' ? { independent: row.independent } : {}),
    });
  }

  return sources.slice(0, 20);
}

export function compactNewsItem<T extends NewsLike>(item: T) {
  const independentSourceCount = nonNegativeInteger(item.independentSourceCount);
  const corroboratingSourceCount = nonNegativeInteger(item.corroboratingSourceCount)
    ?? (independentSourceCount === undefined ? undefined : Math.max(0, independentSourceCount - 1));
  const marketCodes = cleanCodeList(item.marketCodes);
  const exchangeCodes = cleanCodeList(item.exchangeCodes);
  const symbols = cleanCodeList(item.symbols);
  const ticker = cleanText(item.ticker, 32);
  const sectors = cleanCodeList(item.sectors);

  return {
    id: cleanText(item.id, 256),
    title: cleanText(item.title || item.headline || '', 1_000),
    summary: cleanText(item.summary || item.title || item.headline || '', 4_000),
    titleOriginal: cleanText(item.titleOriginal || item.headline || item.title || '', 1_000),
    summaryOriginal: cleanText(item.summaryOriginal || item.summary || item.title || item.headline || '', 4_000),
    languageOriginal: cleanText(item.languageOriginal || 'unknown', 24),
    source: cleanText(item.source, 160),
    url: safePublicHttpUrl(item.url, 'news-api-payload') ?? '',
    publishedAt: cleanPublishedAt(item.publishedAt),
    isTranslated: Boolean(item.isTranslated),
    ...(item.translationSource ? { translationSource: cleanText(item.translationSource, 80) } : {}),
    ...(item.translatedTo ? { translatedTo: cleanText(item.translatedTo, 24) } : {}),
    ...(typeof item.isOfficial === 'boolean' ? { isOfficial: item.isOfficial } : {}),
    ...(finiteNumber(item.sourceReliability, 0, 1) !== undefined
      ? { sourceReliability: finiteNumber(item.sourceReliability, 0, 1) }
      : {}),
    ...(enumValue<VerificationStatus>(item.verificationStatus, verificationStatuses)
      ? { verificationStatus: enumValue<VerificationStatus>(item.verificationStatus, verificationStatuses) }
      : {}),
    ...(independentSourceCount !== undefined ? { independentSourceCount } : {}),
    ...(corroboratingSourceCount !== undefined ? { corroboratingSourceCount } : {}),
    supportingSources: sanitizeSupportingSources(item.supportingSources),
    ...(enumValue<FinancialEventType>(item.eventType, eventTypes)
      ? { eventType: enumValue<FinancialEventType>(item.eventType, eventTypes) }
      : {}),
    ...(finiteNumber(item.importanceScore, 0, 100) !== undefined
      ? { importanceScore: finiteNumber(item.importanceScore, 0, 100) }
      : {}),
    ...(finiteNumber(item.relevanceScore, 0, 100) !== undefined
      ? { relevanceScore: finiteNumber(item.relevanceScore, 0, 100) }
      : {}),
    ...(finiteNumber(item.confidenceScore, 0, 1) !== undefined
      ? { confidenceScore: finiteNumber(item.confidenceScore, 0, 1) }
      : {}),
    ...(finiteNumber(item.entityConfidenceScore, 0, 1) !== undefined
      ? { entityConfidenceScore: finiteNumber(item.entityConfidenceScore, 0, 1) }
      : {}),
    ...(enumValue<NewsSentiment>(item.sentiment, sentiments)
      ? { sentiment: enumValue<NewsSentiment>(item.sentiment, sentiments) }
      : {}),
    ...(enumValue<ExpectedImpact>(item.expectedImpact, expectedImpacts)
      ? { expectedImpact: enumValue<ExpectedImpact>(item.expectedImpact, expectedImpacts) }
      : {}),
    ...(enumValue<ImpactDirection>(item.impactDirection, impactDirections)
      ? { impactDirection: enumValue<ImpactDirection>(item.impactDirection, impactDirections) }
      : {}),
    ...(enumValue<ImpactHorizon>(item.impactHorizon, impactHorizons)
      ? { impactHorizon: enumValue<ImpactHorizon>(item.impactHorizon, impactHorizons) }
      : {}),
    ...(cleanText(item.impactReason, 500) ? { impactReason: cleanText(item.impactReason, 500) } : {}),
    ...(cleanText(item.conflictSummary, 1_000) ? { conflictSummary: cleanText(item.conflictSummary, 1_000) } : {}),
    ...(cleanText(item.whyItMatters, 1_000) ? { whyItMatters: cleanText(item.whyItMatters, 1_000) } : {}),
    marketCodes,
    exchangeCodes,
    symbols: symbols.length > 0 ? symbols : ticker ? [ticker] : [],
    sectors,
  };
}
