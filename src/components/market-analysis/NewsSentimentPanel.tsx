'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, ExternalLink, Filter, Landmark, LineChart, Newspaper, Search, ShieldAlert, Sparkles, Tags, X } from 'lucide-react';
import type { ApiListState, SelectedMarketAsset } from './types';
import { sentimentAssetBadgeType, sentimentProviderBadgeKey, sentimentContextBodyKey, sentimentAssetBadgeKey } from './utils';
import {
  textField, sentimentValues, sentimentTone, sentimentExtraMetrics,
  formatMarketToolTimestamp, publicNewsEmptyCopy, publicSentimentEmptyCopy,
  sentimentProviderStatusMeta,
} from './TechnicalAnalysisPanel';

type NewsScope = 'market' | 'asset';
type NewsSentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';
type NewsTimeFilter = 'all' | 'hour' | 'day' | 'week' | 'month';
type NewsSort = 'latest' | 'oldest' | 'relevance';

type NormalizedMarketNewsArticle = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  publishedDate: Date | null;
  url: string;
  relatedSymbols: string[];
  category: string;
  sentiment: Exclude<NewsSentimentFilter, 'all'> | null;
  impact: string;
  raw: Record<string, any>;
};

const NEWS_PAGE_SIZE = 12;

function marketIntlLocale(lang: string) {
  return lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
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

function normalizeArticleSentiment(item: Record<string, any>): NormalizedMarketNewsArticle['sentiment'] {
  const raw = normalizeText(item.sentiment ?? item.sentimentLabel ?? item.tone ?? item.analysisSentiment).toLowerCase();
  if (!raw) return null;
  if (raw.includes('positive') || raw.includes('bullish') || raw.includes('إيجابي')) return 'positive';
  if (raw.includes('negative') || raw.includes('bearish') || raw.includes('سلبي')) return 'negative';
  if (raw.includes('neutral') || raw.includes('محايد')) return 'neutral';
  return null;
}

function normalizeRelatedSymbols(item: Record<string, any>) {
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
  return [...new Set(symbols.map(symbol => normalizeText(symbol).toUpperCase()).filter(Boolean))].slice(0, 6);
}

function normalizeMarketNewsArticles(items: Record<string, any>[]) {
  const seen = new Set<string>();
  const articles: NormalizedMarketNewsArticle[] = [];
  items.forEach((item, index) => {
    const title = textField(item, ['title', 'headline', 'name']);
    if (!title) return;
    const url = safeExternalUrl(textField(item, ['canonicalUrl', 'canonical_url', 'url', 'link', 'sourceUrl', 'source_url']));
    const normalizedTitle = normalizeTitleHash(title);
    const source = textField(item, ['source', 'sourceName', 'provider', 'publisher']) || 'THE SFM';
    const providerId = textField(item, ['providerArticleId', 'provider_article_id', 'id', 'uuid']);
    const dedupeKey = url || providerId || `${source.toLowerCase()}::${normalizedTitle}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const publishedAt = textField(item, ['publishedAt', 'published_at', 'published', 'date', 'time']);
    const relatedSymbols = normalizeRelatedSymbols(item);
    articles.push({
      id: providerId || dedupeKey || `${normalizedTitle}-${index}`,
      title,
      summary: textField(item, ['summary', 'description', 'excerpt']),
      source,
      publishedAt,
      publishedDate: parseMarketNewsDate(publishedAt),
      url,
      relatedSymbols,
      category: textField(item, ['category', 'topic', 'related_bank', 'bank', 'centralBank', 'region']) || 'Macro',
      sentiment: normalizeArticleSentiment(item),
      impact: textField(item, ['impact', 'impactLevel', 'importance', 'priority']),
      raw: item,
    });
  });
  return articles;
}

function articleMatchesAsset(article: NormalizedMarketNewsArticle, selectedAsset: SelectedMarketAsset | null, assetFilter: string) {
  const query = normalizeText(assetFilter || selectedAsset?.symbol || selectedAsset?.name).toLowerCase();
  if (!query) return true;
  const haystack = [
    article.title,
    article.summary,
    article.category,
    article.relatedSymbols.join(' '),
    selectedAsset?.symbol,
    selectedAsset?.name,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
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
  onRefreshSentiment,
  onCheckSentimentHealth,
  checkingSentimentHealth,
  onOpenTechnicalAnalysis,
  onApplySentimentSuggestion,
}: {
  t: (key: string) => string;
  lang: string;
  news: ApiListState<Record<string, any>>;
  sentiment: ApiListState<Record<string, any>>;
  selectedAsset: SelectedMarketAsset | null;
  onSelectAsset: () => void;
  onRefreshNews: () => void;
  onRefreshSentiment: () => void;
  onCheckSentimentHealth: () => void;
  checkingSentimentHealth: boolean;
  onOpenTechnicalAnalysis: () => void;
  onApplySentimentSuggestion: (symbol: string) => void;
}) {
  const [scope, setScope] = useState<NewsScope>('market');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState<NewsSentimentFilter>('all');
  const [timeFilter, setTimeFilter] = useState<NewsTimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<NewsSort>('latest');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const newsEmpty = publicNewsEmptyCopy(news.code, t);
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
    ? `${t('market_last_attempt')}: ${formatMarketToolTimestamp(news.updatedAt, lang)}`
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
  const sourceOptions = useMemo(
    () => [...new Set(normalizedArticles.map(article => article.source).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const categoryOptions = useMemo(
    () => [...new Set(normalizedArticles.map(article => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [normalizedArticles],
  );
  const hasArticleSentiment = normalizedArticles.some(article => article.sentiment);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearchTerm(params.get('q') ?? '');
    setDebouncedSearch(params.get('q') ?? '');
    setAssetFilter(params.get('asset') ?? '');
    setSourceFilter(params.get('source') ?? 'all');
    setCategoryFilter(params.get('category') ?? 'all');
    const nextSentiment = params.get('sentiment') as NewsSentimentFilter | null;
    if (nextSentiment && ['all', 'positive', 'neutral', 'negative'].includes(nextSentiment)) setSentimentFilter(nextSentiment);
    const nextTime = params.get('period') as NewsTimeFilter | null;
    if (nextTime && ['all', 'hour', 'day', 'week', 'month'].includes(nextTime)) setTimeFilter(nextTime);
    const nextSort = params.get('sort') as NewsSort | null;
    if (nextSort && ['latest', 'oldest', 'relevance'].includes(nextSort)) setSortOrder(nextSort);
    const nextScope = params.get('scope') as NewsScope | null;
    if (nextScope && ['market', 'asset'].includes(nextScope)) setScope(nextScope);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchTerm), 240);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [assetFilter, categoryFilter, debouncedSearch, scope, sentimentFilter, sortOrder, sourceFilter, timeFilter]);

  useEffect(() => {
    if (scope === 'asset' && !hasSelectedAsset) setScope('market');
  }, [hasSelectedAsset, scope]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'news');
    const updateParam = (key: string, value: string, emptyValue = 'all') => {
      if (!value || value === emptyValue) params.delete(key);
      else params.set(key, value);
    };
    updateParam('q', debouncedSearch, '');
    updateParam('asset', assetFilter, '');
    updateParam('source', sourceFilter);
    updateParam('category', categoryFilter);
    updateParam('sentiment', sentimentFilter);
    updateParam('period', timeFilter);
    updateParam('sort', sortOrder, 'latest');
    updateParam('scope', scope, 'market');
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) window.history.replaceState(null, '', nextUrl);
  }, [assetFilter, categoryFilter, debouncedSearch, scope, sentimentFilter, sortOrder, sourceFilter, timeFilter]);

  const filteredArticles = useMemo(() => {
    const now = Date.now();
    const query = debouncedSearch.trim().toLowerCase();
    const assetQuery = assetFilter.trim();
    const filtered = normalizedArticles.filter(article => {
      if (scope === 'asset' && !articleMatchesAsset(article, selectedAsset, assetQuery)) return false;
      if (scope === 'market' && assetQuery && !articleMatchesAsset(article, selectedAsset, assetQuery)) return false;
      if (sourceFilter !== 'all' && article.source !== sourceFilter) return false;
      if (categoryFilter !== 'all' && article.category !== categoryFilter) return false;
      if (sentimentFilter !== 'all' && article.sentiment !== sentimentFilter) return false;
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
      ].join(' ').toLowerCase().includes(query);
    });
    return filtered.sort((a, b) => {
      const aTime = a.publishedDate?.getTime() ?? 0;
      const bTime = b.publishedDate?.getTime() ?? 0;
      if (sortOrder === 'oldest') return aTime - bTime;
      if (sortOrder === 'relevance') {
        const aMatch = articleMatchesAsset(a, selectedAsset, assetFilter) ? 1 : 0;
        const bMatch = articleMatchesAsset(b, selectedAsset, assetFilter) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      return bTime - aTime;
    });
  }, [assetFilter, categoryFilter, debouncedSearch, normalizedArticles, scope, selectedAsset, sentimentFilter, sortOrder, sourceFilter, timeFilter]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const leadArticle = visibleArticles[0];
  const standardArticles = visibleArticles.slice(1);
  const activeFilters = [
    debouncedSearch ? { key: 'q', label: debouncedSearch, onRemove: () => setSearchTerm('') } : null,
    assetFilter ? { key: 'asset', label: assetFilter, onRemove: () => setAssetFilter('') } : null,
    sourceFilter !== 'all' ? { key: 'source', label: sourceFilter, onRemove: () => setSourceFilter('all') } : null,
    categoryFilter !== 'all' ? { key: 'category', label: categoryFilter, onRemove: () => setCategoryFilter('all') } : null,
    sentimentFilter !== 'all' ? { key: 'sentiment', label: t(`market_news_sentiment_${sentimentFilter}`), onRemove: () => setSentimentFilter('all') } : null,
    timeFilter !== 'all' ? { key: 'period', label: t(`market_news_time_${timeFilter}`), onRemove: () => setTimeFilter('all') } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;
  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setAssetFilter('');
    setSourceFilter('all');
    setCategoryFilter('all');
    setSentimentFilter('all');
    setTimeFilter('all');
    setSortOrder('latest');
    setScope('market');
  };
  const articleSentimentCounts = filteredArticles.reduce(
    (counts, article) => {
      if (article.sentiment) counts[article.sentiment] += 1;
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
  const providerLabel = news.source || news.provider || (news.code ? unavailable : t('market_news_provider_connected'));
  const providerStatusTone = news.loading ? 'loading' : news.code ? 'warning' : 'connected';
  const providerStatusLabel = news.loading
    ? t('market_loading_short')
    : news.code
      ? t('market_news_provider_disconnected')
      : t('market_news_provider_connected');
  const lastUpdatedLabel = news.updatedAt ? formatMarketToolTimestamp(news.updatedAt, lang) : unavailable;

  return (
    <section className="news-sentiment-section market-news-workspace" aria-labelledby="market-news-sentiment-title">
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
              <span><b dir="ltr">{normalizedArticles.length}</b> {t('market_news_available_articles')}</span>
              {providerLabel ? <span>{t('market_news_source')}: <b dir="auto">{providerLabel}</b></span> : null}
            </div>
          </div>
          <button className="market-news-refresh" type="button" onClick={onRefreshNews} disabled={news.loading}>
            <Activity size={16} />
            <span>{news.loading ? t('market_loading_short') : t('market_refresh_news')}</span>
          </button>
        </header>

        <div className="market-news-layout">
          <main className="market-news-main" aria-label={t('market_news_feed')}>
            <section className="market-news-toolbar" aria-label={t('market_news_filters')}>
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
                <input value={assetFilter} onChange={event => setAssetFilter(event.target.value)} placeholder="AAPL / USD / Fed" dir="auto" />
              </label>
              <label>
                <span>{t('market_news_source')}</span>
                <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label>
                <span>{t('market_news_category')}</span>
                <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              {hasArticleSentiment ? (
                <label>
                  <span>{t('market_news_sentiment_filter')}</span>
                  <select value={sentimentFilter} onChange={event => setSentimentFilter(event.target.value as NewsSentimentFilter)}>
                    <option value="all">{t('market_calendar_filter_all')}</option>
                    <option value="positive">{t('market_news_sentiment_positive')}</option>
                    <option value="neutral">{t('market_news_sentiment_neutral')}</option>
                    <option value="negative">{t('market_news_sentiment_negative')}</option>
                  </select>
                </label>
              ) : null}
              <label>
                <span>{t('market_news_time_filter')}</span>
                <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as NewsTimeFilter)}>
                  <option value="all">{t('market_calendar_filter_all')}</option>
                  <option value="hour">{t('market_news_time_hour')}</option>
                  <option value="day">{t('market_news_time_day')}</option>
                  <option value="week">{t('market_news_time_week')}</option>
                  <option value="month">{t('market_news_time_month')}</option>
                </select>
              </label>
              <label>
                <span>{t('market_news_sort')}</span>
                <select value={sortOrder} onChange={event => setSortOrder(event.target.value as NewsSort)}>
                  <option value="latest">{t('market_news_sort_latest')}</option>
                  <option value="oldest">{t('market_news_sort_oldest')}</option>
                  <option value="relevance">{t('market_news_sort_relevance')}</option>
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
                <strong><span dir="ltr">{filteredArticles.length}</span> {t('market_news_results')}</strong>
                <p>{scope === 'asset' ? t('market_news_asset_scope_description') : t('market_news_market_scope_description')}</p>
              </div>
              <div className="market-news-scope-toggle" role="tablist" aria-label={t('market_news_scope_toggle')}>
                <button type="button" aria-pressed={scope === 'market'} onClick={() => setScope('market')}>
                  {t('market_news_scope_market')}
                </button>
                <button type="button" aria-pressed={scope === 'asset'} disabled={!hasSelectedAsset} onClick={() => setScope('asset')}>
                  {t('market_news_scope_asset')}
                </button>
              </div>
            </section>

            <NewsSentimentSummary
              t={t}
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
                {leadArticle ? (
                  <MarketNewsCard article={leadArticle} lang={lang} t={t} featured unavailable={unavailable} />
                ) : null}
                <div className="market-news-list">
                  {standardArticles.map(article => (
                    <MarketNewsCard key={article.id} article={article} lang={lang} t={t} unavailable={unavailable} />
                  ))}
                </div>
                <div className="market-news-load-row">
                  {visibleCount < filteredArticles.length ? (
                    <button type="button" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>
                      {t('market_news_load_more')}
                    </button>
                  ) : (
                    <span>{t('market_news_loaded_all')}</span>
                  )}
                  <small>
                    {t('market_news_loaded_count')
                      .replace('{shown}', String(Math.min(visibleCount, filteredArticles.length)))
                      .replace('{total}', String(filteredArticles.length))}
                  </small>
                </div>
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
                    <button type="button" key={item.source} onClick={() => setSourceFilter(item.source)}>
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
                    <button type="button" key={symbol} dir="ltr" onClick={() => setAssetFilter(symbol)}>{symbol}</button>
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
  counts,
  total,
  timeframe,
}: {
  t: (key: string) => string;
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
          <span><b dir="ltr">{positivePercent}%</b>{t('market_news_sentiment_positive')}</span>
          <span><b dir="ltr">{neutralPercent}%</b>{t('market_news_sentiment_neutral')}</span>
          <span><b dir="ltr">{negativePercent}%</b>{t('market_news_sentiment_negative')}</span>
        </div>
        <small>
          {t('market_news_analyzed_articles').replace('{count}', String(total)).replace('{timeframe}', timeframe)}
          {' '}
          <em title={t('market_news_ai_tooltip')}>{t('market_news_ai_badge')}</em>
        </small>
      </div>
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
  return (
    <article className={`market-news-card ${featured ? 'featured' : ''}`}>
      <div className="market-news-card-meta">
        <span dir="auto">{article.source}</span>
        <span dir="auto">{article.category}</span>
        <time dateTime={article.publishedDate?.toISOString()}>{publishedLabel}</time>
      </div>
      <h3 dir="auto">
        {article.url ? (
          <a href={article.url} target="_blank" rel="noopener noreferrer nofollow">{article.title}</a>
        ) : article.title}
      </h3>
      {article.summary ? <p dir="auto">{article.summary}</p> : null}
      <div className="market-news-card-footer">
        <div className="market-news-chip-row">
          {article.relatedSymbols.slice(0, 4).map(symbol => (
            <span key={symbol} dir="ltr">{symbol}</span>
          ))}
          {article.sentiment ? <span className={`market-news-sentiment-chip ${article.sentiment}`}>{t(`market_news_sentiment_${article.sentiment}`)}</span> : null}
          {article.impact ? <span className="market-news-impact-chip" dir="auto">{article.impact}</span> : null}
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
      .news-sentiment-section.market-news-workspace{width:100%;max-width:1500px;min-width:0;overflow:visible}
      .market-news-workspace{width:100%;max-width:100%;min-width:0}
      .market-news-shell{width:100%;max-width:1500px;margin-inline:auto;display:grid;gap:20px;min-width:0}
      .market-news-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:start;border:1px solid rgba(47,214,192,.18);background:linear-gradient(135deg,rgba(255,255,255,.90),rgba(234,246,255,.70));border-radius:30px;padding:20px;box-shadow:0 16px 44px rgba(3,18,37,.08)}
      .market-news-header-icon,.market-news-side-head>span{width:52px;height:52px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));border:1px solid rgba(47,214,192,.24);color:var(--sfm-primary-hover);flex:0 0 auto}
      .market-news-header-copy{display:grid;gap:8px;min-width:0}
      .market-news-header-copy small{color:var(--sfm-primary-hover);font-size:12px;font-weight:950;line-height:1.4}
      .market-news-header-copy h2{margin:0;color:var(--sfm-foreground);font-size:clamp(24px,3vw,34px);font-weight:950;line-height:1.2}
      .market-news-header-copy p{margin:0;max-width:780px;color:var(--sfm-muted);font-size:15px;font-weight:850;line-height:1.75}
      .market-news-meta-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .market-news-meta-row>span,.market-news-status{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(100,116,139,.14);background:rgba(100,116,139,.06);color:var(--sfm-muted);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
      .market-news-status.connected{border-color:rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover)}
      .market-news-status.warning{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.12);color:#B45309}
      .market-news-status.loading{border-color:rgba(29,140,255,.24);background:rgba(29,140,255,.10);color:#2563EB}
      .market-news-refresh{min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 12px 24px rgba(29,140,255,.18);white-space:nowrap}
      .market-news-refresh:disabled{opacity:.65;cursor:wait;box-shadow:none}
      .market-news-layout{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(300px,.9fr);gap:24px;align-items:start;min-width:0}
      .market-news-main,.market-news-side{display:grid;gap:16px;min-width:0}
      .market-news-side{position:sticky;top:88px}
      .market-news-toolbar{display:grid;grid-template-columns:minmax(240px,1.4fr) repeat(5,minmax(140px,1fr)) auto;gap:10px;align-items:end;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:26px;padding:14px;box-shadow:0 12px 32px rgba(3,18,37,.05)}
      .market-news-toolbar label{display:grid;gap:7px;min-width:0}
      .market-news-toolbar label>span{color:var(--sfm-muted);font-size:12px;font-weight:950;line-height:1.35}
      .market-news-toolbar input,.market-news-toolbar select{width:100%;min-height:44px;min-width:0;border:1px solid rgba(167,243,240,.18);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:15px;padding:0 12px;font:850 13px Tajawal,Arial,sans-serif;outline:0}
      .market-news-toolbar input:focus,.market-news-toolbar select:focus,.market-news-clear:focus-visible,.market-news-scope-toggle button:focus-visible,.market-news-load-row button:focus-visible,.market-news-source-action:focus-visible,.market-news-side button:focus-visible{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18);outline:none}
      .market-news-search{display:flex!important;align-items:center;gap:9px;border:1px solid rgba(167,243,240,.18);background:var(--sfm-light-card);border-radius:15px;padding-inline:12px;min-height:44px;color:var(--sfm-muted)}
      .market-news-search input{border:0;background:transparent;padding:0;min-height:40px}
      .market-news-clear{min-height:44px;border:1px solid rgba(239,68,68,.20);background:rgba(239,68,68,.08);color:#B91C1C;border-radius:15px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}
      .market-news-active-filters,.market-news-chip-row,.market-news-symbol-cloud{display:flex;gap:8px;flex-wrap:wrap;min-width:0}
      .market-news-active-filters button,.market-news-symbol-cloud button{min-height:34px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
      .market-news-scope-card,.market-news-sentiment-summary,.market-news-card,.market-news-side-card{border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:26px;box-shadow:0 12px 32px rgba(3,18,37,.05);min-width:0}
      .market-news-scope-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px}
      .market-news-scope-card small,.market-news-sentiment-summary small,.market-news-side-head small{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950;line-height:1.4}
      .market-news-scope-card strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.35}
      .market-news-scope-card p{margin:4px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.65}
      .market-news-scope-toggle{display:flex;gap:8px;padding:5px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-light-card);border-radius:999px}
      .market-news-scope-toggle button{min-height:38px;border:0;border-radius:999px;background:transparent;color:var(--sfm-muted);padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
      .market-news-scope-toggle button[aria-pressed="true"]{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff}
      .market-news-scope-toggle button:disabled{opacity:.45;cursor:not-allowed}
      .market-news-sentiment-summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.75fr);gap:16px;padding:17px;align-items:center;background:linear-gradient(135deg,rgba(29,140,255,.05),rgba(47,214,192,.08)),var(--sfm-card)}
      .market-news-sentiment-summary h3{margin:3px 0;color:var(--sfm-foreground);font-size:19px;font-weight:950;line-height:1.35}
      .market-news-sentiment-summary p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.7}
      .market-news-sentiment-meter{display:grid;gap:10px;min-width:0}
      .market-news-sentiment-bar{height:12px;border-radius:999px;overflow:hidden;background:rgba(100,116,139,.12);display:flex}
      .market-news-sentiment-bar span.positive{background:#16A34A}.market-news-sentiment-bar span.neutral{background:#64748B}.market-news-sentiment-bar span.negative{background:#DC2626}
      .market-news-sentiment-pills{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .market-news-sentiment-pills span{display:grid;gap:2px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:14px;padding:9px;color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.3}
      .market-news-sentiment-pills b{color:var(--sfm-foreground);font-size:15px;font-weight:950}
      .market-news-sentiment-meter>small{color:var(--sfm-muted);font-size:11px;font-weight:850;line-height:1.7}
      .market-news-sentiment-meter em{font-style:normal;color:var(--sfm-primary-hover);font-weight:950}
      .market-news-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
      .market-news-card{display:grid;gap:11px;padding:17px;align-content:start}
      .market-news-card.featured{min-height:0;padding:20px;background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(47,214,192,.10)),var(--sfm-card);border-color:rgba(47,214,192,.22)}
      .market-news-card-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;color:var(--sfm-muted);font-size:12px;font-weight:950}
      .market-news-card-meta span,.market-news-card-meta time{display:inline-flex;border:1px solid rgba(100,116,139,.14);background:rgba(100,116,139,.06);border-radius:999px;padding:6px 9px;line-height:1.2}
      .market-news-card.featured .market-news-card-meta span:first-child{border-color:rgba(47,214,192,.25);background:rgba(47,214,192,.11);color:var(--sfm-primary-hover)}
      .market-news-card h3{margin:0;color:var(--sfm-foreground);font-size:clamp(16px,1.7vw,19px);font-weight:950;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .market-news-card.featured h3{font-size:clamp(21px,2.6vw,28px)}
      .market-news-card h3 a{color:inherit;text-decoration:none}
      .market-news-card h3 a:hover,.market-news-card h3 a:focus-visible{color:var(--sfm-primary-hover);outline:none;text-decoration:underline;text-underline-offset:4px}
      .market-news-card p{margin:0;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .market-news-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}
      .market-news-chip-row span{display:inline-flex;align-items:center;width:max-content;border-radius:999px;border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.09);color:var(--sfm-primary-hover);padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2}
      .market-news-sentiment-chip.positive{border-color:rgba(22,163,74,.22);background:rgba(22,163,74,.10);color:#047857}
      .market-news-sentiment-chip.neutral{border-color:rgba(100,116,139,.18);background:rgba(100,116,139,.08);color:var(--sfm-muted)}
      .market-news-sentiment-chip.negative{border-color:rgba(220,38,38,.20);background:rgba(220,38,38,.09);color:#B91C1C}
      .market-news-impact-chip{border-color:rgba(245,158,11,.24)!important;background:rgba(245,158,11,.11)!important;color:#B45309!important}
      .market-news-source-action{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(29,140,255,.22);background:rgba(29,140,255,.08);color:var(--sfm-primary-hover);border-radius:999px;padding:0 12px;text-decoration:none;font-size:12px;font-weight:950;white-space:nowrap}
      .market-news-load-row{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
      .market-news-load-row button,.market-news-load-row span{border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:10px 16px;font:950 13px Tajawal,Arial,sans-serif}
      .market-news-load-row button{cursor:pointer}
      .market-news-load-row small{color:var(--sfm-muted);font-size:12px;font-weight:900}
      .market-news-side-card{display:grid;gap:13px;padding:15px}
      .market-news-side-head{display:flex;align-items:flex-start;gap:11px;min-width:0}
      .market-news-side-head>span{width:42px;height:42px;border-radius:16px}
      .market-news-side-head h3{margin:1px 0 0;color:var(--sfm-foreground);font-size:16px;font-weight:950;line-height:1.35}
      .market-news-asset-panel,.market-news-no-asset{display:grid;gap:10px;min-width:0}
      .market-news-asset-panel>strong,.market-news-no-asset strong{color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.4;overflow-wrap:anywhere}
      .market-news-asset-panel div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:14px;padding:9px 10px}
      .market-news-asset-panel span{color:var(--sfm-muted);font-size:11px;font-weight:950}
      .market-news-asset-panel b{color:var(--sfm-foreground);font-size:13px;font-weight:950}
      .market-news-asset-panel button,.market-news-no-asset button,.market-news-mini-list button{min-height:40px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:14px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
      .market-news-no-asset p,.market-news-muted{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.75}
      .sentiment-context-block.compact{padding:0;border:0;background:transparent;box-shadow:none}
      .sentiment-card-list.compact{gap:10px}
      .market-news-mini-list{display:grid;gap:8px}
      .market-news-mini-list button{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:start;background:var(--sfm-light-card);border-color:rgba(167,243,240,.14);color:var(--sfm-foreground)}
      .market-news-mini-list b{color:var(--sfm-primary-hover)}
      .dark .market-news-header,.dark .market-news-scope-card,.dark .market-news-sentiment-summary,.dark .market-news-card,.dark .market-news-side-card,.dark .market-news-toolbar{background:#0f1d31;border-color:#1d3050;box-shadow:0 18px 46px rgba(0,0,0,.26)}
      .dark .market-news-search,.dark .market-news-toolbar input,.dark .market-news-toolbar select,.dark .market-news-scope-toggle,.dark .market-news-asset-panel div,.dark .market-news-mini-list button,.dark .market-news-sentiment-pills span{background:#0a1422;border-color:#1d3050}
      .dark .market-news-meta-row>span,.dark .market-news-card-meta span,.dark .market-news-card-meta time{background:rgba(148,163,184,.10);border-color:#1d3050}
      .dark .market-news-status.connected,.dark .market-news-chip-row span,.dark .market-news-active-filters button,.dark .market-news-symbol-cloud button{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.24)}
      .dark .market-news-sentiment-chip.positive{color:#2FD6C0}.dark .market-news-sentiment-chip.negative{color:#FF5B6E}.dark .market-news-impact-chip{color:#FDE68A!important}
      @media(max-width:1180px){.market-news-layout{grid-template-columns:1fr}.market-news-side{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}.market-news-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.market-news-clear{width:100%}}
      @media(max-width:760px){.market-news-header{grid-template-columns:1fr;border-radius:24px;padding:16px}.market-news-refresh{width:100%}.market-news-toolbar{grid-template-columns:1fr;border-radius:22px}.market-news-side{grid-template-columns:1fr}.market-news-scope-card,.market-news-sentiment-summary,.market-news-card-footer{display:grid}.market-news-scope-toggle{width:100%;overflow-x:auto}.market-news-scope-toggle button{flex:1;min-height:44px}.market-news-sentiment-summary{grid-template-columns:1fr}.market-news-list{grid-template-columns:1fr}.market-news-card,.market-news-side-card{border-radius:22px}.market-news-card.featured h3{font-size:21px}.market-news-source-action{width:100%}.market-news-sentiment-pills{grid-template-columns:1fr}}
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

