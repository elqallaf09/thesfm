'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, ExternalLink, Newspaper, RefreshCcw, Star, TrendingUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechNewsItem, TechNewsPayload } from '@/lib/market/fetchTechNews';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import {
  TechNewsFilters,
  type TechNewsDashboardCategory,
  type TechNewsSort,
  type TechNewsTimeFilter,
} from '@/components/tech-news/TechNewsFilters';
import { TechNewsHeader } from '@/components/tech-news/TechNewsHeader';
import { TechNewsSkeleton } from '@/components/tech-news/TechNewsSkeleton';
import { TechTickerStrip } from '@/components/tech-news/TechTickerStrip';

type ApiResponse = TechNewsPayload | { success: false; error?: string; reason?: string };
type MentionedTicker = {
  ticker: string;
  companyName: string;
  count: number;
};

const NEWS_PAGE_SIZE = 12;
const FEATURED_NEWS_COUNT = 4;

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function minutesAgo(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function itemSearchText(item: TechNewsItem) {
  return [
    item.companyName,
    item.ticker,
    item.source,
    item.sector,
    ...(item.sectors ?? []),
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
  ].join(' ').toLowerCase();
}

function hasKeyword(item: TechNewsItem, keywords: string[]) {
  const haystack = itemSearchText(item);
  return keywords.some(keyword => haystack.includes(keyword.toLowerCase()));
}

const CATEGORY_SEARCH_TERMS: Record<TechNewsDashboardCategory, string[]> = {
  all: ['all', 'technology', 'tech market', 'الكل', 'التقنية', 'السوق التقني', 'tout', 'technologie'],
  techStocks: ['tech stocks', 'technology stocks', 'technology market', 'nasdaq', 'أسهم التقنية', 'أسهم تكنولوجية', 'actions technologiques'],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'openai', 'anthropic', 'copilot', 'gemini', 'الذكاء الاصطناعي', 'تعلم الآلة', 'intelligence artificielle'],
  semiconductors: ['semiconductors', 'semiconductor', 'chips', 'chip', 'gpu', 'cpu', 'nvidia', 'amd', 'intel', 'broadcom', 'tsmc', 'qualcomm', 'micron', 'asml', 'أشباه الموصلات', 'الرقائق', 'semi-conducteurs', 'puces'],
  software: ['software', 'saas', 'microsoft', 'salesforce', 'oracle', 'adobe', 'servicenow', 'palantir', 'datadog', 'snowflake', 'البرمجيات', 'Logiciels'],
  cloud: ['cloud', 'cloud computing', 'aws', 'azure', 'google cloud', 'oracle cloud', 'cloud infrastructure', 'data center', 'الحوسبة السحابية', 'السحابة', 'cloud computing'],
  cybersecurity: ['cybersecurity', 'cyber security', 'palo alto', 'crowdstrike', 'fortinet', 'zscaler', 'ransomware', 'data breach', 'الأمن السيبراني', 'اختراق البيانات', 'cybersécurité'],
  ecommerce: ['e-commerce', 'ecommerce', 'online retail', 'marketplace', 'amazon', 'shopify', 'mercadolibre', 'alibaba', 'التجارة الإلكترونية', 'متجر إلكتروني'],
  hardware: ['devices', 'smartphones', 'hardware', 'apple', 'samsung', 'iphone', 'mac', 'الأجهزة', 'الهواتف', 'هواتف ذكية', 'appareils', 'smartphones'],
  gaming: ['gaming', 'digital entertainment', 'sony', 'nintendo', 'roblox', 'unity', 'electronic arts', 'streaming', 'entertainment', 'الألعاب', 'الترفيه الرقمي', 'jeux', 'divertissement numérique'],
};

function itemMatchesSearch(item: TechNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = itemSearchText(item);
  const categoryTerms = Object.entries(CATEGORY_SEARCH_TERMS)
    .filter(([, terms]) => terms.some(term => term.toLowerCase().includes(needle) || needle.includes(term.toLowerCase())))
    .flatMap(([category, terms]) => [category, ...terms]);
  return haystack.includes(needle) || categoryTerms.some(term => haystack.includes(term.toLowerCase()));
}

function categoryMatches(item: TechNewsItem, category: TechNewsDashboardCategory) {
  if (category === 'all') return true;
  const sectors = new Set([item.sector, ...(item.sectors ?? [])]);
  const ticker = String(item.ticker ?? '').toUpperCase();

  if (category === 'ai') return sectors.has('ai') || hasKeyword(item, ['AI', 'artificial intelligence', 'machine learning', 'OpenAI', 'Anthropic', 'Nvidia', 'Microsoft Copilot', 'Gemini']);
  if (category === 'semiconductors') return sectors.has('semiconductors') || hasKeyword(item, ['NVIDIA', 'AMD', 'Intel', 'Broadcom', 'TSMC', 'Qualcomm', 'Micron', 'ASML', 'chips', 'chip', 'semiconductors', 'semiconductor']);
  if (category === 'software') return sectors.has('software') || hasKeyword(item, ['Microsoft', 'Salesforce', 'Oracle', 'Adobe', 'ServiceNow', 'Palantir', 'Datadog', 'Snowflake', 'software', 'SaaS']);
  if (category === 'cloud') return sectors.has('cloud') || hasKeyword(item, ['AWS', 'Azure', 'Google Cloud', 'Oracle Cloud', 'cloud infrastructure', 'cloud computing', 'data center']);
  if (category === 'cybersecurity') return sectors.has('cybersecurity') || hasKeyword(item, ['Palo Alto Networks', 'CrowdStrike', 'Fortinet', 'Zscaler', 'cybersecurity', 'ransomware', 'data breach']);
  if (category === 'ecommerce') return sectors.has('ecommerce') || hasKeyword(item, ['Amazon', 'Shopify', 'MercadoLibre', 'Alibaba', 'online retail', 'marketplace', 'e-commerce', 'ecommerce']);
  if (category === 'hardware') return sectors.has('hardware') || hasKeyword(item, ['Apple', 'Samsung', 'iPhone', 'Mac', 'devices', 'hardware', 'smartphones']);
  if (category === 'gaming') return sectors.has('gaming') || hasKeyword(item, ['Sony', 'Nintendo', 'Roblox', 'Unity', 'Electronic Arts', 'gaming', 'streaming', 'entertainment']);

  if (category === 'techStocks') {
    const isSpecificCategory = ([
      'ai',
      'semiconductors',
      'software',
      'cloud',
      'cybersecurity',
      'ecommerce',
      'hardware',
      'gaming',
    ] as TechNewsDashboardCategory[]).some(specificCategory => categoryMatches(item, specificCategory));
    return Boolean(ticker && ticker !== 'TECH') && !isSpecificCategory;
  }

  return false;
}

function timeMatches(item: TechNewsItem, filter: TechNewsTimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = (Date.now() - date.getTime()) / 86400000;
  if (filter === 'today') return diffDays <= 1;
  if (filter === 'week') return diffDays <= 7;
  return diffDays <= 31;
}

function relevanceScore(item: TechNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return new Date(item.publishedAt).getTime() / 1000000000;
  let score = 0;
  if (item.ticker.toLowerCase() === needle) score += 80;
  if (item.companyName.toLowerCase().includes(needle)) score += 40;
  if (item.title.toLowerCase().includes(needle)) score += 30;
  if (item.summary.toLowerCase().includes(needle)) score += 15;
  if ((item.titleOriginal ?? '').toLowerCase().includes(needle)) score += 10;
  return score + new Date(item.publishedAt).getTime() / 10000000000;
}

function impactScore(item: TechNewsItem) {
  const changeImpact = Math.abs(Number(item.changePercent ?? 0));
  const tickerBonus = item.ticker && item.ticker !== 'TECH' ? 0.5 : 0;
  return changeImpact + tickerBonus;
}

export function TechNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<TechNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TechNewsDashboardCategory>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TechNewsTimeFilter>('all');
  const [sort, setSort] = useState<TechNewsSort>('recent');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/tech-news?lang=${encodeURIComponent(lang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('tech_news_error') : t('tech_news_error'));
      }
      setItems(json.items);
      setPrices(json.prices ?? []);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setPrices([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : t('tech_news_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [lang, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [category, lang, query, sort, sourceFilter, timeFilter]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(items.map(item => item.source).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [items]);

  const baseFilteredItems = useMemo(() => {
    return items
      .filter(item => sourceFilter === 'all' || item.source === sourceFilter)
      .filter(item => timeMatches(item, timeFilter))
      .filter(item => itemMatchesSearch(item, query));
  }, [items, query, sourceFilter, timeFilter]);

  const categoryCounts = useMemo(() => ({
    all: baseFilteredItems.filter(item => categoryMatches(item, 'all')).length,
    techStocks: baseFilteredItems.filter(item => categoryMatches(item, 'techStocks')).length,
    ai: baseFilteredItems.filter(item => categoryMatches(item, 'ai')).length,
    semiconductors: baseFilteredItems.filter(item => categoryMatches(item, 'semiconductors')).length,
    software: baseFilteredItems.filter(item => categoryMatches(item, 'software')).length,
    cloud: baseFilteredItems.filter(item => categoryMatches(item, 'cloud')).length,
    cybersecurity: baseFilteredItems.filter(item => categoryMatches(item, 'cybersecurity')).length,
    ecommerce: baseFilteredItems.filter(item => categoryMatches(item, 'ecommerce')).length,
    hardware: baseFilteredItems.filter(item => categoryMatches(item, 'hardware')).length,
    gaming: baseFilteredItems.filter(item => categoryMatches(item, 'gaming')).length,
  }), [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    const nextItems = baseFilteredItems.filter(item => categoryMatches(item, category));

    return nextItems.sort((a, b) => {
      if (sort === 'impact') {
        const impactDiff = impactScore(b) - impactScore(a);
        if (impactDiff !== 0) return impactDiff;
      }
      if (sort === 'relevance') {
        const relevanceDiff = relevanceScore(b, query) - relevanceScore(a, query);
        if (relevanceDiff !== 0) return relevanceDiff;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [baseFilteredItems, category, query, sort]);

  const featuredItems = filteredItems.slice(0, FEATURED_NEWS_COUNT);
  const listItems = filteredItems.slice(featuredItems.length);
  const visibleNewsItems = listItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < listItems.length;

  const mentionedTickers = useMemo(() => {
    const counts = new Map<string, MentionedTicker>();
    filteredItems.forEach(item => {
      const ticker = String(item.ticker ?? '').trim().toUpperCase();
      if (!ticker || ticker === 'TECH') return;
      const companyName = item.companyName && item.companyName !== 'Technology Market' ? item.companyName : ticker;
      const current = counts.get(ticker);
      counts.set(ticker, {
        ticker,
        companyName: current?.companyName && current.companyName !== ticker ? current.companyName : companyName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredItems.forEach(item => {
      if (!item.source) return;
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredItems]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatPrice = (value: number | null) => {
    if (value === null) return t('tech_news_price_unavailable');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

  const updatedMinutes = minutesAgo(lastUpdated);
  const headerSubtitle = updatedMinutes === null
    ? `${t('tech_news_subtitle')} - ${t('tech_news_updated_daily')}`
    : `${t('tech_news_subtitle')} - ${t('tech_news_last_updated_before')} ${updatedMinutes} ${t('tech_news_minutes')}`;

  const categoryLabels = {
    all: t('tech_news_dashboard_category_all'),
    techStocks: t('tech_news_dashboard_category_tech_stocks'),
    ai: t('tech_news_dashboard_category_ai'),
    semiconductors: t('tech_news_dashboard_category_semiconductors'),
    software: t('tech_news_dashboard_category_software'),
    cloud: t('tech_news_dashboard_category_cloud'),
    cybersecurity: t('tech_news_dashboard_category_cybersecurity'),
    ecommerce: t('tech_news_dashboard_category_ecommerce'),
    hardware: t('tech_news_dashboard_category_hardware'),
    gaming: t('tech_news_dashboard_category_gaming'),
  };
  const timeLabels = {
    all: t('tech_news_time_all'),
    today: t('tech_news_time_today'),
    week: t('tech_news_time_week'),
    month: t('tech_news_time_month'),
  };
  const sortLabels = {
    recent: t('tech_news_sort_recent'),
    relevance: t('tech_news_sort_relevance'),
    impact: t('tech_news_sort_impact'),
  };
  const emptyTitle = category === 'all' ? t('tech_news_empty') : t('tech_news_empty_category');
  const emptyHint = category === 'all' ? t('tech_news_empty_hint') : t('tech_news_empty_category_hint');
  const resultsCountLabel = t('tech_news_results_count').replace('{count}', String(filteredItems.length));

  return (
    <div className="tech-news-shell" dir={dir}>
      <Sidebar />
      <main className="tech-news-main">
        <TechTickerStrip
          prices={prices}
          formatPrice={formatPrice}
          labels={{
            priceUnavailable: t('market_unavailable_short'),
            delayedGlobal: t('market_prices_delayed'),
          }}
        />

        <TechNewsHeader
          title={t('tech_news_title')}
          subtitle={headerSubtitle}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />

        {!loading && !error && featuredItems.length > 0 ? (
          <FeaturedNewsSection
            items={featuredItems}
            labels={{
              title: t('tech_news_featured_title'),
              readNews: t('tech_news_read_news'),
              source: t('tech_news_source'),
              openArticle: t('tech_news_open_article'),
              linkUnavailable: t('tech_news_link_unavailable'),
            }}
            formatDateTime={formatDateTime}
          />
        ) : null}

        <TechNewsFilters
          query={query}
          category={category}
          source={sourceFilter}
          timeFilter={timeFilter}
          sort={sort}
          sources={sourceOptions}
          labels={{
            search: t('tech_news_search_placeholder'),
            filter: t('tech_news_filter_news'),
            source: t('tech_news_source_filter'),
            allSources: t('tech_news_source_all'),
            time: t('tech_news_time_filter'),
            sort: t('tech_news_sort'),
            categories: categoryLabels,
            times: timeLabels,
            sorts: sortLabels,
          }}
          categoryCounts={categoryCounts}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onSourceChange={setSourceFilter}
          onTimeFilterChange={setTimeFilter}
          onSortChange={setSort}
        />

        {loading ? (
          <TechNewsSkeleton />
        ) : error ? (
          <section className="tech-news-state error" role="alert">
            <AlertTriangle size={24} />
            <strong>{t('tech_news_error')}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCcw size={16} />
              {t('market_retry')}
            </button>
          </section>
        ) : filteredItems.length === 0 ? (
          <section className="tech-news-state">
            <Newspaper size={24} />
            <strong>{emptyTitle}</strong>
            <p>{emptyHint}</p>
          </section>
        ) : (
          <section className="tech-news-layout" aria-label={t('tech_news_title')}>
            <div className="tech-news-content-column">
              <div className="tech-news-results-bar">
                <span>{resultsCountLabel}</span>
                <b>{t('tech_news_showing_count').replace('{count}', String(featuredItems.length + visibleNewsItems.length))}</b>
              </div>
              {visibleNewsItems.length > 0 ? (
                <section className="tech-news-grid" aria-label={t('tech_news_title')}>
                  {visibleNewsItems.map(item => (
                    <TechNewsCard
                      key={item.id}
                      item={item}
                      labels={{
                        source: t('tech_news_source'),
                        published: t('tech_news_published'),
                        openArticle: t('tech_news_open_article'),
                        readMore: t('tech_news_read_more'),
                        priceUnavailable: t('tech_news_price_unavailable'),
                        translated: t('news_translated_badge'),
                        originalLanguage: t('news_original_language_badge'),
                        linkUnavailable: t('tech_news_link_unavailable'),
                      }}
                      formatDateTime={formatDateTime}
                      formatPrice={formatPrice}
                    />
                  ))}
                </section>
              ) : null}
              <div className="tech-news-load-more-wrap">
                {hasMoreItems ? (
                  <button type="button" className="tech-news-load-more" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>
                    {t('tech_news_load_more')}
                  </button>
                ) : (
                  <span>{t('tech_news_all_loaded')}</span>
                )}
              </div>
            </div>
            <TechNewsSidePanel
              latestItems={filteredItems.slice(0, 5)}
              mentionedTickers={mentionedTickers}
              sourceCounts={sourceCounts}
              labels={{
                latest: t('tech_news_side_latest'),
                mentioned: t('tech_news_side_mentioned'),
                sources: t('tech_news_side_sources'),
                articles: t('tech_news_articles_count'),
                mentions: t('tech_news_mentions_count'),
                source: t('tech_news_source'),
              }}
              formatDateTime={formatDateTime}
            />
          </section>
        )}

        <p className="tech-news-disclaimer">{t('tech_news_disclaimer')}</p>
      </main>

      <style jsx global>{`
        .tech-news-shell{
          --tech-bg:#F4F8FC;
          --tech-panel:var(--sfm-card);
          --tech-panel-soft:var(--sfm-light-card);
          --tech-border:rgba(29,140,255,.14);
          --tech-border-strong:rgba(29,140,255,.22);
          --tech-text:var(--sfm-primary-dark);
          --tech-muted:var(--sfm-muted);
          --tech-accent:var(--sfm-soft-cyan);
          --tech-accent-strong:var(--sfm-accent);
          min-height:100dvh;
          background:var(--tech-bg);
          color:var(--tech-text);
          font-family:Tajawal,Arial,sans-serif;
          overflow-x:hidden;
        }
        .tech-news-shell,.tech-news-shell *{box-sizing:border-box}
        .dark .tech-news-shell{
          --tech-bg:#0A1422;
          --tech-panel:#0F1D31;
          --tech-panel-soft:#0B1829;
          --tech-border:#1D3050;
          --tech-border-strong:#2A456C;
          --tech-text:#E8EEF6;
          --tech-muted:#8EA6C3;
          --tech-accent:#2FD6C0;
          --tech-accent-strong:#3DE7D0;
        }
        .tech-news-main{width:100%;max-width:100%;margin:0;padding:18px 22px 32px;display:grid;gap:20px;overflow-x:hidden;min-width:0;box-sizing:border-box}
        @media(min-width:1025px){[dir="rtl"].tech-news-shell .tech-news-main{width:100%;margin:0;padding-right:calc(var(--sidebar-w,230px) + 32px);padding-left:32px}[dir="ltr"].tech-news-shell .tech-news-main{width:100%;margin:0;padding-left:calc(var(--sidebar-w,230px) + 32px);padding-right:32px}.tech-news-main>*{width:100%;max-width:1280px;margin-inline:auto}}
        .tech-ticker-strip{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;border:1px solid var(--tech-border);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border-radius:18px;overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}
        .tech-ticker-delay-badge{position:relative;z-index:3;margin-inline-start:10px;border:1px solid rgba(245,185,66,.24);background:rgba(245,185,66,.12);color:#B45309;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:950;line-height:1.25;white-space:nowrap;direction:rtl;unicode-bidi:isolate}.dark .tech-ticker-delay-badge{color:#F5B942}
        .tech-ticker-viewport{width:100%;overflow:hidden;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.tech-ticker-viewport::-webkit-scrollbar{display:none}.tech-ticker-track{width:max-content;display:flex;align-items:center;animation:techTickerMarquee 34s linear infinite;will-change:transform}.tech-ticker-strip:hover .tech-ticker-track,.tech-ticker-strip:focus-within .tech-ticker-track,.tech-ticker-strip:active .tech-ticker-track,.tech-ticker-strip.is-paused .tech-ticker-track{animation-play-state:paused}.tech-ticker-set{display:flex;align-items:center;flex:0 0 auto}@keyframes techTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .tech-ticker-item{flex:0 0 auto;min-height:44px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--tech-border);white-space:nowrap}
        .tech-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--tech-text);font-size:12px;font-weight:950}
        .tech-ticker-item span{direction:ltr;unicode-bidi:isolate;color:var(--tech-muted);font-size:12px;font-weight:900}
        .tech-ticker-item b{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;line-height:1.2}
        .tech-ticker-item small{color:var(--tech-muted);font-size:11px;font-weight:900}
        .tech-ticker-item b.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.tech-ticker-item b.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.tech-ticker-item b.neutral{color:var(--tech-muted);background:rgba(142,166,195,.10);border-color:var(--tech-border)}
        .tech-news-header{width:100%;max-width:100%;display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:16px;padding:4px 0 2px;min-width:0}
        .tech-news-title-row{display:flex;align-items:center;gap:14px;min-width:0;max-width:100%;flex:1 1 420px}.tech-news-title-copy{min-width:0;max-width:100%;text-align:start}
        .tech-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--tech-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}
        .tech-news-header h1{margin:0;max-width:100%;color:var(--tech-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950;letter-spacing:0;overflow-wrap:anywhere}
        .tech-news-header p{margin:8px 0 0;max-width:100%;color:var(--tech-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6;overflow-wrap:anywhere}
        .tech-news-status-dot{width:8px;height:8px;border-radius:50%;background:var(--tech-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}
        .tech-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto;min-width:0}
        .tech-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--tech-border);background:var(--tech-panel);color:var(--tech-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}
        .tech-news-icon-btn:hover,.tech-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--tech-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}
        .tech-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:techNewsSpin .9s linear infinite}@keyframes techNewsSpin{to{transform:rotate(360deg)}}
        .tech-news-sun,.dark .tech-news-moon{display:block}.tech-news-moon,.dark .tech-news-sun{display:none}
        .tech-news-featured{width:100%;max-width:100%;display:grid;gap:14px;border:1px solid var(--tech-border);background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.085)),var(--tech-panel);border-radius:26px;padding:18px;box-shadow:0 18px 48px rgba(3,18,37,.10);min-width:0;overflow:hidden}.tech-news-featured-head{display:flex;align-items:center;gap:10px;color:var(--tech-accent);min-width:0}.tech-news-featured-head span{width:36px;height:36px;border-radius:14px;display:grid;place-items:center;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.24);flex:0 0 auto}.tech-news-featured-head h2{margin:0;color:var(--tech-text);font-size:20px;font-weight:950;line-height:1.35}.tech-news-featured-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;min-width:0}.tech-featured-main,.tech-featured-mini{min-width:0;border:1px solid var(--tech-border);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border-radius:22px;box-shadow:0 12px 34px rgba(3,18,37,.08)}.tech-featured-main{display:grid;gap:13px;padding:18px}.tech-featured-badges{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tech-featured-badges span,.tech-featured-badges b{border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--tech-accent);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:950;line-height:1.2}.tech-featured-main h3{margin:0;color:var(--tech-text);font-size:clamp(22px,3vw,32px);font-weight:950;line-height:1.25;overflow-wrap:anywhere}.tech-featured-main p{margin:0;color:var(--tech-muted);font-size:14px;font-weight:800;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tech-featured-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--tech-border);padding-top:12px}.tech-featured-meta span,.tech-featured-mini small{display:inline-flex;align-items:center;gap:6px;color:var(--tech-muted);font-size:12px;font-weight:900;line-height:1.4}.tech-featured-meta a,.tech-news-read-link{width:max-content;max-width:100%;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.28);background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));color:var(--tech-accent);border-radius:999px;min-height:38px;padding:0 13px;text-decoration:none;font-size:12px;font-weight:950;line-height:1.2}.tech-featured-meta a:hover,.tech-featured-meta a:focus-visible,.tech-news-read-link:hover,.tech-news-read-link:focus-visible{outline:none;border-color:rgba(47,214,192,.56);box-shadow:0 0 0 3px rgba(47,214,192,.12)}.tech-featured-side{display:grid;gap:10px;min-width:0}.tech-featured-mini{display:grid;gap:8px;padding:13px;text-decoration:none;color:inherit}.tech-featured-mini span{width:max-content;max-width:100%;border-radius:999px;color:var(--tech-accent);font-size:11px;font-weight:950;line-height:1.2}.tech-featured-mini strong{color:var(--tech-text);font-size:13px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
        .tech-news-controls{width:100%;max-width:100%;background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:14px;min-width:0;overflow-x:hidden}
        .tech-news-search{width:100%;max-width:100%;display:flex;align-items:center;gap:10px;border:1px solid var(--tech-border);background:var(--tech-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--tech-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}
        .tech-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}
        .tech-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--tech-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}
        .tech-news-search input::placeholder{color:var(--tech-muted);opacity:1}
        .tech-news-filter-row{display:grid;grid-template-columns:auto minmax(150px,1fr) minmax(150px,1fr) minmax(150px,1fr);gap:10px;align-items:end;min-width:0;border:1px solid var(--tech-border);background:var(--tech-panel);border-radius:18px;padding:12px;box-shadow:0 14px 38px rgba(3,18,37,.06)}.tech-news-filter-label{min-height:42px;display:inline-flex;align-items:center;gap:8px;color:var(--tech-accent);font-size:12px;font-weight:950;white-space:nowrap}.tech-news-select-control{display:grid;gap:6px;min-width:0}.tech-news-select-control span{color:var(--tech-muted);font-size:11px;font-weight:950;line-height:1.3}.tech-news-select-control select{width:100%;min-width:0;height:42px;border:1px solid var(--tech-border);border-radius:14px;background:var(--tech-panel-soft);color:var(--tech-text);padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;outline:0}.tech-news-select-control select:focus{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 3px rgba(47,214,192,.10)}
        .tech-news-chip-row{width:100%;min-width:0;max-width:100%;display:flex;flex-wrap:wrap;justify-content:flex-start;gap:9px;overflow-x:visible;overflow-y:visible;padding-bottom:2px;scrollbar-width:none;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}
        .tech-news-chip-row button{flex:0 0 auto;border:1px solid var(--tech-border);background:var(--tech-panel);color:var(--tech-muted);border-radius:999px;min-height:40px;padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;transition:background .18s ease,border-color .18s ease,color .18s ease,box-shadow .18s ease}
        .tech-news-chip-row button.active{background:#CCFBF1;border-color:rgba(15,118,110,.25);color:#0F766E;box-shadow:0 10px 24px rgba(15,118,110,.12)}
        .tech-news-chip-row button:hover,.tech-news-chip-row button:focus-visible{outline:none;border-color:rgba(47,214,192,.56);color:var(--tech-accent)}
        .tech-news-chip-row button.active:hover,.tech-news-chip-row button.active:focus-visible{color:#0F766E}
        .tech-news-chip-row button{display:inline-flex;align-items:center;gap:8px;padding-inline:12px}
        .tech-news-chip-row button span{line-height:1.25}.tech-news-chip-row button b{min-width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;padding:0 6px;background:rgba(29,140,255,.10);color:var(--tech-muted);font-size:11px;font-weight:950;line-height:1}.tech-news-chip-row button.active b{background:rgba(255,255,255,.72);color:#065F46}
        .tech-news-more-button{flex:0 0 auto}
        .tech-news-filter-icon{width:40px!important;padding:0!important;display:grid!important;place-items:center!important;color:var(--tech-accent)!important}
        .tech-news-layout{width:100%;max-width:100%;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start;min-width:0}.tech-news-content-column{display:grid;gap:14px;min-width:0}.tech-news-results-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--tech-border);background:var(--tech-panel);border-radius:18px;padding:12px 14px;color:var(--tech-muted);box-shadow:0 12px 32px rgba(3,18,37,.06)}.tech-news-results-bar span,.tech-news-results-bar b{font-size:12px;font-weight:950;line-height:1.4}.tech-news-results-bar b{color:var(--tech-accent)}.tech-news-grid{width:100%;max-width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0;overflow-x:hidden}
        .tech-news-card{width:100%;max-width:100%;box-sizing:border-box;background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border:1px solid var(--tech-border);border-radius:20px;padding:18px;display:grid;gap:15px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .tech-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}
        .tech-news-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;min-width:0;max-width:100%}
        .tech-news-company-wrap{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%;flex:1 1 auto;flex-wrap:wrap}
        .tech-news-company{min-width:0;max-width:100%;color:var(--tech-text);font-size:13px;font-weight:950;overflow-wrap:anywhere;word-break:break-word}
        .tech-news-ticker{direction:ltr;unicode-bidi:isolate;border-radius:999px;background:#CCFBF1;border:1px solid rgba(15,118,110,.25);color:#0F766E;padding:6px 10px;font-size:12px;font-weight:950;flex:0 0 auto}.tech-news-translation-badge{display:inline-flex;align-items:center;max-width:100%;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.25;border:1px solid var(--tech-border);color:var(--tech-muted);background:rgba(142,166,195,.10);white-space:normal;overflow-wrap:anywhere}.tech-news-translation-badge.translated{color:#0F766E;border-color:rgba(15,118,110,.25);background:#CCFBF1}.dark .tech-news-ticker,.dark .tech-news-translation-badge.translated{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .tech-news-chip-row button b{background:rgba(142,166,195,.12);color:#8EA6C3}.dark .tech-news-chip-row button.active{background:#2FD6C0;border-color:#2FD6C0;color:#061A2E;box-shadow:0 10px 24px rgba(47,214,192,.22)}.dark .tech-news-chip-row button.active b{background:rgba(6,26,46,.16);color:#061A2E}.dark .tech-news-chip-row button.active:hover,.dark .tech-news-chip-row button.active:focus-visible{color:#061A2E}
        .dark .tech-news-more-button.active{background:#2FD6C0;border-color:#2FD6C0;color:#061A2E}
        .tech-news-card-price{display:grid;justify-items:end;gap:4px;flex:0 0 auto;min-width:max-content}.tech-news-card-price strong{direction:ltr;unicode-bidi:isolate;color:var(--tech-text);font-size:15px;font-weight:950}.tech-news-card-price.unavailable strong{direction:inherit;unicode-bidi:normal;color:var(--tech-muted);font-size:12px}
        .tech-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:5px;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.tech-news-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.tech-news-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.tech-news-change.neutral{color:var(--tech-muted);background:rgba(142,166,195,.10);border-color:var(--tech-border)}.dark .tech-ticker-item b.up,.dark .tech-news-change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .tech-ticker-item b.down,.dark .tech-news-change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}
        .tech-news-card h2{margin:0;color:var(--tech-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .tech-news-card p{margin:0;color:var(--tech-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
        .tech-news-meta{border-top:1px solid var(--tech-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;max-width:100%;color:var(--tech-muted);font-size:12px;font-weight:900;line-height:1.55;flex-wrap:wrap}
        .tech-news-meta a,.tech-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:100%;color:var(--tech-muted);text-decoration:none;overflow-wrap:anywhere}.tech-news-meta a:hover,.tech-news-meta a:focus-visible{outline:none;color:var(--tech-accent)}
        .tech-news-read-link{justify-self:start;margin-top:-4px}.tech-news-load-more-wrap{display:grid;place-items:center;min-height:46px;margin-top:4px}.tech-news-load-more-wrap span{color:var(--tech-muted);font-size:12px;font-weight:900;line-height:1.5}.tech-news-load-more{min-height:46px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#061A2E;padding:0 22px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 14px 32px rgba(29,140,255,.18)}.tech-news-load-more:hover,.tech-news-load-more:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(47,214,192,.14),0 16px 38px rgba(29,140,255,.22)}
        .tech-news-side-panel{position:sticky;top:24px;display:grid;gap:12px;min-width:0}.tech-side-card{display:grid;gap:12px;border:1px solid var(--tech-border);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border-radius:22px;padding:15px;box-shadow:0 16px 42px rgba(3,18,37,.10);min-width:0}.tech-side-card h3{margin:0;display:flex;align-items:center;gap:8px;color:var(--tech-text);font-size:15px;font-weight:950;line-height:1.4}.tech-side-card h3 svg{color:var(--tech-accent);flex:0 0 auto}.tech-side-list{display:grid;gap:10px}.tech-side-list a{display:grid;gap:5px;text-decoration:none;color:inherit;border-top:1px solid var(--tech-border);padding-top:10px}.tech-side-list a:first-child{border-top:0;padding-top:0}.tech-side-list strong{color:var(--tech-text);font-size:12.5px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tech-side-list small{color:var(--tech-muted);font-size:11px;font-weight:850;line-height:1.4}.tech-side-pill-list{display:flex;flex-wrap:wrap;gap:8px}.tech-side-pill-list span{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--tech-accent);border-radius:999px;padding:7px 10px}.tech-side-pill-list b{font-size:12px;font-weight:950}.tech-side-pill-list small{min-width:20px;height:20px;border-radius:999px;display:grid;place-items:center;background:var(--tech-panel);color:var(--tech-muted);font-size:10px;font-weight:950}.tech-side-source-list{display:grid;gap:8px}.tech-side-source-list span{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--tech-border);background:var(--tech-panel-soft);border-radius:14px;padding:9px}.tech-side-source-list b{color:var(--tech-text);font-size:12px;font-weight:950}.tech-side-source-list small{color:var(--tech-muted);font-size:11px;font-weight:850;white-space:nowrap}
        .tech-news-card h2{font-size:clamp(17px,1.7vw,20px);line-height:1.45}
        .tech-news-card p{-webkit-line-clamp:2;color:var(--tech-muted);font-weight:820}
        .tech-news-ticker{min-height:34px;display:inline-flex;align-items:center;box-shadow:0 8px 18px rgba(15,118,110,.10)}
        .tech-news-card-footer{border-top:1px solid var(--tech-border);padding-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;max-width:100%;flex-wrap:wrap}
        .tech-news-card-footer .tech-news-meta{border-top:0;padding-top:0;display:flex;align-items:center;justify-content:flex-start;gap:10px 14px;flex:1 1 210px;min-width:0;color:var(--tech-muted)}
        .tech-news-card-footer .tech-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:100%;overflow-wrap:anywhere}
        .tech-featured-meta a,.tech-featured-meta .tech-news-read-link,.tech-news-card-footer .tech-news-read-link{min-height:42px;padding:0 16px;border:1px solid rgba(47,214,192,.36);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#061A2E;border-radius:999px;font-size:12.5px;font-weight:950;box-shadow:0 14px 30px rgba(29,140,255,.18);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,filter .18s ease}
        .tech-featured-meta a:hover,.tech-featured-meta a:focus-visible,.tech-featured-meta .tech-news-read-link:hover,.tech-featured-meta .tech-news-read-link:focus-visible,.tech-news-card-footer .tech-news-read-link:hover,.tech-news-card-footer .tech-news-read-link:focus-visible{outline:none;filter:saturate(1.1);transform:translateY(-1px);border-color:rgba(47,214,192,.72);box-shadow:0 0 0 4px rgba(47,214,192,.14),0 16px 36px rgba(29,140,255,.24)}
        .tech-featured-meta a:active,.tech-news-card-footer .tech-news-read-link:active{transform:translateY(0) scale(.98)}
        .tech-news-read-link.disabled{pointer-events:none;cursor:not-allowed;background:var(--tech-panel-soft);color:var(--tech-muted);border-color:var(--tech-border);box-shadow:none;opacity:.78}
        .tech-featured-mini.unavailable{cursor:not-allowed;opacity:.78}
        .tech-side-list a,.tech-side-news-item{display:grid;gap:5px;text-decoration:none;color:inherit;border:1px solid var(--tech-border);background:var(--tech-panel-soft);border-radius:16px;padding:11px;transition:border-color .18s ease,background .18s ease,transform .18s ease}
        .tech-side-list a:first-child,.tech-side-news-item:first-child{border-top:1px solid var(--tech-border);padding-top:11px}
        .tech-side-list a:hover,.tech-side-list a:focus-visible{outline:none;border-color:rgba(47,214,192,.42);background:rgba(47,214,192,.08);transform:translateY(-1px)}
        .tech-side-news-item.unavailable{opacity:.78}
        .tech-side-list a > span,.tech-side-news-item > span{width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.20);background:rgba(47,214,192,.10);color:var(--tech-accent);border-radius:999px;padding:4px 8px;font-size:10.5px;font-weight:950;line-height:1.25;overflow-wrap:anywhere}
        .tech-side-list small{display:inline-flex;align-items:center;gap:5px}
        .tech-side-ranked-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
        .tech-side-ranked-list li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid var(--tech-border);background:var(--tech-panel-soft);border-radius:16px;padding:10px;min-width:0}
        .tech-side-rank{width:30px;height:30px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(29,140,255,.16),rgba(47,214,192,.18));color:var(--tech-accent);font-size:12px;font-weight:950}
        .tech-side-ranked-list div{display:grid;gap:2px;min-width:0}
        .tech-side-ranked-list b{color:var(--tech-text);font-size:14px;font-weight:950;letter-spacing:.02em}
        .tech-side-ranked-list small{color:var(--tech-muted);font-size:11px;font-weight:850;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tech-side-ranked-list em{font-style:normal;justify-self:end;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--tech-accent);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950;white-space:nowrap}
        .tech-side-source-list span{min-width:0;padding:10px 11px}
        .tech-side-source-list b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .tech-side-source-list small{display:inline-flex;align-items:center;gap:4px;border-radius:999px;background:rgba(142,166,195,.12);padding:5px 8px}
        .tech-side-source-list small strong{color:var(--tech-accent);font-weight:950}
        .tech-featured-badges span,.tech-featured-badges b,.tech-featured-mini span,.tech-news-source-badge,.tech-side-list a > span,.tech-side-news-item > span,.tech-side-ranked-list em{border:1px solid #A7F3D0;background:#D1FAE5;color:#065F46;border-radius:999px;padding:6px 10px;font-size:11.5px;font-weight:950;line-height:1.25;box-shadow:0 8px 18px rgba(6,95,70,.08)}
        .tech-news-card-footer .tech-news-meta .tech-news-source-badge{border-color:#A7F3D0;background:#D1FAE5;color:#065F46}
        .tech-news-source-badge{display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow-wrap:anywhere}
        .tech-side-ranked-list em{padding:7px 11px;font-size:11.5px;font-weight:950}
        .tech-side-rank{border:1px solid #67E8F9;background:linear-gradient(135deg,#E0F2FE,#CCFBF1);color:#155E75;box-shadow:0 8px 18px rgba(14,116,144,.10)}
        .tech-side-source-list small{border:1px solid #A7F3D0;background:#D1FAE5;color:#065F46;font-weight:950}
        .tech-side-source-list small strong{color:#065F46;font-weight:950}
        .dark .tech-featured-badges span,.dark .tech-featured-badges b,.dark .tech-featured-mini span,.dark .tech-news-source-badge,.dark .tech-side-list a > span,.dark .tech-side-news-item > span,.dark .tech-side-ranked-list em{border-color:rgba(16,185,129,.45);background:rgba(6,78,59,.52);color:#D1FAE5;box-shadow:none}
        .dark .tech-news-card-footer .tech-news-meta .tech-news-source-badge{border-color:rgba(16,185,129,.45);background:rgba(6,78,59,.52);color:#D1FAE5}
        .dark .tech-side-rank{border-color:rgba(34,211,238,.42);background:linear-gradient(135deg,rgba(14,116,144,.34),rgba(6,78,59,.38));color:#E0F2FE;box-shadow:none}
        .dark .tech-side-source-list small{border-color:rgba(16,185,129,.45);background:rgba(6,78,59,.52);color:#D1FAE5}
        .dark .tech-side-source-list small strong{color:#A7F3D0}
        .tech-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--tech-muted);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border:1px dashed var(--tech-border-strong);border-radius:22px}.tech-news-state svg{color:var(--tech-accent)}.tech-news-state strong{display:block;color:var(--tech-text);font-size:19px;font-weight:950}.tech-news-state p{margin:0;max-width:620px;color:var(--tech-muted);font-weight:850;line-height:1.75}.tech-news-state button{border:0;border-radius:14px;background:var(--tech-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .tech-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--tech-muted);font-size:12px;font-weight:820;line-height:1.7}
        .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}.tech-news-skeleton span{width:42%;height:18px}.tech-news-skeleton i{width:100%;height:15px}.tech-news-skeleton i:nth-child(3){width:76%}.tech-news-skeleton i:nth-child(4){width:64%}.tech-news-skeleton b{width:58%;height:38px;border-radius:14px}.tech-news-skeleton small{width:35%;height:14px}@keyframes techNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1024px){[dir].tech-news-shell .tech-news-main{width:100%;max-width:100%;margin-left:0;margin-right:0;padding:92px 22px 32px}.tech-news-header{align-items:flex-start}.tech-news-featured-grid,.tech-news-layout{grid-template-columns:1fr}.tech-news-side-panel{position:static}.tech-news-grid{grid-template-columns:1fr}}
        @media(max-width:860px){.tech-news-filter-row{grid-template-columns:1fr 1fr}.tech-news-filter-label{grid-column:1/-1}}
        @media(max-width:720px){[dir].tech-news-shell .tech-news-main{padding-inline:14px;gap:16px}.tech-news-header{display:flex;flex-direction:column;gap:12px;min-width:0;max-width:100%}.tech-news-header-actions{justify-content:flex-start}.tech-news-title-row{align-items:flex-start;min-width:0;flex-basis:auto}.tech-news-title-icon{width:50px;height:50px}.tech-news-header h1{font-size:28px;line-height:1.2}.tech-news-header p{font-size:12.5px;align-items:flex-start}.tech-news-card,.tech-news-search{border-radius:18px}.tech-news-featured{border-radius:22px;padding:14px}.tech-featured-main{padding:15px}.tech-featured-main h3{font-size:20px}.tech-news-card{padding:16px;gap:14px}.tech-news-card-top{display:grid;grid-template-columns:1fr;gap:12px}.tech-news-company-wrap{align-items:flex-start;gap:7px}.tech-news-ticker,.tech-news-translation-badge{font-size:11px;padding:5px 9px}.tech-news-card-price{justify-items:start;min-width:0}.tech-news-card h2{font-size:17px;line-height:1.5}.tech-news-card p{font-size:13px;line-height:1.7}.tech-news-meta{display:grid;gap:8px;justify-content:start}.tech-ticker-strip{margin-inline:-2px}.tech-ticker-viewport{overflow-x:auto;scrollbar-width:thin;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.tech-news-chip-row{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:10px}.tech-news-chip-row::-webkit-scrollbar{display:none}}
        @media(max-width:640px){.tech-news-shell{width:100%;max-width:100%;overflow-x:hidden}[dir].tech-news-shell .tech-news-main{width:100%;max-width:100%;padding-inline:12px;padding-top:84px;margin-left:0;margin-right:0;overflow-x:hidden}.tech-news-controls,.tech-news-grid,.tech-news-layout,.tech-news-featured{width:100%;max-width:100%;min-width:0;overflow-x:hidden}.tech-news-filter-row{grid-template-columns:1fr;padding:10px}.tech-news-select-control select{height:44px}.tech-news-chip-row{gap:8px;margin-inline:0;padding-inline:0 4px;scrollbar-width:none}.tech-news-chip-row button{min-height:44px;padding:0 16px;font-size:11.5px;border-radius:16px}.tech-news-filter-icon{width:44px!important;min-width:44px!important}.tech-news-search{min-height:52px;padding-inline:13px}.tech-news-title-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px}.tech-news-header h1{font-size:25px}.tech-news-title-icon{width:44px;height:44px;border-radius:15px}.tech-news-card{width:100%;max-width:100%;min-width:0;border-radius:18px;padding:15px;overflow:hidden}.tech-news-company{flex-basis:100%;font-size:12.5px}.tech-news-ticker,.tech-news-translation-badge{min-height:30px;padding:6px 9px;font-size:11px}.tech-news-card-price strong{font-size:14px}.tech-news-change{font-size:11px;padding:5px 8px}.tech-news-meta{font-size:11.5px}.tech-news-read-link{width:100%}.tech-news-results-bar{display:grid;justify-content:stretch}.tech-news-disclaimer{font-size:11.5px;padding-inline:4px}}
        @media(prefers-reduced-motion:reduce){.tech-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.tech-ticker-track{animation-duration:60s}.tech-ticker-set[aria-hidden="true"]{display:none}}
      `}</style>
    </div>
  );
}

function FeaturedNewsSection({
  items,
  labels,
  formatDateTime,
}: {
  items: TechNewsItem[];
  labels: { title: string; readNews: string; source: string; openArticle: string; linkUnavailable: string };
  formatDateTime: (value: string) => string;
}) {
  const [lead, ...secondaryItems] = items;
  if (!lead) return null;
  const leadTitle = lead.title || lead.headline;
  const leadSummary = lead.summary || leadTitle;
  const leadHasUrl = Boolean(lead.url);

  return (
    <section className="tech-news-featured" aria-label={labels.title}>
      <div className="tech-news-featured-head">
        <span><Star size={16} /></span>
        <h2>{labels.title}</h2>
      </div>
      <div className="tech-news-featured-grid">
        <article className="tech-featured-main">
          <div className="tech-featured-badges">
            <span>{lead.source || labels.source}</span>
            <b dir="ltr">{lead.ticker}</b>
          </div>
          <h3>{leadTitle}</h3>
          <p>{leadSummary}</p>
          <div className="tech-featured-meta">
            <span><Clock3 size={14} />{formatDateTime(lead.publishedAt)}</span>
            {leadHasUrl ? (
              <a href={lead.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${leadTitle}`}>
                {labels.readNews}
                <ExternalLink size={14} />
              </a>
            ) : (
              <span className="tech-news-read-link disabled" aria-disabled="true">
                {labels.linkUnavailable}
                <ExternalLink size={14} />
              </span>
            )}
          </div>
        </article>
        <div className="tech-featured-side">
          {secondaryItems.map(item => {
            const itemTitle = item.title || item.headline;
            const content = (
              <>
                <span>{item.source || labels.source}</span>
                <strong>{itemTitle}</strong>
                <small>
                  <Clock3 size={13} />
                  {formatDateTime(item.publishedAt)}
                </small>
              </>
            );
            return item.url ? (
              <a className="tech-featured-mini" href={item.url} target="_blank" rel="noreferrer" key={item.id} aria-label={`${labels.openArticle}: ${itemTitle}`}>
                {content}
              </a>
            ) : (
              <span className="tech-featured-mini unavailable" key={item.id}>
                {content}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TechNewsSidePanel({
  latestItems,
  mentionedTickers,
  sourceCounts,
  labels,
  formatDateTime,
}: {
  latestItems: TechNewsItem[];
  mentionedTickers: MentionedTicker[];
  sourceCounts: Array<[string, number]>;
  labels: { latest: string; mentioned: string; sources: string; articles: string; mentions: string; source: string };
  formatDateTime: (value: string) => string;
}) {
  return (
    <aside className="tech-news-side-panel">
      <section className="tech-side-card">
        <h3><Newspaper size={16} />{labels.latest}</h3>
        <div className="tech-side-list">
          {latestItems.map(item => {
            const itemTitle = item.title || item.headline;
            const content = (
              <>
                <span>{item.source || labels.source}</span>
                <strong>{itemTitle}</strong>
                <small><Clock3 size={12} />{formatDateTime(item.publishedAt)}</small>
              </>
            );
            return item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" key={`latest-${item.id}`}>
                {content}
              </a>
            ) : (
              <span className="tech-side-news-item unavailable" key={`latest-${item.id}`}>
                {content}
              </span>
            );
          })}
        </div>
      </section>
      {mentionedTickers.length > 0 ? (
        <section className="tech-side-card">
          <h3><TrendingUp size={16} />{labels.mentioned}</h3>
          <ol className="tech-side-ranked-list">
            {mentionedTickers.map((item, index) => (
              <li key={item.ticker}>
                <span className="tech-side-rank">{index + 1}</span>
                <div>
                  <b dir="ltr">{item.ticker}</b>
                  <small>{item.companyName}</small>
                </div>
                <em>{item.count} {labels.mentions}</em>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {sourceCounts.length > 0 ? (
        <section className="tech-side-card">
          <h3><Newspaper size={16} />{labels.sources}</h3>
          <div className="tech-side-source-list">
            {sourceCounts.map(([source, count]) => (
              <span key={source}>
                <b>{source}</b>
                <small><strong>{count}</strong> {labels.articles}</small>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

export default TechNewsPage;
