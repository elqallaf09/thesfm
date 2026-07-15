'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, ExternalLink, Filter, Landmark, LineChart, Newspaper, Search, ShieldAlert, Sparkles, Tags, X } from 'lucide-react';
import { URL_TAB_STATE_CHANGE_EVENT } from '@/lib/navigation/urlTabState';
import type { ApiListState, SelectedMarketAsset } from './types';
import { sentimentAssetBadgeType, sentimentProviderBadgeKey, sentimentContextBodyKey, sentimentAssetBadgeKey } from './utils';
import {
  textField, sentimentValues, sentimentTone, sentimentExtraMetrics,
  formatMarketToolTimestamp, publicNewsEmptyCopy, publicSentimentEmptyCopy,
  sentimentProviderStatusMeta,
} from './TechnicalAnalysisPanel';

type NewsScope = 'market' | 'asset';
type NewsSentimentFilter = 'all' | NewsSentiment;
type NewsTimeFilter = 'all' | 'hour' | 'day' | 'week' | 'month';
type NewsSort = 'latest' | 'oldest' | 'relevance' | 'importance' | 'official';
type NewsVerificationStatus = 'official' | 'confirmed' | 'single_source' | 'conflicting' | 'unverified';
type NewsVerificationFilter = 'all' | NewsVerificationStatus;
type NewsSentiment = 'positive' | 'negative' | 'neutral' | 'mixed' | 'unknown';
type NewsImpactLevel = 'high' | 'medium' | 'low' | 'unknown';
type NewsImpactDirection = 'positive' | 'negative' | 'neutral' | 'mixed' | 'unknown';
type NewsImpactHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'unknown';
type UnknownRecord = Record<string, unknown>;

export type MarketNewsServerQuery = {
  q: string;
  symbol: string;
  market: string;
  exchange: string;
  sector: string;
  eventType: string;
  source: string;
  sourceType: string;
  from: string;
  to: string;
  impact: NewsImpactLevel | 'all';
  sentiment: NewsSentimentFilter;
  verification: NewsVerificationFilter;
  officialOnly: boolean;
  sort: NewsSort;
  scope: NewsScope;
  page: number;
  pageSize: number;
};

type NormalizedSupportingSource = {
  sourceName: string;
  originalUrl: string;
  publishedAt: string;
  publishedDate: Date | null;
  isOfficial: boolean;
};

type NormalizedMarketNewsArticle = {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceType: string;
  sourceDomain: string;
  sourceReliability: number | null;
  isOfficial: boolean;
  publishedAt: string;
  publishedDate: Date | null;
  updatedAt: string;
  updatedDate: Date | null;
  url: string;
  relatedSymbols: string[];
  marketCodes: string[];
  exchangeCodes: string[];
  sectors: string[];
  category: string;
  eventType: string;
  relevanceScore: number | null;
  importanceScore: number | null;
  entityConfidenceScore: number | null;
  sentiment: NewsSentiment;
  expectedImpact: NewsImpactLevel;
  impactDirection: NewsImpactDirection;
  impactHorizon: NewsImpactHorizon;
  impactReason: string;
  verificationStatus: NewsVerificationStatus;
  independentSourceCount: number;
  corroboratingSourceCount: number;
  supportingSources: NormalizedSupportingSource[];
  conflictSummary: string;
  whyItMatters: string;
};

type NormalizedNewsDiagnostics = {
  providerCount: number | null;
  providerNames: string[];
  partialFailure: boolean;
  liveUpdatesAvailable: boolean | null;
  lastSuccessfulUpdate: Date | null;
  total: number | null;
  page: number | null;
  pageSize: number | null;
  totalPages: number | null;
};

const NEWS_PAGE_SIZE = 12;

function dateRangeForNewsFilter(filter: NewsTimeFilter) {
  if (filter === 'all') return { from: '', to: '' };
  const to = new Date();
  const days = filter === 'week' ? 7 : filter === 'month' ? 30 : 0;
  const from = new Date(to.getTime() - days * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function marketIntlLocale(lang: string) {
  return lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

function formatMarketNewsNumber(value: number, lang: string) {
  return new Intl.NumberFormat(marketIntlLocale(lang), { maximumFractionDigits: 0 }).format(value);
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function recordValue(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function newsText(item: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(item[key]);
    if (value) return value;
  }
  return '';
}

function newsNumber(item: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value !== 'number' && typeof value !== 'string') continue;
    if (typeof value === 'string' && !value.trim()) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizedScore(item: UnknownRecord, keys: string[]) {
  const value = newsNumber(item, keys);
  if (value === null) return null;
  const percent = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.round(Math.min(100, Math.max(0, percent)));
}

function newsBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = normalizeText(value).toLowerCase();
  return ['true', '1', 'yes', 'official'].includes(text);
}

function normalizedStringList(value: unknown, limit = 8) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,|]+/)
      : [];
  return [...new Set(values.map(normalizeText).filter(Boolean))].slice(0, limit);
}

function normalizeTitleHash(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function parseMarketNewsDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMarketNewsDate(value: Date | null, lang: string, unavailable: string) {
  if (!value) return unavailable;
  const now = Date.now();
  const diffMs = value.getTime() - now;
  const absMs = Math.abs(diffMs);
  if (absMs < 7 * 86400000) {
    const relative = new Intl.RelativeTimeFormat(marketIntlLocale(lang), { numeric: 'auto' });
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) return relative.format(hours, 'hour');
    return relative.format(Math.round(hours / 24), 'day');
  }
  return new Intl.DateTimeFormat(marketIntlLocale(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function normalizeArticleSentiment(item: UnknownRecord): NewsSentiment {
  const raw = newsText(item, ['sentiment', 'sentimentLabel', 'tone', 'analysisSentiment']).toLowerCase();
  if (raw.includes('positive') || raw.includes('bullish') || raw.includes('إيجابي')) return 'positive';
  if (raw.includes('negative') || raw.includes('bearish') || raw.includes('سلبي')) return 'negative';
  if (raw.includes('neutral') || raw.includes('محايد')) return 'neutral';
  if (raw.includes('mixed') || raw.includes('مختلط')) return 'mixed';
  return 'unknown';
}

function normalizeRelatedSymbols(item: UnknownRecord) {
  const values = [
    item.relatedSymbols,
    item.symbols,
    item.assets,
    item.tickers,
    item.related_currency,
    item.currency,
    item.related_bank,
    item.bank,
    item.centralBank,
    item.central_bank,
    item.region,
  ];
  const symbols = values.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(/[,\s/]+/);
    return [];
  });
  return [...new Set(symbols.map(symbol => normalizeText(symbol).toUpperCase()).filter(Boolean))].slice(0, 8);
}

function normalizeVerificationStatus(item: UnknownRecord, isOfficial: boolean): NewsVerificationStatus {
  const value = newsText(item, ['verificationStatus', 'verification_status'])
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (value === 'conflicting') return 'conflicting';
  if (isOfficial) return 'official';
  if (value === 'verified') return 'confirmed';
  if (['official', 'confirmed', 'single_source', 'conflicting', 'unverified'].includes(value)) {
    return value as NewsVerificationStatus;
  }
  return 'unverified';
}

function normalizeImpactLevel(item: UnknownRecord): NewsImpactLevel {
  const value = newsText(item, ['expectedImpact', 'impactLevel', 'impact', 'importance']).toLowerCase();
  if (value.includes('high') || value.includes('مرتفع') || value.includes('élevé')) return 'high';
  if (value.includes('medium') || value.includes('moderate') || value.includes('متوسط') || value.includes('moyen')) return 'medium';
  if (value.includes('low') || value.includes('منخفض') || value.includes('faible')) return 'low';
  return 'unknown';
}

function normalizeImpactDirection(item: UnknownRecord): NewsImpactDirection {
  const value = newsText(item, ['impactDirection', 'impact_direction']).toLowerCase();
  if (['positive', 'negative', 'neutral', 'mixed'].includes(value)) return value as NewsImpactDirection;
  return 'unknown';
}

function normalizeImpactHorizon(item: UnknownRecord): NewsImpactHorizon {
  const value = newsText(item, ['impactHorizon', 'impact_horizon']).toLowerCase().replace(/[\s-]+/g, '_');
  if (['immediate', 'short_term', 'medium_term', 'long_term'].includes(value)) return value as NewsImpactHorizon;
  return 'unknown';
}

function normalizeSupportingSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const sources: NormalizedSupportingSource[] = [];
  value.forEach(sourceValue => {
    const source = recordValue(sourceValue);
    if (!source) return;
    const sourceName = newsText(source, ['sourceName', 'name', 'source']);
    const originalUrl = safeExternalUrl(newsText(source, ['originalUrl', 'canonicalUrl', 'url', 'link']));
    if (!sourceName && !originalUrl) return;
    const key = `${sourceName.toLowerCase()}::${originalUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    const publishedAt = newsText(source, ['publishedAt', 'published_at', 'date']);
    sources.push({
      sourceName,
      originalUrl,
      publishedAt,
      publishedDate: parseMarketNewsDate(publishedAt),
      isOfficial: newsBoolean(source.isOfficial ?? source.officialSource),
    });
  });
  return sources.slice(0, 8);
}

function normalizeMarketNewsArticles(items: UnknownRecord[]) {
  const seen = new Set<string>();
  const articles: NormalizedMarketNewsArticle[] = [];
  items.forEach((rawItem, index) => {
    const item = recordValue(rawItem);
    if (!item) return;
    const title = newsText(item, ['title', 'headline', 'name']);
    if (!title) return;
    const url = safeExternalUrl(newsText(item, ['canonicalUrl', 'canonical_url', 'originalUrl', 'original_url', 'url', 'link', 'sourceUrl', 'source_url']));
    const normalizedTitle = normalizeTitleHash(title);
    const source = newsText(item, ['sourceName', 'source', 'publisher']);
    const providerId = newsText(item, ['id', 'providerArticleId', 'provider_article_id', 'uuid']);
    const dedupeKey = url || providerId || `${source.toLowerCase()}::${normalizedTitle}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const publishedAt = newsText(item, ['publishedAt', 'published_at', 'published', 'date', 'time']);
    const updatedAt = newsText(item, ['updatedAt', 'updated_at']);
    const relatedSymbols = normalizeRelatedSymbols(item);
    const isOfficial = newsBoolean(item.isOfficial ?? item.officialSource);
    const eventType = newsText(item, ['eventType', 'event_type']);
    articles.push({
      id: providerId || dedupeKey || `${normalizedTitle}-${index}`,
      title,
      summary: newsText(item, ['summary', 'description', 'excerpt']),
      source,
      sourceType: newsText(item, ['sourceType', 'source_type']),
      sourceDomain: newsText(item, ['sourceDomain', 'source_domain']),
      sourceReliability: normalizedScore(item, ['sourceReliability', 'reliabilityScore', 'source_reliability']),
      isOfficial,
      publishedAt,
      publishedDate: parseMarketNewsDate(publishedAt),
      updatedAt,
      updatedDate: parseMarketNewsDate(updatedAt),
      url,
      relatedSymbols,
      marketCodes: normalizedStringList(item.marketCodes ?? item.market_codes).map(value => value.toUpperCase()),
      exchangeCodes: normalizedStringList(item.exchangeCodes ?? item.exchange_codes).map(value => value.toUpperCase()),
      sectors: normalizedStringList(item.sectors ?? item.sector),
      category: eventType || newsText(item, ['category', 'topic']),
      eventType,
      relevanceScore: normalizedScore(item, ['relevanceScore', 'relevance_score']),
      importanceScore: normalizedScore(item, ['importanceScore', 'importance_score']),
      entityConfidenceScore: normalizedScore(item, ['entityConfidenceScore', 'entity_confidence_score']),
      sentiment: normalizeArticleSentiment(item),
      expectedImpact: normalizeImpactLevel(item),
      impactDirection: normalizeImpactDirection(item),
      impactHorizon: normalizeImpactHorizon(item),
      impactReason: newsText(item, ['impactReason', 'impact_reason']),
      verificationStatus: normalizeVerificationStatus(item, isOfficial),
      independentSourceCount: Math.max(0, Math.round(newsNumber(item, ['independentSourceCount', 'independent_source_count']) ?? 0)),
      corroboratingSourceCount: Math.max(0, Math.round(newsNumber(item, ['corroboratingSourceCount', 'corroborating_source_count']) ?? 0)),
      supportingSources: normalizeSupportingSources(item.supportingSources ?? item.supporting_sources),
      conflictSummary: newsText(item, ['conflictSummary', 'conflict_summary']),
      whyItMatters: newsText(item, ['whyItMatters', 'why_it_matters']),
    });
  });
  return articles;
}

function articleMatchesAsset(article: NormalizedMarketNewsArticle, selectedAsset: SelectedMarketAsset | null, assetFilter: string) {
  const explicitQuery = normalizeText(assetFilter).toLowerCase();
  const articleSymbols = new Set(article.relatedSymbols.map(symbol => symbol.toUpperCase()));
  if (explicitQuery) {
    if (articleSymbols.has(explicitQuery.toUpperCase())) return true;
    if (explicitQuery.length < 3) return false;
    return [article.title, article.summary, article.category, article.marketCodes.join(' '), article.exchangeCodes.join(' '), article.sectors.join(' ')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(explicitQuery);
  }

  if (!selectedAsset) return true;
  const candidateSymbols = [selectedAsset.symbol, selectedAsset.providerSymbol]
    .map(symbol => normalizeText(symbol).toUpperCase())
    .filter(Boolean);
  if (candidateSymbols.some(symbol => articleSymbols.has(symbol))) return true;

  const companyName = normalizeText(selectedAsset.name).toLowerCase();
  if (companyName.length < 4 || (article.entityConfidenceScore !== null && article.entityConfidenceScore < 60)) return false;
  return `${article.title} ${article.summary}`.toLowerCase().includes(companyName);
}

function normalizeNewsDiagnostics(value: unknown, fallbackUpdatedAt?: string): NormalizedNewsDiagnostics {
  const diagnostics = recordValue(value) ?? {};
  const pagination = recordValue(diagnostics.pagination) ?? {};
  const coverage = diagnostics.providerCoverage;
  const coverageRecord = recordValue(coverage);
  const coverageItems = Array.isArray(coverage)
    ? coverage
    : Array.isArray(coverageRecord?.providers)
      ? coverageRecord.providers
      : Array.isArray(coverageRecord?.successfulProviders)
        ? coverageRecord.successfulProviders
        : [];
  const contributingCoverageItems = coverageItems.filter(provider => {
    const record = recordValue(provider);
    if (!record) return true;
    const status = newsText(record, ['status']).toLowerCase();
    return !status || status === 'success' || status === 'partial';
  });
  const providerNames = [...new Set(contributingCoverageItems.map(provider => {
    const record = recordValue(provider);
    return record ? newsText(record, ['name', 'sourceName', 'providerName']) : normalizeText(provider);
  }).filter(Boolean))].slice(0, 8);
  const explicitProviderCount = coverageRecord
    ? newsNumber(coverageRecord, ['successful', 'available', 'healthy', 'providerCount', 'count', 'total'])
    : typeof coverage === 'number'
      ? coverage
      : null;
  const partialFailureValue = diagnostics.partialFailure;
  const partialFailure = Array.isArray(partialFailureValue)
    ? partialFailureValue.length > 0
    : typeof partialFailureValue === 'number'
      ? partialFailureValue > 0
      : newsBoolean(partialFailureValue);
  const liveUpdatesValue = diagnostics.liveUpdatesAvailable;
  const liveUpdatesAvailable = typeof liveUpdatesValue === 'boolean' ? liveUpdatesValue : null;
  const lastSuccessfulUpdate = newsText(diagnostics, ['lastSuccessfulUpdate', 'last_successful_update']) || fallbackUpdatedAt || '';
  const total = newsNumber(diagnostics, ['total']) ?? newsNumber(pagination, ['total']);
  const page = newsNumber(diagnostics, ['page']) ?? newsNumber(pagination, ['page']);
  const pageSize = newsNumber(diagnostics, ['pageSize', 'page_size']) ?? newsNumber(pagination, ['pageSize', 'page_size']);
  const totalPages = newsNumber(diagnostics, ['totalPages', 'total_pages']) ?? newsNumber(pagination, ['totalPages', 'total_pages']);
  return {
    providerCount: explicitProviderCount === null ? (providerNames.length || null) : Math.max(0, Math.round(explicitProviderCount)),
    providerNames,
    partialFailure,
    liveUpdatesAvailable,
    lastSuccessfulUpdate: parseMarketNewsDate(lastSuccessfulUpdate),
    total: total === null ? null : Math.max(0, Math.round(total)),
    page: page === null ? null : Math.max(1, Math.round(page)),
    pageSize: pageSize === null ? null : Math.max(1, Math.round(pageSize)),
    totalPages: totalPages === null ? null : Math.max(0, Math.round(totalPages)),
  };
}

function sentimentFromProviderItems(items: Record<string, any>[]) {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  items.forEach(item => {
    const values = sentimentValues(item);
    if (!values) return;
    if (values.buy > values.sell + 10) counts.positive += 1;
    else if (values.sell > values.buy + 10) counts.negative += 1;
    else counts.neutral += 1;
  });
  return counts;
}

export function NewsSentimentPanel({
  t,
  lang,
  news,
  sentiment,
  selectedAsset,
  onSelectAsset,
  onRefreshNews,
  onNewsQueryChange,
  onRefreshSentiment,
  onCheckSentimentHealth,
  checkingSentimentHealth,
  onOpenTechnicalAnalysis,
  onApplySentimentSuggestion,
}: {
  t: (key: string) => string;
  lang: string;
  news: ApiListState<UnknownRecord>;
  sentiment: ApiListState<Record<string, any>>;
  selectedAsset: SelectedMarketAsset | null;
  onSelectAsset: () => void;
  onRefreshNews: () => void;
  onNewsQueryChange: (query: MarketNewsServerQuery) => void;
  onRefreshSentiment: () => void;
  onCheckSentimentHealth: () => void;
  checkingSentimentHealth: boolean;
  onOpenTechnicalAnalysis: () => void;
  onApplySentimentSuggestion: (symbol: string) => void;
}) {
  const [scope, setScope] = useState<NewsScope>('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [assetTerm, setAssetTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('all');
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState<NewsSentimentFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<NewsVerificationFilter>('all');
  const [impactFilter, setImpactFilter] = useState<NewsImpactLevel | 'all'>('all');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState<NewsTimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<NewsSort>('latest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [requestedPage, setRequestedPage] = useState(1);
  const [filtersReady, setFiltersReady] = useState(false);
  const defaultNewsEmpty = publicNewsEmptyCopy(news.code, t);
  const liveNewsUnavailable = String(news.code ?? '').trim().toUpperCase() === 'MARKET_NEWS_LIVE_UNAVAILABLE';
  const newsEmpty = liveNewsUnavailable
    ? {
        title: t('market_news_live_unavailable_title'),
        body: t('market_news_live_unavailable_body').replace(
          '{updatedAt}',
          news.updatedAt ? formatMarketToolTimestamp(news.updatedAt, lang) : t('market_unavailable'),
        ),
      }
    : defaultNewsEmpty;
  const hasSelectedAsset = Boolean(selectedAsset?.symbol?.trim());
  const sentimentItems = hasSelectedAsset ? sentiment.items : [];
  const sentimentLoading = hasSelectedAsset && sentiment.loading;
  const sentimentAssetType = sentimentAssetBadgeType(sentiment.assetType, selectedAsset);
  const supportsMyfxbookHealth = sentimentAssetType === 'forex'
    || sentimentAssetType === 'gold'
    || sentimentAssetType === 'silver'
    || sentimentAssetType === 'metals';
  const sentimentProviderKey = sentimentProviderBadgeKey(sentiment.provider, sentiment.sentimentAvailable, sentimentAssetType);
  const sentimentProviderStatus = sentimentProviderStatusMeta(sentiment.providerStatus, t);
  const sentimentEmpty = publicSentimentEmptyCopy(hasSelectedAsset ? sentiment.code : 'NO_SELECTED_ASSET', t, sentimentAssetType);
  const sentimentContextBody = hasSelectedAsset ? t(sentimentContextBodyKey(sentimentAssetType)) : '';
  const normalizedSentimentCode = String(sentiment.code ?? '').trim().toUpperCase();
  const sentimentEmptyVariant: 'info' | 'warning' = [
    'MISSING_CREDENTIALS',
    'LOGIN_REJECTED',
    'LOGIN_FAILED',
    'INVALID_SESSION',
    'NO_SESSION',
    'PROVIDER_DOWN',
    'TIMEOUT',
    'RATE_LIMIT',
    'HTML_RESPONSE',
    'CLOUDFLARE_BLOCKED',
    'MYFXBOOK_AUTH_FAILED',
    'MYFXBOOK_INVALID_SESSION',
    'MYFXBOOK_HTML_RESPONSE',
    'MYFXBOOK_CLOUDFLARE_BLOCKED',
    'MYFXBOOK_PROVIDER_FAILED',
  ].includes(normalizedSentimentCode) ? 'warning' : 'info';
  const newsLastAttempt = news.updatedAt
    ? `${t(liveNewsUnavailable ? 'market_last_updated' : 'market_last_attempt')}: ${formatMarketToolTimestamp(news.updatedAt, lang)}`
    : undefined;
  const sentimentLastCheckedAt = hasSelectedAsset
    ? (sentiment.lastCheckedAt || sentiment.checkedAt || sentiment.updatedAt)
    : '';
  const sentimentLastAttempt = hasSelectedAsset && sentimentLastCheckedAt
    ? `${t('market_last_attempt')}: ${formatMarketToolTimestamp(sentimentLastCheckedAt, lang)}`
    : undefined;
  const sentimentUpdatedLabel = hasSelectedAsset && sentiment.sentimentAvailable && sentiment.updatedAt
    ? `${t('market_sentiment_last_updated_metric')}: ${formatMarketToolTimestamp(sentiment.updatedAt, lang)}`
    : '';
  const sentimentCheckedLabel = hasSelectedAsset && sentimentLastCheckedAt
    ? `${t('market_sentiment_last_checked_metric')}: ${formatMarketToolTimestamp(sentimentLastCheckedAt, lang)}`
    : '';
  const sentimentCachedWarning = hasSelectedAsset && (sentiment.stale || sentiment.cacheStatus === 'stale')
    ? (sentiment.message || t('market_sentiment_cached_warning'))
    : '';
  const sentimentSessionRenewed = hasSelectedAsset
    && sentiment.sentimentAvailable
    && (
      String(sentiment.communityOutlookStatus ?? '').trim().toLowerCase() === 'invalid_session_recovered'
      || String(sentiment.sentimentStatus ?? '').trim().toLowerCase() === 'invalid_session_recovered'
    )
    ? (sentiment.message || t('market_sentiment_myfxbook_session_renewed'))
    : '';
  const sentimentProviderMessage = hasSelectedAsset && sentiment.providerMessage
    ? String(sentiment.providerMessage)
    : '';
  const sentimentActionLabel = hasSelectedAsset ? t('market_refresh_sentiment') : t('market_sentiment_select_asset_action');
  const sentimentAction = hasSelectedAsset ? onRefreshSentiment : onSelectAsset;
  const sentimentSuggestions = hasSelectedAsset ? (sentiment.suggestions ?? []).filter(Boolean) : [];
  const unavailable = t('market_unavailable');
  const normalizedArticles = useMemo(() => normalizeMarketNewsArticles(news.items), [news.items]);
  const newsDiagnostics = useMemo(() => normalizeNewsDiagnostics(news.diagnostics, news.updatedAt), [news.diagnostics, news.updatedAt]);
  const sourceOptions = useMemo(
    () => [...new Set(normalizedArticles.map(article => article.source).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const categoryOptions = useMemo(
    () => [...new Set(normalizedArticles.map(article => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const marketOptions = useMemo(
    () => [...new Set(normalizedArticles.flatMap(article => article.marketCodes).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const exchangeOptions = useMemo(
    () => [...new Set(normalizedArticles.flatMap(article => article.exchangeCodes).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const sectorOptions = useMemo(
    () => [...new Set(normalizedArticles.flatMap(article => article.sectors).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const hasArticleSentiment = normalizedArticles.some(article => ['positive', 'neutral', 'negative'].includes(article.sentiment));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearchTerm(params.get('q') ?? '');
    setDebouncedSearch(params.get('q') ?? '');
    setAssetTerm(params.get('asset') ?? '');
    setAssetFilter(params.get('asset') ?? '');
    setMarketFilter(params.get('market') ?? 'all');
    setExchangeFilter(params.get('exchange') ?? 'all');
    setSectorFilter(params.get('sector') ?? 'all');
    setSourceFilter(params.get('source') ?? 'all');
    setCategoryFilter(params.get('category') ?? 'all');
    const nextSentiment = params.get('sentiment') as NewsSentimentFilter | null;
    if (nextSentiment && ['all', 'positive', 'neutral', 'negative', 'mixed', 'unknown'].includes(nextSentiment)) setSentimentFilter(nextSentiment);
    const nextVerification = params.get('verification') as NewsVerificationFilter | null;
    if (nextVerification && ['all', 'official', 'confirmed', 'single_source', 'conflicting', 'unverified'].includes(nextVerification)) setVerificationFilter(nextVerification);
    const nextImpact = params.get('impact') as NewsImpactLevel | 'all' | null;
    if (nextImpact && ['all', 'high', 'medium', 'low', 'unknown'].includes(nextImpact)) setImpactFilter(nextImpact);
    setOfficialOnly(params.get('official') === '1');
    const nextTime = params.get('period') as NewsTimeFilter | null;
    if (nextTime && ['all', 'hour', 'day', 'week', 'month'].includes(nextTime)) setTimeFilter(nextTime);
    const nextSort = params.get('sort') as NewsSort | null;
    if (nextSort && ['latest', 'oldest', 'relevance', 'importance', 'official'].includes(nextSort)) setSortOrder(nextSort);
    const nextScope = params.get('scope') as NewsScope | null;
    if (nextScope && ['market', 'asset'].includes(nextScope)) setScope(nextScope);
    const nextPage = Number(params.get('page'));
    if (Number.isInteger(nextPage) && nextPage > 0) setRequestedPage(nextPage);
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (debouncedSearch === searchTerm) return;
      setRequestedPage(1);
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [debouncedSearch, searchTerm]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (assetFilter === assetTerm) return;
      setRequestedPage(1);
      setAssetFilter(assetTerm);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [assetFilter, assetTerm]);

  useEffect(() => {
    if (scope === 'asset' && !hasSelectedAsset) {
      setRequestedPage(1);
      setScope('market');
    }
  }, [hasSelectedAsset, scope]);

  useEffect(() => {
    if (scope === 'asset') setRequestedPage(1);
  }, [scope, selectedAsset?.exchange, selectedAsset?.providerSymbol, selectedAsset?.symbol]);

  const serverQuery = useMemo<MarketNewsServerQuery>(() => {
    const assetQuery = assetFilter.trim();
    const candidateSymbol = scope === 'asset'
      ? normalizeText(selectedAsset?.providerSymbol || selectedAsset?.symbol).toUpperCase()
      : assetQuery.toUpperCase();
    const symbol = /^[A-Z0-9._:\-=^]{1,32}$/.test(candidateSymbol) ? candidateSymbol : '';
    const source = sourceFilter === 'all' ? '' : sourceFilter;
    const range = dateRangeForNewsFilter(timeFilter);
    return {
      q: [debouncedSearch.trim(), assetQuery && !symbol ? assetQuery : ''].filter(Boolean).join(' '),
      symbol,
      market: marketFilter === 'all' ? '' : marketFilter,
      exchange: exchangeFilter === 'all'
        ? (scope === 'asset' ? normalizeText(selectedAsset?.exchange) : '')
        : exchangeFilter,
      sector: sectorFilter === 'all' ? '' : sectorFilter,
      eventType: categoryFilter === 'all' ? '' : categoryFilter,
      source,
      sourceType: '',
      from: range.from,
      to: range.to,
      impact: impactFilter,
      sentiment: sentimentFilter,
      verification: verificationFilter,
      officialOnly,
      sort: sortOrder,
      scope,
      page: requestedPage,
      pageSize: NEWS_PAGE_SIZE,
    };
  }, [assetFilter, categoryFilter, debouncedSearch, exchangeFilter, impactFilter, marketFilter, officialOnly, requestedPage, scope, sectorFilter, selectedAsset?.exchange, selectedAsset?.providerSymbol, selectedAsset?.symbol, sentimentFilter, sortOrder, sourceFilter, timeFilter, verificationFilter]);

  useEffect(() => {
    if (!filtersReady) return;
    onNewsQueryChange(serverQuery);
  }, [filtersReady, onNewsQueryChange, serverQuery]);

  useEffect(() => {
    if (!filtersReady || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'newsSentiment');
    const updateParam = (key: string, value: string, emptyValue = 'all') => {
      if (!value || value === emptyValue) params.delete(key);
      else params.set(key, value);
    };
    updateParam('q', debouncedSearch, '');
    updateParam('asset', assetFilter, '');
    updateParam('market', marketFilter);
    updateParam('exchange', exchangeFilter);
    updateParam('sector', sectorFilter);
    updateParam('source', sourceFilter);
    updateParam('category', categoryFilter);
    updateParam('sentiment', sentimentFilter);
    updateParam('verification', verificationFilter);
    updateParam('impact', impactFilter);
    updateParam('official', officialOnly ? '1' : '', '');
    updateParam('period', timeFilter);
    updateParam('sort', sortOrder, 'latest');
    updateParam('scope', scope, 'market');
    updateParam('page', String(requestedPage), '1');
    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
      window.dispatchEvent(new Event(URL_TAB_STATE_CHANGE_EVENT));
    }
  }, [assetFilter, categoryFilter, debouncedSearch, exchangeFilter, filtersReady, impactFilter, marketFilter, officialOnly, requestedPage, scope, sectorFilter, sentimentFilter, sortOrder, sourceFilter, timeFilter, verificationFilter]);

  const filteredArticles = useMemo(() => {
    const now = Date.now();
    const query = debouncedSearch.trim().toLowerCase();
    const assetQuery = assetFilter.trim();
    const filtered = normalizedArticles.filter(article => {
      if (scope === 'asset' && !articleMatchesAsset(article, selectedAsset, assetQuery)) return false;
      if (scope === 'market' && assetQuery && !articleMatchesAsset(article, selectedAsset, assetQuery)) return false;
      if (marketFilter !== 'all' && !article.marketCodes.includes(marketFilter)) return false;
      if (exchangeFilter !== 'all' && !article.exchangeCodes.includes(exchangeFilter)) return false;
      if (sectorFilter !== 'all' && !article.sectors.includes(sectorFilter)) return false;
      if (sourceFilter !== 'all' && article.source !== sourceFilter) return false;
      if (categoryFilter !== 'all' && article.category !== categoryFilter) return false;
      if (sentimentFilter !== 'all' && article.sentiment !== sentimentFilter) return false;
      if (verificationFilter !== 'all' && article.verificationStatus !== verificationFilter) return false;
      if (impactFilter !== 'all' && article.expectedImpact !== impactFilter) return false;
      if (officialOnly && !article.isOfficial) return false;
      if (timeFilter !== 'all') {
        const published = article.publishedDate?.getTime();
        if (!published) return false;
        const age = now - published;
        if (timeFilter === 'hour' && age > 3600000) return false;
        if (timeFilter === 'day' && age > 86400000) return false;
        if (timeFilter === 'week' && age > 7 * 86400000) return false;
        if (timeFilter === 'month' && age > 30 * 86400000) return false;
      }
      if (!query) return true;
      return [
        article.title,
        article.summary,
        article.source,
        article.category,
        article.relatedSymbols.join(' '),
        article.marketCodes.join(' '),
        article.exchangeCodes.join(' '),
        article.sectors.join(' '),
        article.whyItMatters,
      ].join(' ').toLowerCase().includes(query);
    });
    return filtered.sort((a, b) => {
      const aTime = a.publishedDate?.getTime() ?? 0;
      const bTime = b.publishedDate?.getTime() ?? 0;
      if (sortOrder === 'oldest') return aTime - bTime;
      if (sortOrder === 'importance') {
        const importanceDifference = (b.importanceScore ?? -1) - (a.importanceScore ?? -1);
        if (importanceDifference) return importanceDifference;
      }
      if (sortOrder === 'official' && a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
      if (sortOrder === 'relevance') {
        const scoreDifference = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
        if (scoreDifference) return scoreDifference;
        const aMatch = articleMatchesAsset(a, selectedAsset, assetFilter) ? 1 : 0;
        const bMatch = articleMatchesAsset(b, selectedAsset, assetFilter) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      return bTime - aTime;
    });
  }, [assetFilter, categoryFilter, debouncedSearch, exchangeFilter, impactFilter, marketFilter, normalizedArticles, officialOnly, scope, sectorFilter, selectedAsset, sentimentFilter, sortOrder, sourceFilter, timeFilter, verificationFilter]);

  const visibleArticles = filteredArticles;
  const highImpactOfficialArticles = visibleArticles.filter(article => (
    article.isOfficial
    && article.verificationStatus !== 'conflicting'
    && (article.expectedImpact === 'high' || (article.importanceScore ?? 0) >= 75)
  ));
  const highImpactOfficialIds = new Set(highImpactOfficialArticles.map(article => article.id));
  const verifiedArticles = visibleArticles.filter(article => (
    !highImpactOfficialIds.has(article.id)
    && (article.verificationStatus === 'official' || article.verificationStatus === 'confirmed')
  ));
  const lowerPriorityArticles = visibleArticles.filter(article => (
    !highImpactOfficialIds.has(article.id)
    && !verifiedArticles.some(verified => verified.id === article.id)
  ));
  const activeFilters = [
    debouncedSearch ? { key: 'q', label: debouncedSearch, onRemove: () => { setRequestedPage(1); setSearchTerm(''); setDebouncedSearch(''); } } : null,
    assetFilter ? { key: 'asset', label: assetFilter, onRemove: () => { setRequestedPage(1); setAssetTerm(''); setAssetFilter(''); } } : null,
    marketFilter !== 'all' ? { key: 'market', label: marketFilter, onRemove: () => { setRequestedPage(1); setMarketFilter('all'); } } : null,
    exchangeFilter !== 'all' ? { key: 'exchange', label: exchangeFilter, onRemove: () => { setRequestedPage(1); setExchangeFilter('all'); } } : null,
    sectorFilter !== 'all' ? { key: 'sector', label: sectorFilter, onRemove: () => { setRequestedPage(1); setSectorFilter('all'); } } : null,
    sourceFilter !== 'all' ? { key: 'source', label: sourceFilter, onRemove: () => { setRequestedPage(1); setSourceFilter('all'); } } : null,
    categoryFilter !== 'all' ? { key: 'category', label: marketNewsEventLabel(categoryFilter, t), onRemove: () => { setRequestedPage(1); setCategoryFilter('all'); } } : null,
    sentimentFilter !== 'all' ? { key: 'sentiment', label: t(`market_news_sentiment_${sentimentFilter}`), onRemove: () => { setRequestedPage(1); setSentimentFilter('all'); } } : null,
    verificationFilter !== 'all' ? { key: 'verification', label: t(`market_news_verification_${verificationFilter}`), onRemove: () => { setRequestedPage(1); setVerificationFilter('all'); } } : null,
    impactFilter !== 'all' ? { key: 'impact', label: t(`market_news_impact_${impactFilter}`), onRemove: () => { setRequestedPage(1); setImpactFilter('all'); } } : null,
    officialOnly ? { key: 'official', label: t('market_news_official_only'), onRemove: () => { setRequestedPage(1); setOfficialOnly(false); } } : null,
    timeFilter !== 'all' ? { key: 'period', label: t(`market_news_time_${timeFilter}`), onRemove: () => { setRequestedPage(1); setTimeFilter('all'); } } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;
  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setAssetTerm('');
    setAssetFilter('');
    setMarketFilter('all');
    setExchangeFilter('all');
    setSectorFilter('all');
    setSourceFilter('all');
    setCategoryFilter('all');
    setSentimentFilter('all');
    setVerificationFilter('all');
    setImpactFilter('all');
    setOfficialOnly(false);
    setTimeFilter('all');
    setSortOrder('latest');
    setScope('market');
    setRequestedPage(1);
  };
  const articleSentimentCounts = filteredArticles.reduce(
    (counts, article) => {
      if (article.sentiment === 'positive' || article.sentiment === 'neutral' || article.sentiment === 'negative') {
        counts[article.sentiment] += 1;
      }
      return counts;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );
  const providerSentimentCounts = sentimentFromProviderItems(sentimentItems);
  const sentimentCounts = articleSentimentCounts.positive + articleSentimentCounts.neutral + articleSentimentCounts.negative > 0
    ? articleSentimentCounts
    : providerSentimentCounts;
  const sentimentTotal = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  const sourceBreakdown = sourceOptions.map(source => ({
    source,
    count: filteredArticles.filter(article => article.source === source).length,
  })).filter(item => item.count > 0).slice(0, 5);
  const relatedSymbols = [...new Set(filteredArticles.flatMap(article => article.relatedSymbols))].slice(0, 8);
  const hasLimitedCoverage = newsDiagnostics.partialFailure || news.stale || newsDiagnostics.liveUpdatesAvailable === false;
  const providerStatusTone = news.loading ? 'loading' : (news.code || hasLimitedCoverage) ? 'warning' : 'connected';
  const providerStatusLabel = news.loading
    ? t('market_loading_short')
    : hasLimitedCoverage && normalizedArticles.length > 0
      ? t('market_news_partial_results_badge')
      : news.code
      ? t('market_news_provider_disconnected')
      : t('market_news_provider_connected');
  const lastUpdatedDate = newsDiagnostics.lastSuccessfulUpdate ?? parseMarketNewsDate(news.updatedAt ?? '');
  const lastUpdatedLabel = lastUpdatedDate ? formatMarketNewsDate(lastUpdatedDate, lang, unavailable) : unavailable;
  const providerCoverageLabel = newsDiagnostics.providerCount !== null
    ? t('market_news_provider_coverage_count').replace('{count}', formatMarketNewsNumber(newsDiagnostics.providerCount, lang))
    : '';
  const serverTotal = newsDiagnostics.total ?? filteredArticles.length;
  const serverPage = newsDiagnostics.page ?? requestedPage;
  const serverPageSize = newsDiagnostics.pageSize ?? NEWS_PAGE_SIZE;
  const serverTotalPages = newsDiagnostics.totalPages ?? Math.max(1, Math.ceil(serverTotal / serverPageSize));
  const shownThrough = serverTotal > 0
    ? Math.min(serverTotal, (Math.max(1, serverPage) - 1) * serverPageSize + filteredArticles.length)
    : 0;

  return (
    <section className="news-sentiment-section market-news-workspace" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} aria-labelledby="market-news-sentiment-title">
      <div className="market-news-shell">
        <header className="market-news-header">
          <span className="market-news-header-icon"><Newspaper size={24} /></span>
          <div className="market-news-header-copy">
            <small>{t('market_news_research_label')}</small>
            <h2 id="market-news-sentiment-title">{t('market_news_sentiment')}</h2>
            <p>{t('market_news_workspace_description')}</p>
            <div className="market-news-meta-row" aria-label={t('market_news_status_summary')}>
              <span className={`market-news-status ${providerStatusTone}`}>{providerStatusLabel}</span>
              <span>{t('market_last_updated')}: <b dir="auto">{lastUpdatedLabel}</b></span>
              <span><b dir="ltr">{formatMarketNewsNumber(serverTotal, lang)}</b> {t('market_news_available_articles')}</span>
              {providerCoverageLabel ? <span title={newsDiagnostics.providerNames.join(', ')}>{providerCoverageLabel}</span> : null}
            </div>
          </div>
          <button className="market-news-refresh" type="button" onClick={onRefreshNews} disabled={news.loading}>
            <Activity size={16} />
            <span>{news.loading ? t('market_loading_short') : t('market_refresh_news')}</span>
          </button>
        </header>

        <div className="market-news-layout">
          <main className="market-news-main" aria-label={t('market_news_feed')}>
            {hasLimitedCoverage && normalizedArticles.length > 0 ? (
              <section className="market-news-coverage-notice" role="status">
                <ShieldAlert size={18} />
                <div>
                  <strong>{news.stale || newsDiagnostics.liveUpdatesAvailable === false ? t('market_news_live_unavailable_title') : t('market_news_partial_results_title')}</strong>
                  <p>
                    {news.stale || newsDiagnostics.liveUpdatesAvailable === false
                      ? t('market_news_live_unavailable_body').replace('{updatedAt}', lastUpdatedLabel)
                      : t('market_news_partial_results_body')}
                  </p>
                </div>
                <button type="button" onClick={onRefreshNews} disabled={news.loading}>{t('market_news_retry_live')}</button>
              </section>
            ) : null}

            <button
              className="market-news-filter-toggle"
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="market-news-filter-panel"
              onClick={() => setFiltersOpen(open => !open)}
            >
              <Filter size={17} />
              <span>{filtersOpen ? t('market_news_hide_filters') : t('market_news_show_filters')}</span>
            </button>

            <section id="market-news-filter-panel" className={`market-news-toolbar ${filtersOpen ? 'is-open' : ''}`} aria-label={t('market_news_filters')}>
              <label className="market-news-search">
                <Search size={18} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder={t('market_news_search_placeholder')}
                />
              </label>
              <label>
                <span>{t('market_news_asset_filter')}</span>
                <input value={assetTerm} onChange={event => setAssetTerm(event.target.value)} placeholder={t('market_news_asset_placeholder')} dir="auto" />
              </label>
              <label>
                <span>{t('market_news_affected_markets')}</span>
                <select value={marketFilter} onChange={event => { setRequestedPage(1); setMarketFilter(event.target.value); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {marketFilter !== 'all' && !marketOptions.includes(marketFilter) ? <option value={marketFilter}>{marketFilter}</option> : null}
                  {marketOptions.map(market => <option key={market} value={market}>{market}</option>)}
                </select>
              </label>
              <label>
                <span>{t('market_asset_profile_exchange')}</span>
                <select value={exchangeFilter} onChange={event => { setRequestedPage(1); setExchangeFilter(event.target.value); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {exchangeFilter !== 'all' && !exchangeOptions.includes(exchangeFilter) ? <option value={exchangeFilter}>{exchangeFilter}</option> : null}
                  {exchangeOptions.map(exchange => <option key={exchange} value={exchange}>{exchange}</option>)}
                </select>
              </label>
              <label>
                <span>{t('market_asset_profile_sector')}</span>
                <select value={sectorFilter} onChange={event => { setRequestedPage(1); setSectorFilter(event.target.value); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {sectorFilter !== 'all' && !sectorOptions.includes(sectorFilter) ? <option value={sectorFilter}>{sectorFilter}</option> : null}
                  {sectorOptions.map(sector => <option key={sector} value={sector}>{sector}</option>)}
                </select>
              </label>
              <label>
                <span>{t('market_news_source')}</span>
                <select value={sourceFilter} onChange={event => { setRequestedPage(1); setSourceFilter(event.target.value); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {sourceFilter !== 'all' && !sourceOptions.includes(sourceFilter) ? <option value={sourceFilter}>{sourceFilter}</option> : null}
                  {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label>
                <span>{t('market_news_category')}</span>
                <select value={categoryFilter} onChange={event => { setRequestedPage(1); setCategoryFilter(event.target.value); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {categoryFilter !== 'all' && !categoryOptions.includes(categoryFilter) ? <option value={categoryFilter}>{marketNewsEventLabel(categoryFilter, t)}</option> : null}
                  {categoryOptions.map(category => <option key={category} value={category}>{marketNewsEventLabel(category, t)}</option>)}
                </select>
              </label>
              {hasArticleSentiment ? (
                <label>
                  <span>{t('market_news_sentiment_filter')}</span>
                  <select value={sentimentFilter} onChange={event => { setRequestedPage(1); setSentimentFilter(event.target.value as NewsSentimentFilter); }}>
                    <option value="all">{t('market_calendar_filter_all')}</option>
                    <option value="positive">{t('market_news_sentiment_positive')}</option>
                    <option value="neutral">{t('market_news_sentiment_neutral')}</option>
                    <option value="negative">{t('market_news_sentiment_negative')}</option>
                    <option value="mixed">{t('market_news_sentiment_mixed')}</option>
                    <option value="unknown">{t('market_news_sentiment_unknown')}</option>
                  </select>
                </label>
              ) : null}
              <label>
                <span>{t('market_news_verification_filter')}</span>
                <select value={verificationFilter} onChange={event => { setRequestedPage(1); setVerificationFilter(event.target.value as NewsVerificationFilter); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  <option value="official">{t('market_news_verification_official')}</option>
                  <option value="confirmed">{t('market_news_verification_confirmed')}</option>
                  <option value="single_source">{t('market_news_verification_single_source')}</option>
                  <option value="conflicting">{t('market_news_verification_conflicting')}</option>
                  <option value="unverified">{t('market_news_verification_unverified')}</option>
                </select>
              </label>
              <label>
                <span>{t('market_news_impact_filter')}</span>
                <select value={impactFilter} onChange={event => { setRequestedPage(1); setImpactFilter(event.target.value as NewsImpactLevel | 'all'); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  <option value="high">{t('market_news_impact_high')}</option>
                  <option value="medium">{t('market_news_impact_medium')}</option>
                  <option value="low">{t('market_news_impact_low')}</option>
                  <option value="unknown">{t('market_news_impact_unknown')}</option>
                </select>
              </label>
              <label className="market-news-checkbox-filter">
                <input type="checkbox" checked={officialOnly} onChange={event => { setRequestedPage(1); setOfficialOnly(event.target.checked); }} />
                <span>{t('market_news_official_only')}</span>
              </label>
              <label>
                <span>{t('market_news_time_filter')}</span>
                <select value={timeFilter} onChange={event => { setRequestedPage(1); setTimeFilter(event.target.value as NewsTimeFilter); }}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  <option value="hour">{t('market_news_time_hour')}</option>
                  <option value="day">{t('market_news_time_day')}</option>
                  <option value="week">{t('market_news_time_week')}</option>
                  <option value="month">{t('market_news_time_month')}</option>
                </select>
              </label>
              <label>
                <span>{t('market_news_sort')}</span>
                <select value={sortOrder} onChange={event => { setRequestedPage(1); setSortOrder(event.target.value as NewsSort); }}>
                  <option value="latest">{t('market_news_sort_latest')}</option>
                  <option value="oldest">{t('market_news_sort_oldest')}</option>
                  <option value="relevance">{t('market_news_sort_relevance')}</option>
                  <option value="importance">{t('market_news_sort_importance')}</option>
                  <option value="official">{t('market_news_sort_official')}</option>
                </select>
              </label>
              {activeFilters.length > 0 ? (
                <button className="market-news-clear" type="button" onClick={clearFilters}>
                  <X size={15} />
                  <span>{t('market_news_clear_filters')}</span>
                </button>
              ) : null}
            </section>

            {activeFilters.length > 0 ? (
              <div className="market-news-active-filters" aria-label={t('market_news_active_filters')}>
                {activeFilters.map(filter => (
                  <button key={filter.key} type="button" onClick={filter.onRemove}>
                    <X size={13} />
                    <span dir="auto">{filter.label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <section className="market-news-scope-card">
              <div>
                <small>{t('market_news_result_count')}</small>
                <strong><span dir="ltr">{formatMarketNewsNumber(serverTotal, lang)}</span> {t('market_news_results')}</strong>
                <p>{scope === 'asset' ? t('market_news_asset_scope_description') : t('market_news_market_scope_description')}</p>
              </div>
              <div className="market-news-scope-toggle" role="tablist" aria-label={t('market_news_scope_toggle')}>
                <button type="button" aria-pressed={scope === 'market'} onClick={() => { setRequestedPage(1); setScope('market'); }}>
                  {t('market_news_scope_market')}
                </button>
                <button type="button" aria-pressed={scope === 'asset'} disabled={!hasSelectedAsset} onClick={() => { setRequestedPage(1); setScope('asset'); }}>
                  {t('market_news_scope_asset')}
                </button>
              </div>
            </section>

            <NewsSentimentSummary
              t={t}
              lang={lang}
              counts={sentimentCounts}
              total={sentimentTotal}
              timeframe={t(timeFilter === 'all' ? 'market_calendar_filter_all' : `market_news_time_${timeFilter}`)}
            />

            {news.loading && normalizedArticles.length === 0 ? (
              <MarketSectionLoading label={t('market_loading_central_bank_news')} cards={4} />
            ) : news.code && normalizedArticles.length === 0 ? (
              <MarketToolEmptyState
                icon={<Newspaper size={18} />}
                title={newsEmpty.title}
                description={newsEmpty.body}
                meta={newsLastAttempt}
                actionLabel={t('market_refresh_news')}
                onAction={onRefreshNews}
                variant="warning"
              />
            ) : filteredArticles.length === 0 ? (
              <MarketToolEmptyState
                icon={<Filter size={18} />}
                title={t('market_news_empty_filtered_title')}
                description={t('market_news_empty_filtered_body')}
                actionLabel={activeFilters.length > 0 ? t('market_news_clear_filters') : t('market_refresh_news')}
                onAction={activeFilters.length > 0 ? clearFilters : onRefreshNews}
                variant="info"
              />
            ) : (
              <>
                <MarketNewsGroup
                  articles={highImpactOfficialArticles}
                  className="priority"
                  title={t('market_news_group_official_high_impact')}
                  description={t('market_news_group_official_high_impact_body')}
                  lang={lang}
                  t={t}
                  unavailable={unavailable}
                  featureFirst
                />
                <MarketNewsGroup
                  articles={verifiedArticles}
                  title={t('market_news_group_verified')}
                  description={t('market_news_group_verified_body')}
                  lang={lang}
                  t={t}
                  unavailable={unavailable}
                />
                <MarketNewsGroup
                  articles={lowerPriorityArticles}
                  className="lower-priority"
                  title={t('market_news_group_unverified')}
                  description={t('market_news_group_unverified_body')}
                  lang={lang}
                  t={t}
                  unavailable={unavailable}
                />
                <nav className="market-news-load-row" aria-label={t('accessibility_pagination')}>
                  <button type="button" onClick={() => setRequestedPage(page => Math.max(1, page - 1))} disabled={news.loading || serverPage <= 1} aria-label={t('accessibility_previous_page')}>
                    {t('previous')}
                  </button>
                  <span dir="ltr">{formatMarketNewsNumber(serverPage, lang)} / {formatMarketNewsNumber(Math.max(1, serverTotalPages), lang)}</span>
                  <button type="button" onClick={() => setRequestedPage(page => Math.min(Math.max(1, serverTotalPages), page + 1))} disabled={news.loading || serverPage >= serverTotalPages} aria-label={t('accessibility_next_page')}>
                    {t('next')}
                  </button>
                  <small>
                    {t('market_news_loaded_count')
                      .replace('{shown}', formatMarketNewsNumber(shownThrough, lang))
                      .replace('{total}', formatMarketNewsNumber(serverTotal, lang))}
                  </small>
                </nav>
              </>
            )}
          </main>

          <aside className="market-news-side" aria-label={t('market_news_side_panel')}>
            <section className="market-news-side-card asset">
              <div className="market-news-side-head">
                <span><Landmark size={18} /></span>
                <div>
                  <small>{t('market_news_selected_asset')}</small>
                  <h3>{hasSelectedAsset ? selectedAsset?.symbol : t('market_no_asset_selected_yet')}</h3>
                </div>
              </div>
              {hasSelectedAsset ? (
                <div className="market-news-asset-panel">
                  <strong>{selectedAsset?.name || selectedAsset?.symbol}</strong>
                  <div>
                    <span>{t('market_asset_type_label')}</span>
                    <b>{t(sentimentAssetBadgeKey(sentimentAssetType))}</b>
                  </div>
                  {selectedAsset?.exchange ? (
                    <div>
                      <span>{t('market_calendar_source')}</span>
                      <b dir="ltr">{selectedAsset.exchange}</b>
                    </div>
                  ) : null}
                  <div>
                    <span>{t('market_news_related_articles')}</span>
                    <b dir="ltr">{filteredArticles.filter(article => articleMatchesAsset(article, selectedAsset, assetFilter)).length}</b>
                  </div>
                  <button type="button" onClick={onSelectAsset}>{t('market_news_change_asset')}</button>
                </div>
              ) : (
                <div className="market-news-no-asset">
                  <strong>{t('market_news_no_asset_title')}</strong>
                  <p>{t('market_news_no_asset_body')}</p>
                  <button type="button" onClick={onSelectAsset}>{t('market_news_select_asset_action')}</button>
                </div>
              )}
            </section>

            <section className="market-news-side-card">
              <div className="market-news-side-head">
                <span><BarChart3 size={18} /></span>
                <div>
                  <small>{t('market_sentiment_note_title')}</small>
                  <h3>{t('market_market_sentiment')}</h3>
                </div>
              </div>
              {hasSelectedAsset ? (
                <div className="sentiment-context-block compact">
                  <div className="sentiment-context-row" aria-label={t('market_sentiment_context_badges')}>
                    <span className="sentiment-context-badge source">
                      <small>{t('market_sentiment_provider_label')}</small>
                      <b>{t(sentimentProviderKey)}</b>
                    </span>
                    <span className={`sentiment-context-badge status ${sentimentProviderStatus.className}`}>
                      <small>{t('market_sentiment_provider_status')}</small>
                      <b>{sentimentProviderStatus.label}</b>
                    </span>
                  </div>
                  {sentimentUpdatedLabel ? <p className="sentiment-context-note"><Clock3 size={13} /> <span>{sentimentUpdatedLabel}</span></p> : null}
                  {sentimentCheckedLabel ? <p className="sentiment-context-note"><Clock3 size={13} /> <span>{sentimentCheckedLabel}</span></p> : null}
                  {sentimentCachedWarning ? <p className="sentiment-context-note sentiment-cache-note"><ShieldAlert size={13} /> <span>{sentimentCachedWarning}</span></p> : null}
                  {sentimentSessionRenewed ? <p className="sentiment-context-note"><CheckCircle2 size={13} /> <span>{sentimentSessionRenewed}</span></p> : null}
                  {sentimentProviderMessage ? <p className="sentiment-context-note sentiment-cache-note"><ShieldAlert size={13} /> <span>{sentimentProviderMessage}</span></p> : null}
                  {sentimentContextBody ? <p className="sentiment-context-note">{sentimentContextBody}</p> : null}
                </div>
              ) : null}

              {sentimentLoading ? (
                <MarketSectionLoading label={t('market_loading_market_sentiment')} cards={2} />
              ) : sentimentItems.length > 0 ? (
                <div className="sentiment-card-list compact">
                  {sentimentItems.slice(0, 3).map((item, index) => {
                    const symbol = textField(item, ['displaySymbol', 'symbol', 'ticker', 'asset', 'instrument']);
                    const name = textField(item, ['name', 'assetName', 'asset_name', 'description']);
                    const values = sentimentValues(item);
                    if (!values) {
                      return (
                        <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                          <div className="sentiment-card-head">
                            <b dir="ltr">{symbol || unavailable}</b>
                            {name ? <span>{name}</span> : null}
                          </div>
                          <p>{t('market_sentiment_no_items_body')}</p>
                        </article>
                      );
                    }
                    const tone = sentimentTone(values);
                    const extraMetrics = sentimentExtraMetrics(item, t, lang);
                    return (
                      <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                        <div className="sentiment-card-head">
                          <div>
                            <b dir="ltr">{symbol || unavailable}</b>
                            {name ? <span>{name}</span> : null}
                          </div>
                          <em className={`sentiment-badge ${tone}`}>
                            {tone === 'buy' ? t('market_sentiment_majority_buy') : tone === 'sell' ? t('market_sentiment_majority_sell') : t('market_sentiment_balanced')}
                          </em>
                        </div>
                        <div className="sentiment-metrics">
                          <span>{t('market_buy_ratio')} <b dir="ltr">{values.buy.toFixed(0)}%</b></span>
                          <span>{t('market_sell_ratio')} <b dir="ltr">{values.sell.toFixed(0)}%</b></span>
                        </div>
                        <div className="sentiment-bar" aria-hidden="true">
                          <i style={{ width: `${values.buy}%` }} />
                          <b style={{ width: `${values.sell}%` }} />
                        </div>
                        {extraMetrics.length > 0 ? (
                          <div className="sentiment-extra-metrics">
                            {extraMetrics.slice(0, 2).map(([label, value]) => (
                              <span key={label}>
                                <small>{label}</small>
                                <b dir="ltr">{value}</b>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <MarketToolEmptyState
                  icon={<BarChart3 size={18} />}
                  title={sentimentEmpty.title}
                  description={sentimentEmpty.body}
                  meta={sentimentLastAttempt}
                  actionLabel={hasSelectedAsset ? undefined : sentimentActionLabel}
                  onAction={hasSelectedAsset ? undefined : sentimentAction}
                  variant={sentimentEmptyVariant}
                />
              )}
              <div className="sentiment-empty-actions">
                <button type="button" onClick={hasSelectedAsset ? onRefreshSentiment : onSelectAsset}>
                  <Activity size={15} />
                  <span>{hasSelectedAsset ? t('market_refresh_sentiment') : t('market_sentiment_select_asset_action')}</span>
                </button>
                {hasSelectedAsset && supportsMyfxbookHealth ? (
                  <button type="button" onClick={onCheckSentimentHealth} disabled={checkingSentimentHealth}>
                    <ShieldAlert size={15} />
                    <span>{checkingSentimentHealth ? t('market_refreshing_section') : t('market_sentiment_check_myfxbook')}</span>
                  </button>
                ) : null}
                {sentimentSuggestions.map(suggestion => (
                  <button type="button" key={suggestion} onClick={() => onApplySentimentSuggestion(suggestion)}>
                    <Search size={15} />
                    <span dir="ltr">{suggestion}</span>
                  </button>
                ))}
                <button type="button" onClick={onOpenTechnicalAnalysis}>
                  <LineChart size={15} />
                  <span>{t('market_sentiment_technical_action')}</span>
                </button>
              </div>
              <div className="sentiment-info-card">
                <ShieldAlert size={17} />
                <p>{t('market_sentiment_warning')}</p>
              </div>
            </section>

            <section className="market-news-side-card">
              <div className="market-news-side-head">
                <span><Tags size={18} /></span>
                <div>
                  <small>{t('market_news_source')}</small>
                  <h3>{t('market_news_source_breakdown')}</h3>
                </div>
              </div>
              {sourceBreakdown.length > 0 ? (
                <div className="market-news-mini-list">
                  {sourceBreakdown.map(item => (
                    <button type="button" key={item.source} onClick={() => { setRequestedPage(1); setSourceFilter(item.source); }}>
                      <span dir="auto">{item.source}</span>
                      <b dir="ltr">{item.count}</b>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="market-news-muted">{t('market_news_no_source_breakdown')}</p>
              )}
            </section>

            <section className="market-news-side-card">
              <div className="market-news-side-head">
                <span><Sparkles size={18} /></span>
                <div>
                  <small>{t('market_news_related_symbols')}</small>
                  <h3>{t('market_news_most_mentioned_assets')}</h3>
                </div>
              </div>
              {relatedSymbols.length > 0 ? (
                <div className="market-news-symbol-cloud">
                  {relatedSymbols.map(symbol => (
                    <button type="button" key={symbol} dir="ltr" onClick={() => { setRequestedPage(1); setAssetTerm(symbol); setAssetFilter(symbol); }}>{symbol}</button>
                  ))}
                </div>
              ) : (
                <p className="market-news-muted">{t('market_news_no_related_symbols')}</p>
              )}
            </section>
          </aside>
        </div>
      </div>
      <MarketNewsWorkspaceStyles />
    </section>
  );
}

function NewsSentimentSummary({
  t,
  lang,
  counts,
  total,
  timeframe,
}: {
  t: (key: string) => string;
  lang: string;
  counts: { positive: number; neutral: number; negative: number };
  total: number;
  timeframe: string;
}) {
  const positivePercent = total > 0 ? Math.round((counts.positive / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((counts.neutral / total) * 100) : 0;
  const negativePercent = total > 0 ? Math.max(0, 100 - positivePercent - neutralPercent) : 0;
  return (
    <section className="market-news-sentiment-summary" aria-label={t('market_news_sentiment_summary')}>
      <div>
        <small>{t('market_news_sentiment_summary')}</small>
        <h3>{total > 0 ? t('market_news_sentiment_summary_ready') : t('market_news_sentiment_summary_unavailable')}</h3>
        <p>{t('market_news_sentiment_summary_body')}</p>
      </div>
      <div className="market-news-sentiment-meter" aria-label={t('market_news_sentiment_distribution')}>
        <div className="market-news-sentiment-bar" aria-hidden="true">
          <span className="positive" style={{ width: `${positivePercent}%` }} />
          <span className="neutral" style={{ width: `${neutralPercent}%` }} />
          <span className="negative" style={{ width: `${negativePercent}%` }} />
        </div>
        <div className="market-news-sentiment-pills">
          <span><b dir="ltr">{formatMarketNewsNumber(positivePercent, lang)}%</b>{t('market_news_sentiment_positive')}</span>
          <span><b dir="ltr">{formatMarketNewsNumber(neutralPercent, lang)}%</b>{t('market_news_sentiment_neutral')}</span>
          <span><b dir="ltr">{formatMarketNewsNumber(negativePercent, lang)}%</b>{t('market_news_sentiment_negative')}</span>
        </div>
        <small>
          {t('market_news_analyzed_articles').replace('{count}', formatMarketNewsNumber(total, lang)).replace('{timeframe}', timeframe)}
          {' '}
          <em title={t('market_news_ai_tooltip')}>{t('market_news_ai_badge')}</em>
        </small>
      </div>
    </section>
  );
}

function marketNewsEventLabel(value: string, t: (key: string) => string) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (!normalized) return t('market_news_event_unknown');
  const key = `market_news_event_${normalized}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return value.replace(/[_-]+/g, ' ');
}

function userFacingEvidenceDetail(value: string, kind: 'conflict' | 'why' | 'impact', eventLabel: string, t: (key: string) => string) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (kind === 'conflict') {
    if (normalized === 'status_disagreement') return t('market_news_conflict_status_detail');
    if (normalized === 'material_value_disagreement') return t('market_news_conflict_value_detail');
  }
  if (normalized.startsWith('event:')) {
    const template = kind === 'impact' ? t('market_news_impact_event_reason') : t('market_news_event_reason');
    return template.replace('{event}', eventLabel);
  }
  if (['materiality_not_established', 'insufficient_evidence'].includes(normalized)) {
    return t('market_news_reason_not_available');
  }
  if (normalized === 'conflicting_sources') return t('market_news_conflict_impact_deferred');
  // Internal processing codes are intentionally not rendered to users.
  if (/^[a-z0-9_]+(?::[a-z0-9_]+)?$/i.test(normalized)) return '';
  return normalized;
}

function marketNewsImportance(article: NormalizedMarketNewsArticle): NewsImpactLevel {
  if (article.importanceScore === null) return 'unknown';
  if (article.importanceScore >= 75) return 'high';
  if (article.importanceScore >= 45) return 'medium';
  return 'low';
}

function marketNewsEvidenceLabel(article: NormalizedMarketNewsArticle, t: (key: string) => string, lang: string) {
  if (article.verificationStatus === 'conflicting') return t('market_news_conflicting_evidence');
  if (article.isOfficial || article.verificationStatus === 'official') return t('market_news_official_disclosure');
  if (article.verificationStatus === 'confirmed' && article.independentSourceCount >= 2) {
    return t('market_news_confirmed_sources').replace('{count}', formatMarketNewsNumber(article.independentSourceCount, lang));
  }
  if (article.verificationStatus === 'confirmed') return t('market_news_verification_confirmed');
  if (article.verificationStatus === 'single_source' || article.independentSourceCount === 1) {
    return t('market_news_single_source_evidence');
  }
  return t('market_news_unverified_evidence');
}

function MarketNewsGroup({
  articles,
  title,
  description,
  lang,
  t,
  unavailable,
  className = '',
  featureFirst = false,
}: {
  articles: NormalizedMarketNewsArticle[];
  title: string;
  description: string;
  lang: string;
  t: (key: string) => string;
  unavailable: string;
  className?: string;
  featureFirst?: boolean;
}) {
  if (articles.length === 0) return null;
  const featuredArticle = featureFirst ? articles[0] : null;
  const listedArticles = featureFirst ? articles.slice(1) : articles;
  return (
    <section className={`market-news-story-group ${className}`}>
      <header className="market-news-group-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span aria-label={t('market_news_group_story_count').replace('{count}', formatMarketNewsNumber(articles.length, lang))} dir="ltr">{formatMarketNewsNumber(articles.length, lang)}</span>
      </header>
      {featuredArticle ? <MarketNewsCard article={featuredArticle} lang={lang} t={t} featured unavailable={unavailable} /> : null}
      {listedArticles.length > 0 ? (
        <div className="market-news-list">
          {listedArticles.map(article => (
            <MarketNewsCard key={article.id} article={article} lang={lang} t={t} unavailable={unavailable} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MarketNewsCard({
  article,
  lang,
  t,
  unavailable,
  featured = false,
}: {
  article: NormalizedMarketNewsArticle;
  lang: string;
  t: (key: string) => string;
  unavailable: string;
  featured?: boolean;
}) {
  const publishedLabel = formatMarketNewsDate(article.publishedDate, lang, unavailable);
  const updatedLabel = article.updatedDate && article.publishedDate
    && Math.abs(article.updatedDate.getTime() - article.publishedDate.getTime()) > 60000
    ? formatMarketNewsDate(article.updatedDate, lang, unavailable)
    : '';
  const sourceName = article.source || t('market_news_source_unavailable');
  const evidenceLabel = marketNewsEvidenceLabel(article, t, lang);
  const importance = marketNewsImportance(article);
  const eventLabel = marketNewsEventLabel(article.eventType || article.category, t);
  const conflictDetail = userFacingEvidenceDetail(article.conflictSummary, 'conflict', eventLabel, t);
  const whyItMatters = userFacingEvidenceDetail(article.whyItMatters, 'why', eventLabel, t);
  const impactReason = userFacingEvidenceDetail(article.impactReason, 'impact', eventLabel, t);
  const sourceReliability = article.sourceReliability === null
    ? ''
    : t('market_news_source_reliability_value').replace('{score}', formatMarketNewsNumber(article.sourceReliability, lang));
  const affectedMarkets = [...new Set([...article.marketCodes, ...article.exchangeCodes])].slice(0, 4);
  const canShowEntityLinks = article.entityConfidenceScore === null || article.entityConfidenceScore >= 60;
  const relatedSymbols = canShowEntityLinks ? article.relatedSymbols.slice(0, 4) : [];
  const hasImpactAnalysis = article.verificationStatus !== 'conflicting' && (
    article.expectedImpact !== 'unknown'
    || article.impactDirection !== 'unknown'
    || article.impactHorizon !== 'unknown'
    || Boolean(article.impactReason)
  );
  return (
    <article className={`market-news-card verification-${article.verificationStatus} ${featured ? 'featured' : ''}`}>
      <div className={`market-news-evidence-rail ${article.verificationStatus}`}>
        <span aria-hidden="true">
          {article.verificationStatus === 'conflicting'
            ? <AlertTriangle size={17} />
            : article.verificationStatus === 'official' || article.verificationStatus === 'confirmed'
              ? <CheckCircle2 size={17} />
              : <ShieldAlert size={17} />}
        </span>
        <div>
          <strong>{evidenceLabel}</strong>
          <small><span dir="auto">{sourceName}</span>{sourceReliability ? <> · <span dir="auto">{sourceReliability}</span></> : null}</small>
        </div>
      </div>

      <div className="market-news-card-meta">
        <time dateTime={article.publishedDate?.toISOString()}>{t('market_news_published_label')}: {publishedLabel}</time>
        {updatedLabel ? <time dateTime={article.updatedDate?.toISOString()}>{t('market_news_updated_label')}: {updatedLabel}</time> : null}
        {article.eventType || article.category ? <span dir="auto">{eventLabel}</span> : null}
      </div>

      <h4 dir="auto">
        {article.url ? (
          <a href={article.url} target="_blank" rel="noopener noreferrer nofollow">{article.title}</a>
        ) : article.title}
      </h4>

      {article.summary ? (
        <details className="market-news-summary-details">
          <summary>
            <span className="market-news-summary-preview" dir="auto">{article.summary}</span>
            <b className="market-news-summary-more">{t('market_news_expand_summary')}</b>
            <b className="market-news-summary-less">{t('market_news_collapse_summary')}</b>
          </summary>
          <p dir="auto">{article.summary}</p>
        </details>
      ) : null}

      {article.verificationStatus === 'conflicting' ? (
        <div className="market-news-conflict" role="note">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('market_news_conflict_warning')}</strong>
            {conflictDetail ? <p dir="auto">{conflictDetail}</p> : null}
            <small>{t('market_news_conflict_impact_deferred')}</small>
          </div>
        </div>
      ) : null}

      <div className="market-news-entity-lines">
        {relatedSymbols.length > 0 ? (
          <div><span>{t('market_news_affected_symbols')}</span><p>{relatedSymbols.map(symbol => <b key={symbol} dir="ltr">{symbol}</b>)}</p></div>
        ) : null}
        {affectedMarkets.length > 0 ? (
          <div><span>{t('market_news_affected_markets')}</span><p>{affectedMarkets.map(market => <b key={market} dir="ltr">{market}</b>)}</p></div>
        ) : null}
        {article.sectors.length > 0 ? (
          <div><span>{t('market_news_affected_sectors')}</span><p>{article.sectors.slice(0, 3).map(sector => <b key={sector} dir="auto">{sector}</b>)}</p></div>
        ) : null}
      </div>

      <div className="market-news-story-reason">
        <strong>{t('market_news_why_it_matters')}</strong>
        <p dir="auto">{whyItMatters || t('market_news_reason_not_available')}</p>
      </div>

      <div className="market-news-story-signals">
        <span>{t('market_news_importance_label')}: <b>{t(`market_news_impact_${importance}`)}</b>{article.importanceScore !== null ? <em dir="ltr">{formatMarketNewsNumber(article.importanceScore, lang)}/100</em> : null}</span>
        {article.sentiment !== 'unknown' ? <span>{t('market_news_sentiment_filter')}: <b>{t(`market_news_sentiment_${article.sentiment}`)}</b></span> : null}
      </div>

      {hasImpactAnalysis ? (
        <section className="market-news-impact-analysis" aria-label={t('market_news_impact_estimate_title')}>
          <div className="market-news-impact-head">
            <strong>{t('market_news_impact_estimate_title')}</strong>
            <span>{t('market_news_ai_estimate_badge')}</span>
          </div>
          <dl>
            <div><dt>{t('market_news_impact_direction')}</dt><dd>{t(`market_news_direction_${article.impactDirection}`)}</dd></div>
            <div><dt>{t('market_news_impact_strength')}</dt><dd>{t(`market_news_impact_${article.expectedImpact}`)}</dd></div>
            <div><dt>{t('market_news_impact_horizon')}</dt><dd>{t(`market_news_horizon_${article.impactHorizon}`)}</dd></div>
          </dl>
          {impactReason ? <p dir="auto">{impactReason}</p> : null}
          <small>{t('market_news_impact_disclaimer')}</small>
        </section>
      ) : null}

      {article.supportingSources.length > 0 ? (
        <details className="market-news-supporting-sources">
          <summary>
            <span>{t('market_news_view_supporting_sources')}</span>
            <b dir="ltr">{formatMarketNewsNumber(article.supportingSources.length, lang)}</b>
          </summary>
          <div>
            {article.supportingSources.map((source, index) => (
              source.originalUrl ? (
                <a key={`${source.sourceName}-${source.originalUrl}`} href={source.originalUrl} target="_blank" rel="noopener noreferrer nofollow">
                  <span dir="auto">{source.sourceName || t('market_news_source_unavailable')}</span>
                  <small>{source.isOfficial ? t('market_news_official_source_short') : formatMarketNewsDate(source.publishedDate, lang, unavailable)}</small>
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span key={`${source.sourceName}-${index}`}>
                  <b dir="auto">{source.sourceName || t('market_news_source_unavailable')}</b>
                  <small>{source.isOfficial ? t('market_news_official_source_short') : formatMarketNewsDate(source.publishedDate, lang, unavailable)}</small>
                </span>
              )
            ))}
          </div>
        </details>
      ) : null}

      <div className="market-news-card-footer">
        <div className="market-news-chip-row">
          {article.isOfficial ? <span className="official">{t('market_news_official_source_short')}</span> : null}
          {article.independentSourceCount > 1 ? <span>{t('market_news_independent_source_count').replace('{count}', formatMarketNewsNumber(article.independentSourceCount, lang))}</span> : null}
        </div>
        {article.url ? (
          <a className="market-news-source-action" href={article.url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink size={15} />
            <span>{t('market_news_read_source')}</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function MarketNewsWorkspaceStyles() {
  return (
    <style jsx global>{`
      .news-sentiment-section.market-news-workspace{width:100%;max-width:1500px;min-width:0;overflow:hidden;font-family:var(--font-ui)}
      .market-news-workspace{width:100%;max-width:100%;min-width:0}
      .market-news-shell{width:100%;max-width:1500px;margin-inline:auto;display:grid;gap:20px;min-width:0;box-sizing:border-box}
      .market-news-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:start;border:1px solid color-mix(in srgb, var(--accent) 18%, transparent);background:var(--surface);border-radius: var(--radius-panel);padding:20px;box-shadow: var(--shadow-sm)}
      .market-news-header-icon,.market-news-side-head>span{width:52px;height:52px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--surface-muted);border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);color:var(--primary-hover);flex:0 0 auto}
      .market-news-header-copy{display:grid;gap:8px;min-width:0}
      .market-news-header-copy small{color:var(--primary-hover);font-size:12px;font-weight: 700;line-height:1.4}
      .market-news-header-copy h2{margin:0;color:var(--foreground);font-size:clamp(24px,3vw,34px);font-weight: 700;line-height:1.2}
      .market-news-header-copy p{margin:0;max-width:780px;color:var(--foreground-muted);font-size:15px;font-weight: 500;line-height:1.75}
      .market-news-meta-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .market-news-meta-row>span,.market-news-status{display:inline-flex;align-items:center;gap:5px;border:1px solid color-mix(in srgb, var(--foreground-muted) 14%, transparent);background:color-mix(in srgb, var(--foreground-muted) 6%, transparent);color:var(--foreground-muted);border-radius: var(--radius-pill);padding:7px 10px;font-size:12px;font-weight: 700;line-height:1.2}
      .market-news-status.connected{border-color:color-mix(in srgb, var(--accent) 24%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary-hover)}
      .market-news-status.warning{border-color:color-mix(in srgb, var(--warning) 25%, transparent);background:color-mix(in srgb, var(--warning) 12%, transparent);color:var(--warning)}
      .market-news-status.loading{border-color:color-mix(in srgb, var(--primary) 24%, transparent);background:color-mix(in srgb, var(--primary) 10%, transparent);color:var(--primary)}
      .market-news-refresh{min-height:44px;border:0;border-radius: var(--radius-pill);background:var(--primary);color:var(--primary-foreground);padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font: 700 13px var(--font-ui);cursor:pointer;box-shadow: var(--shadow-sm);white-space:nowrap}
      .market-news-refresh:disabled{opacity:.65;cursor:wait;box-shadow:none}
      .market-news-layout{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(300px,.9fr);gap:24px;align-items:start;min-width:0}
      .market-news-main,.market-news-side{display:grid;gap:16px;min-width:0}
      .market-news-side{position:sticky;top:88px}
      .market-news-coverage-notice{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid color-mix(in srgb, var(--warning) 24%, transparent);background:color-mix(in srgb, var(--warning) 8%, transparent);border-radius:var(--radius-card);padding:14px;color:var(--warning);min-width:0}
      .market-news-coverage-notice div{min-width:0}.market-news-coverage-notice strong{display:block;font-size:14px;font-weight: 700;line-height:1.4}.market-news-coverage-notice p{margin:3px 0 0;font-size:13px;font-weight: 500;line-height:1.65}
      .market-news-coverage-notice button,.market-news-filter-toggle{min-height:44px;border:1px solid color-mix(in srgb, var(--warning) 28%, transparent);background:var(--surface);color:inherit;border-radius:var(--radius-control);padding:0 13px;font: 700 12px var(--font-ui);cursor:pointer;white-space:nowrap}
      .market-news-filter-toggle{display:none;align-items:center;justify-content:center;gap:8px;border-color:color-mix(in srgb, var(--accent) 24%, transparent);color:var(--primary-hover)}
      .market-news-toolbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end;border:1px solid color-mix(in srgb, var(--accent) 14%, transparent);background:var(--surface);border-radius:var(--radius-panel);padding:14px;box-shadow: var(--shadow-sm)}
      .market-news-toolbar label{display:grid;gap:7px;min-width:0}
      .market-news-toolbar label>span{color:var(--foreground-muted);font-size:12px;font-weight: 700;line-height:1.35}
      .market-news-toolbar input,.market-news-toolbar select{width:100%;min-height:44px;min-width:0;border:1px solid color-mix(in srgb, var(--accent) 18%, transparent);background:var(--surface-muted);color:var(--foreground);border-radius:var(--radius-card);padding:0 12px;font: 500 13px var(--font-ui);outline:0}
      .market-news-toolbar input:focus,.market-news-toolbar select:focus,.market-news-refresh:focus-visible,.market-news-clear:focus-visible,.market-news-filter-toggle:focus-visible,.market-news-coverage-notice button:focus-visible,.market-news-active-filters button:focus-visible,.market-news-symbol-cloud button:focus-visible,.market-news-scope-toggle button:focus-visible,.market-news-load-row button:focus-visible,.market-news-source-action:focus-visible,.market-news-side button:focus-visible,.market-news-supporting-sources summary:focus-visible,.market-news-summary-details summary:focus-visible{border-color:var(--accent);box-shadow:var(--focus-shadow);outline:none}
      .market-news-checkbox-filter:focus-within{border-color:var(--focus-ring);box-shadow:var(--focus-shadow)}
      .market-news-search{display:flex!important;align-items:center;gap:9px;border:1px solid color-mix(in srgb, var(--accent) 18%, transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding-inline:12px;min-height:44px;color:var(--foreground-muted)}
      .market-news-search input{border:0;background:transparent;padding:0;min-height:40px}
      .market-news-checkbox-filter{display:flex!important;align-items:center;gap:9px;min-height:44px;border:1px solid color-mix(in srgb, var(--accent) 18%, transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:0 12px;cursor:pointer}
      .market-news-checkbox-filter input{width:18px!important;min-height:18px!important;height:18px;margin:0;padding:0;accent-color:var(--primary)}
      .market-news-checkbox-filter span{font-size:13px!important;color:var(--foreground)!important}
      .market-news-clear{min-height:44px;border:1px solid color-mix(in srgb, var(--danger) 20%, transparent);background:color-mix(in srgb, var(--danger) 8%, transparent);color:var(--danger);border-radius:var(--radius-card);padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font: 700 12px var(--font-ui);cursor:pointer;white-space:nowrap}
      .market-news-active-filters,.market-news-chip-row,.market-news-symbol-cloud{display:flex;gap:8px;flex-wrap:wrap;min-width:0}
      .market-news-active-filters button,.market-news-symbol-cloud button{min-height:34px;border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary-hover);border-radius: var(--radius-pill);padding:0 10px;display:inline-flex;align-items:center;gap:6px;font: 700 12px var(--font-ui);cursor:pointer}
      .market-news-scope-card,.market-news-sentiment-summary,.market-news-card,.market-news-side-card{border:1px solid color-mix(in srgb, var(--accent) 14%, transparent);background:var(--surface);border-radius:var(--radius-panel);box-shadow: var(--shadow-sm);min-width:0}
      .market-news-scope-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px}
      .market-news-scope-card small,.market-news-sentiment-summary small,.market-news-side-head small{display:block;color:var(--foreground-muted);font-size:12px;font-weight: 700;line-height:1.4}
      .market-news-scope-card strong{display:block;color:var(--foreground);font-size:18px;font-weight: 700;line-height:1.35}
      .market-news-scope-card p{margin:4px 0 0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.65}
      .market-news-scope-toggle{display:flex;gap:8px;padding:5px;border:1px solid color-mix(in srgb, var(--accent) 16%, transparent);background:var(--surface-muted);border-radius: var(--radius-pill)}
      .market-news-scope-toggle button{min-height:38px;border:0;border-radius: var(--radius-pill);background:transparent;color:var(--foreground-muted);padding:0 13px;font: 700 12px var(--font-ui);cursor:pointer}
      .market-news-scope-toggle button[aria-pressed="true"]{background:var(--primary);color:var(--primary-foreground)}
      .market-news-scope-toggle button:disabled{opacity:.45;cursor:not-allowed}
      .market-news-sentiment-summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.75fr);gap:16px;padding:17px;align-items:center;background:var(--surface)}
      .market-news-sentiment-summary h3{margin:3px 0;color:var(--foreground);font-size:19px;font-weight: 700;line-height:1.35}
      .market-news-sentiment-summary p{margin:0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.7}
      .market-news-sentiment-meter{display:grid;gap:10px;min-width:0}
      .market-news-sentiment-bar{height:12px;border-radius: var(--radius-pill);overflow:hidden;background:color-mix(in srgb, var(--foreground-muted) 12%, transparent);display:flex}
      .market-news-sentiment-bar span.positive{background:var(--success)}.market-news-sentiment-bar span.neutral{background:var(--foreground-muted)}.market-news-sentiment-bar span.negative{background:var(--danger)}
      .market-news-sentiment-pills{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .market-news-sentiment-pills span{display:grid;gap:2px;border:1px solid color-mix(in srgb, var(--accent) 12%, transparent);background:var(--surface);border-radius:var(--radius-control);padding:9px;color:var(--foreground-muted);font-size:12px;font-weight: 700;line-height:1.3}
      .market-news-sentiment-pills b{color:var(--foreground);font-family:var(--font-data);font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
      .market-news-sentiment-meter>small{color:var(--foreground-muted);font-size:12px;font-weight: 500;line-height:1.7}
      .market-news-sentiment-meter em{font-style:normal;color:var(--primary-hover);font-weight: 700}
      .market-news-story-group{display:grid;gap:12px;min-width:0}
      .market-news-group-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:2px 4px;min-width:0}
      .market-news-group-head>div{min-width:0}.market-news-group-head h3{margin:0;color:var(--foreground);font-size:18px;font-weight: 700;line-height:1.4}.market-news-group-head p{margin:3px 0 0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.6}
      .market-news-group-head>span{display:grid;place-items:center;min-width:34px;height:34px;border:1px solid color-mix(in srgb, var(--accent) 20%, transparent);background:color-mix(in srgb, var(--accent) 8%, transparent);color:var(--primary-hover);border-radius:var(--radius-control);font-size:13px;font-weight: 700}
      .market-news-story-group.lower-priority{border-top:1px solid color-mix(in srgb, var(--foreground-muted) 15%, transparent);padding-top:15px}.market-news-story-group.lower-priority .market-news-group-head>span{border-color:color-mix(in srgb, var(--foreground-muted) 18%, transparent);background:color-mix(in srgb, var(--foreground-muted) 7%, transparent);color:var(--foreground-muted)}
      .market-news-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start;min-width:0}
      .market-news-card{display:grid;gap:12px;padding:17px;align-content:start;overflow:hidden;overflow-wrap:anywhere}
      .market-news-card.featured{min-height:0;padding:20px;background:var(--surface);border-color:color-mix(in srgb, var(--accent) 22%, transparent)}
      .market-news-evidence-rail{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;border-inline-start:3px solid var(--foreground-muted);background:color-mix(in srgb, var(--foreground-muted) 5.5%, transparent);border-radius:var(--radius-control);padding:9px 11px;min-width:0}
      .market-news-evidence-rail>span{width:28px;height:28px;border-radius:var(--radius-sm);display:grid;place-items:center;color:var(--foreground-muted);background:color-mix(in srgb, var(--foreground-muted) 9%, transparent)}
      .market-news-evidence-rail div{min-width:0}.market-news-evidence-rail strong{display:block;color:var(--foreground);font-size:13px;font-weight: 700;line-height:1.45}.market-news-evidence-rail small{display:block;margin-top:2px;color:var(--foreground-muted);font-size:12px;font-weight: 500;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .market-news-evidence-rail.official,.market-news-evidence-rail.confirmed{border-inline-start-color:var(--accent);background:color-mix(in srgb, var(--accent) 7%, transparent)}.market-news-evidence-rail.official>span,.market-news-evidence-rail.confirmed>span{color:var(--accent-hover);background:color-mix(in srgb, var(--accent) 11%, transparent)}
      .market-news-evidence-rail.conflicting{border-inline-start-color:var(--warning);background:color-mix(in srgb, var(--warning) 8%, transparent)}.market-news-evidence-rail.conflicting>span{color:var(--warning);background:color-mix(in srgb, var(--warning) 12%, transparent)}
      .market-news-card-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;color:var(--foreground-muted);font-size:12px;font-weight: 700}
      .market-news-card-meta span,.market-news-card-meta time{display:inline-flex;border:1px solid color-mix(in srgb, var(--foreground-muted) 14%, transparent);background:color-mix(in srgb, var(--foreground-muted) 5%, transparent);border-radius: var(--radius-pill);padding:6px 9px;line-height:1.25}
      .market-news-card h4{margin:0;color:var(--foreground);font-size:clamp(16px,1.7vw,19px);font-weight: 700;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .market-news-card.featured h4{font-size:clamp(21px,2.6vw,28px);-webkit-line-clamp:2}
      .market-news-card h4 a{color:inherit;text-decoration:none}.market-news-card h4 a:hover,.market-news-card h4 a:focus-visible{color:var(--primary-hover);outline:none;text-decoration:underline;text-underline-offset:4px}
      .market-news-summary-details{min-width:0}.market-news-summary-details summary{display:grid;gap:5px;list-style:none;cursor:pointer;border-radius:var(--radius-sm)}.market-news-summary-details summary::-webkit-details-marker{display:none}
      .market-news-summary-preview,.market-news-summary-details>p{margin:0;color:var(--foreground-muted);font-size:14px;font-weight: 500;line-height:1.8}.market-news-summary-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .market-news-summary-more,.market-news-summary-less{color:var(--primary-hover);font-size:12px;font-weight: 700}.market-news-summary-less{display:none}.market-news-summary-details[open] .market-news-summary-preview,.market-news-summary-details[open] .market-news-summary-more{display:none}.market-news-summary-details[open] .market-news-summary-less{display:block}.market-news-summary-details>p{padding-top:7px}
      .market-news-conflict{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;border:1px solid color-mix(in srgb, var(--warning) 24%, transparent);background:color-mix(in srgb, var(--warning) 8%, transparent);color:var(--warning);border-radius:var(--radius-control);padding:11px}.market-news-conflict strong{display:block;font-size:13px;font-weight: 700;line-height:1.55}.market-news-conflict p{margin:3px 0 0;font-size:13px;font-weight: 500;line-height:1.65}.market-news-conflict small{display:block;margin-top:4px;font-size:12px;font-weight: 500;line-height:1.55}
      .market-news-entity-lines{display:grid;gap:7px}.market-news-entity-lines>div{display:grid;grid-template-columns:minmax(92px,.42fr) minmax(0,1fr);gap:9px;align-items:start}.market-news-entity-lines span{color:var(--foreground-muted);font-size:12px;font-weight: 700;line-height:1.5}.market-news-entity-lines p{display:flex;gap:6px;flex-wrap:wrap;margin:0}.market-news-entity-lines b{color:var(--foreground);font-size:12px;font-weight: 700;line-height:1.5}
      .market-news-story-reason{border-inline-start:2px solid color-mix(in srgb, var(--primary) 32%, transparent);padding-inline-start:10px}.market-news-story-reason strong{display:block;color:var(--foreground);font-size:12px;font-weight: 700}.market-news-story-reason p{margin:3px 0 0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.7}
      .market-news-story-signals{display:flex;gap:8px 16px;flex-wrap:wrap;color:var(--foreground-muted);font-size:12px;font-weight:500}.market-news-story-signals span{display:inline-flex;align-items:center;gap:4px}.market-news-story-signals b{color:var(--foreground);font-weight:700}.market-news-story-signals em{font-style:normal;color:var(--foreground-muted);font-family:var(--font-data);font-size:12px;font-variant-numeric:tabular-nums}
      .market-news-impact-analysis{display:grid;gap:9px;border:1px solid color-mix(in srgb, var(--primary) 15%, transparent);background:color-mix(in srgb, var(--primary) 4.5%, transparent);border-radius:var(--radius-card);padding:11px}.market-news-impact-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.market-news-impact-head strong{color:var(--foreground);font-size:13px;font-weight: 700}.market-news-impact-head span{color:var(--primary-hover);font-size:12px;font-weight: 700}
      .market-news-impact-analysis dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}.market-news-impact-analysis dl div{display:grid;gap:2px}.market-news-impact-analysis dt{color:var(--foreground-muted);font-size:12px;font-weight: 700}.market-news-impact-analysis dd{margin:0;color:var(--foreground);font-size:12px;font-weight: 700}.market-news-impact-analysis p{margin:0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.65}.market-news-impact-analysis>small{color:var(--foreground-muted);font-size:12px;font-weight: 500;line-height:1.55}
      .market-news-supporting-sources{border-top:1px solid color-mix(in srgb, var(--foreground-muted) 13%, transparent);padding-top:9px}.market-news-supporting-sources summary{min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none;color:var(--primary-hover);font-size:12px;font-weight:700;cursor:pointer;border-radius:var(--radius-sm)}.market-news-supporting-sources summary::-webkit-details-marker{display:none}.market-news-supporting-sources summary b{display:grid;place-items:center;min-width:27px;height:27px;border-radius:var(--radius-sm);background:color-mix(in srgb, var(--accent) 10%, transparent);font-family:var(--font-data);font-variant-numeric:tabular-nums}
      .market-news-supporting-sources>div{display:grid;gap:6px;padding-top:7px}.market-news-supporting-sources a,.market-news-supporting-sources>div>span{min-height:44px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:9px;align-items:center;border:1px solid color-mix(in srgb, var(--foreground-muted) 12%, transparent);background:var(--surface-muted);border-radius:var(--radius-control);padding:7px 9px;color:var(--foreground);text-decoration:none;font-size:12px;font-weight: 700}.market-news-supporting-sources small{color:var(--foreground-muted);font-size:12px;font-weight: 500}
      .market-news-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:1px}
      .market-news-chip-row span{display:inline-flex;align-items:center;width:max-content;border-radius: var(--radius-pill);border:1px solid color-mix(in srgb, var(--foreground-muted) 16%, transparent);background:color-mix(in srgb, var(--foreground-muted) 6%, transparent);color:var(--foreground-muted);padding:6px 9px;font-size:12px;font-weight: 700;line-height:1.2}.market-news-chip-row span.official{border-color:color-mix(in srgb, var(--accent) 20%, transparent);background:color-mix(in srgb, var(--accent) 9%, transparent);color:var(--primary-hover)}
      .market-news-source-action{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid color-mix(in srgb, var(--primary) 22%, transparent);background:color-mix(in srgb, var(--primary) 8%, transparent);color:var(--primary-hover);border-radius: var(--radius-pill);padding:0 13px;text-decoration:none;font-size:12px;font-weight: 700;white-space:nowrap}
      .market-news-load-row{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
      .market-news-load-row button,.market-news-load-row span{border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary-hover);border-radius: var(--radius-pill);padding:10px 16px;font: 700 13px var(--font-ui)}
      .market-news-load-row button{cursor:pointer}
      .market-news-load-row button:disabled{opacity:.45;cursor:not-allowed}
      .market-news-load-row small{color:var(--foreground-muted);font-size:12px;font-weight: 700}
      .market-news-side-card{display:grid;gap:13px;padding:15px}
      .market-news-side-head{display:flex;align-items:flex-start;gap:11px;min-width:0}
      .market-news-side-head>span{width:42px;height:42px;border-radius:var(--radius-card)}
      .market-news-side-head h3{margin:1px 0 0;color:var(--foreground);font-size:16px;font-weight: 700;line-height:1.35}
      .market-news-asset-panel,.market-news-no-asset{display:grid;gap:10px;min-width:0}
      .market-news-asset-panel>strong,.market-news-no-asset strong{color:var(--foreground);font-size:15px;font-weight: 700;line-height:1.4;overflow-wrap:anywhere}
      .market-news-asset-panel div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid color-mix(in srgb, var(--accent) 12%, transparent);background:var(--surface-muted);border-radius:var(--radius-control);padding:9px 10px}
      .market-news-asset-panel span{color:var(--foreground-muted);font-size:12px;font-weight: 700}
      .market-news-asset-panel b{color:var(--foreground);font-size:13px;font-weight: 700}
      .market-news-asset-panel button,.market-news-no-asset button,.market-news-mini-list button{min-height:40px;border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--primary-hover);border-radius:var(--radius-control);padding:0 12px;font: 700 12px var(--font-ui);cursor:pointer}
      .market-news-no-asset p,.market-news-muted{margin:0;color:var(--foreground-muted);font-size:13px;font-weight: 500;line-height:1.75}
      .sentiment-context-block.compact{padding:0;border:0;background:transparent;box-shadow:none}
      .sentiment-card-list.compact{gap:10px}
      .market-news-mini-list{display:grid;gap:8px}
      .market-news-mini-list button{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:start;background:var(--surface-muted);border-color:color-mix(in srgb, var(--accent) 14%, transparent);color:var(--foreground)}
      .market-news-mini-list b{color:var(--primary-hover)}
      @media(max-width:1180px){.market-news-layout{grid-template-columns:1fr}.market-news-side{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}.market-news-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.market-news-clear{width:100%}}
      @media(max-width:760px){
        .market-news-shell{padding-inline:16px;padding-bottom:calc(92px + env(safe-area-inset-bottom));gap:16px}
        .market-news-header{grid-template-columns:1fr;border-radius:var(--radius-panel);padding:16px}.market-news-header-copy p{font-size:14px}.market-news-refresh{width:100%}
        .market-news-filter-toggle{display:flex;width:100%}.market-news-toolbar{display:none;grid-template-columns:1fr;border-radius:var(--radius-panel)}.market-news-toolbar.is-open{display:grid}.market-news-toolbar input,.market-news-toolbar select{font-size:14px}
        .market-news-coverage-notice{grid-template-columns:auto minmax(0,1fr);align-items:start}.market-news-coverage-notice p{font-size:14px}.market-news-coverage-notice button{grid-column:1/-1;width:100%}
        .market-news-side{grid-template-columns:1fr}.market-news-scope-card,.market-news-sentiment-summary,.market-news-card-footer{display:grid}.market-news-scope-card p,.market-news-sentiment-summary p,.market-news-group-head p{font-size:14px}
        .market-news-scope-toggle{width:100%;overflow-x:auto}.market-news-scope-toggle button{flex:1;min-height:44px}.market-news-sentiment-summary{grid-template-columns:1fr}.market-news-sentiment-pills{grid-template-columns:repeat(3,minmax(0,1fr))}
        .market-news-list{grid-template-columns:1fr}.market-news-card,.market-news-side-card{border-radius:var(--radius-panel)}.market-news-card{padding:15px}.market-news-card.featured{padding:16px}.market-news-card.featured h4{font-size:21px}
        .market-news-card-meta{font-size:12px}.market-news-summary-preview,.market-news-summary-details>p,.market-news-story-reason p,.market-news-impact-analysis p{font-size:14px}.market-news-summary-details summary,.market-news-supporting-sources summary{min-height:44px}
        .market-news-entity-lines>div{grid-template-columns:1fr;gap:3px}.market-news-impact-analysis dl{grid-template-columns:1fr}.market-news-impact-analysis dl div{grid-template-columns:minmax(90px,.55fr) minmax(0,1fr);align-items:center}
        .market-news-supporting-sources a,.market-news-supporting-sources>div>span{grid-template-columns:minmax(0,1fr) auto}.market-news-supporting-sources svg{display:none}.market-news-source-action{width:100%}
        .market-news-load-row button,.market-news-load-row span,.market-news-asset-panel button,.market-news-no-asset button,.market-news-mini-list button{min-height:44px}
        .market-news-no-asset p,.market-news-muted{font-size:14px}
      }
    `}</style>
  );
}

export function MarketToolEmptyState({
  icon = <AlertTriangle size={18} />,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  variant = 'neutral',
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'warning' | 'neutral';
}) {
  return (
    <div className={`tool-empty-state ${variant}`}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {meta ? <small>{meta}</small> : null}
        {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
      </div>
    </div>
  );
}

export function EmptyToolState({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return <MarketToolEmptyState icon={icon} title={title} description={body} variant="neutral" />;
}

export function MarketSectionRefreshButton({
  t,
  loading,
  onRefresh,
  label,
  loadingLabel,
  disabled = false,
  title,
}: {
  t: (key: string) => string;
  loading: boolean;
  onRefresh: () => void;
  label?: string;
  loadingLabel?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button className="market-section-refresh" type="button" onClick={onRefresh} disabled={loading || disabled} title={title}>
      <Activity size={15} />
      <span>{loading ? loadingLabel ?? t('market_loading_short') : label ?? t('market_refresh_section')}</span>
    </button>
  );
}

export function MarketSectionLoading({ label, cards = 3 }: { label: string; cards?: number }) {
  return (
    <div className="market-section-loading" role="status" aria-live="polite">
      <div className="market-section-loading-head">
        <span className="market-loading-dot" />
        <strong>{label}</strong>
      </div>
      <div className="market-loading-card-grid" aria-hidden="true">
        {Array.from({ length: cards }).map((_, index) => (
          <span className="market-loading-card" key={index}>
            <i />
            <b />
            <em />
          </span>
        ))}
      </div>
    </div>
  );
}

