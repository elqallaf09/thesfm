'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CircleDollarSign, Clock3, ExternalLink, Filter, Newspaper, RefreshCcw, Search, Star, Tags } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { CryptoNewsCategory, CryptoNewsItem, CryptoNewsPayload, CryptoNewsSymbol } from '@/lib/market/fetchCryptoNews';

type ApiResponse = CryptoNewsPayload | { success: false; error?: string; code?: string };
type CategoryFilter = 'all' | CryptoNewsCategory;
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type SortFilter = 'recent' | 'relevance';

const NEWS_PAGE_SIZE = 12;
const FEATURED_NEWS_COUNT = 3;
const CATEGORY_ORDER: CategoryFilter[] = ['all', 'bitcoin', 'ethereum', 'altcoins', 'etfs', 'regulation', 'exchanges', 'blockchain'];
const TIME_FILTERS: TimeFilter[] = ['all', 'today', 'week', 'month'];
const SORT_FILTERS: SortFilter[] = ['recent', 'relevance'];
const SYMBOL_TO_MARKET_SYMBOL: Record<CryptoNewsSymbol, string> = {
  BTC: 'BTCUSD',
  ETH: 'ETHUSD',
  SOL: 'SOLUSD',
  XRP: 'XRPUSD',
  BNB: 'BNBUSD',
  DOGE: 'DOGEUSD',
};

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

function itemSearchText(item: CryptoNewsItem) {
  return [
    item.source,
    item.title,
    item.summary,
    item.titleOriginal,
    item.summaryOriginal,
    ...item.categories,
    ...item.symbols,
  ].join(' ').toLowerCase();
}

function itemMatchesSearch(item: CryptoNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemSearchText(item).includes(needle);
}

function categoryMatches(item: CryptoNewsItem, category: CategoryFilter) {
  return category === 'all' || item.categories.includes(category);
}

function timeMatches(item: CryptoNewsItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const date = new Date(item.publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = (Date.now() - date.getTime()) / 86400000;
  if (filter === 'today') return diffDays <= 1;
  if (filter === 'week') return diffDays <= 7;
  return diffDays <= 31;
}

function relevanceScore(item: CryptoNewsItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return new Date(item.publishedAt).getTime() / 1000000000;
  let score = 0;
  if (item.symbols.some(symbol => symbol.toLowerCase() === needle)) score += 80;
  if (item.categories.some(category => category.toLowerCase().includes(needle))) score += 35;
  if (item.title.toLowerCase().includes(needle)) score += 30;
  if (item.summary.toLowerCase().includes(needle)) score += 15;
  return score + new Date(item.publishedAt).getTime() / 10000000000;
}

export function CryptoNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<CryptoNewsItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sort, setSort] = useState<SortFilter>('recent');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/crypto-news?lang=${encodeURIComponent(lang)}&limit=60`);
      const json = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !json.success) throw new Error(t('crypto_news_error'));
      setItems(json.items);
      setLastUpdated(json.lastUpdated);
    } catch {
      setItems([]);
      setLastUpdated('');
      setError(t('crypto_news_error'));
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
  }, [category, query, sort, sourceFilter, timeFilter]);

  const sourceOptions = useMemo(() => (
    Array.from(new Set(items.map(item => item.source).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [items]);

  const baseFilteredItems = useMemo(() => (
    items
      .filter(item => sourceFilter === 'all' || item.source === sourceFilter)
      .filter(item => timeMatches(item, timeFilter))
      .filter(item => itemMatchesSearch(item, query))
  ), [items, query, sourceFilter, timeFilter]);

  const categoryCounts = useMemo(() => (
    CATEGORY_ORDER.reduce((acc, item) => {
      acc[item] = baseFilteredItems.filter(newsItem => categoryMatches(newsItem, item)).length;
      return acc;
    }, {} as Record<CategoryFilter, number>)
  ), [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    const nextItems = baseFilteredItems.filter(item => categoryMatches(item, category));
    return [...nextItems].sort((a, b) => {
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

  const symbolCounts = useMemo(() => {
    const counts = new Map<CryptoNewsSymbol, number>();
    filteredItems.forEach(item => {
      item.symbols.forEach(symbol => counts.set(symbol, (counts.get(symbol) ?? 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredItems]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredItems.forEach(item => {
      if (!item.source) return;
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredItems]);

  const categoryLabels: Record<CategoryFilter, string> = {
    all: t('crypto_news_category_all'),
    bitcoin: t('crypto_news_category_bitcoin'),
    ethereum: t('crypto_news_category_ethereum'),
    altcoins: t('crypto_news_category_altcoins'),
    etfs: t('crypto_news_category_etfs'),
    regulation: t('crypto_news_category_regulation'),
    exchanges: t('crypto_news_category_exchanges'),
    blockchain: t('crypto_news_category_blockchain'),
  };
  const timeLabels: Record<TimeFilter, string> = {
    all: t('tech_news_time_all'),
    today: t('tech_news_time_today'),
    week: t('tech_news_time_week'),
    month: t('tech_news_time_month'),
  };
  const sortLabels: Record<SortFilter, string> = {
    recent: t('tech_news_sort_recent'),
    relevance: t('tech_news_sort_relevance'),
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setSourceFilter('all');
    setTimeFilter('all');
    setSort('recent');
  };

  const updatedMinutes = minutesAgo(lastUpdated);
  const headerSubtitle = updatedMinutes === null
    ? `${t('crypto_news_subtitle')} - ${t('crypto_news_updated_real_sources')}`
    : `${t('crypto_news_subtitle')} - ${t('tech_news_last_updated_before')} ${updatedMinutes} ${t('tech_news_minutes')}`;
  const resultsCountLabel = t('tech_news_results_count').replace('{count}', String(filteredItems.length));
  const shownCountLabel = t('tech_news_showing_count').replace('{count}', String(featuredItems.length + visibleNewsItems.length));

  return (
    <div className="crypto-news-shell" dir={dir}>
      <Sidebar />
      <main className="crypto-news-main">
        <header className="crypto-news-header">
          <div className="crypto-news-title-row">
            <div className="crypto-news-title-icon" aria-hidden="true">
              <CircleDollarSign size={25} />
            </div>
            <div>
              <h1>{t('crypto_news_title')}</h1>
              <p><span aria-hidden="true" />{headerSubtitle}</p>
            </div>
          </div>
          <button type="button" className="crypto-news-icon-btn" aria-label={t('crypto_news_refresh')} onClick={() => void load(false)} disabled={refreshing}>
            <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        </header>

        {!loading && !error && featuredItems.length > 0 ? (
          <FeaturedCryptoNews items={featuredItems} labels={{
            title: t('tech_news_featured_title'),
            readNews: t('tech_news_read_news'),
            source: t('tech_news_source'),
            openArticle: t('tech_news_open_article'),
          }} formatDateTime={formatDateTime} categoryLabels={categoryLabels} />
        ) : null}

        <section className="crypto-news-controls" aria-label={t('crypto_news_filter_news')}>
          <label className="crypto-news-search">
            <Search size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('crypto_news_search_placeholder')} type="search" autoComplete="off" />
          </label>

          <div className="crypto-news-filter-row">
            <span className="crypto-news-filter-label"><Filter size={15} />{t('crypto_news_filter_news')}</span>
            <label>
              <span>{t('tech_news_source_filter')}</span>
              <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
                <option value="all">{t('tech_news_source_all')}</option>
                {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
              </select>
            </label>
            <label>
              <span>{t('tech_news_time_filter')}</span>
              <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as TimeFilter)}>
                {TIME_FILTERS.map(item => <option key={item} value={item}>{timeLabels[item]}</option>)}
              </select>
            </label>
            <label>
              <span>{t('tech_news_sort')}</span>
              <select value={sort} onChange={event => setSort(event.target.value as SortFilter)}>
                {SORT_FILTERS.map(item => <option key={item} value={item}>{sortLabels[item]}</option>)}
              </select>
            </label>
          </div>

          <div className="crypto-news-chip-row" role="tablist" aria-label={t('crypto_news_categories')}>
            {CATEGORY_ORDER.map(item => (
              <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>
                <span>{categoryLabels[item]}</span>
                <b>{categoryCounts[item] ?? 0}</b>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <CryptoNewsSkeleton />
        ) : error ? (
          <section className="crypto-news-state error" role="alert">
            <AlertTriangle size={24} />
            <strong>{t('crypto_news_error_title')}</strong>
            <p>{t('crypto_news_error_body')}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCcw size={16} />
              {t('market_retry')}
            </button>
          </section>
        ) : filteredItems.length === 0 ? (
          <section className="crypto-news-state">
            <Newspaper size={24} />
            <strong>{t('crypto_news_empty_title')}</strong>
            <p>{items.length === 0 ? t('crypto_news_no_source_items') : t('crypto_news_empty_body')}</p>
            <div className="crypto-news-state-actions">
              <button type="button" onClick={() => void load()}>
                <RefreshCcw size={16} />
                {t('market_retry')}
              </button>
              <button type="button" onClick={resetFilters}>{t('crypto_news_clear_filters')}</button>
            </div>
          </section>
        ) : (
          <section className="crypto-news-layout" aria-label={t('crypto_news_title')}>
            <div className="crypto-news-content-column">
              <div className="crypto-news-results-bar">
                <span>{resultsCountLabel}</span>
                <b>{shownCountLabel}</b>
              </div>
              <section className="crypto-news-grid" aria-label={t('crypto_news_title')}>
                {visibleNewsItems.map(item => (
                  <CryptoNewsCard
                    key={item.id}
                    item={item}
                    labels={{
                      source: t('tech_news_source'),
                      readMore: t('tech_news_read_more'),
                      openArticle: t('tech_news_open_article'),
                      translated: t('news_translated_badge'),
                      originalLanguage: t('news_original_language_badge'),
                    }}
                    categoryLabels={categoryLabels}
                    formatDateTime={formatDateTime}
                  />
                ))}
              </section>
              <div className="crypto-news-load-more-wrap">
                {hasMoreItems ? (
                  <button type="button" className="crypto-news-load-more" onClick={() => setVisibleCount(count => count + NEWS_PAGE_SIZE)}>
                    {t('tech_news_load_more')}
                  </button>
                ) : (
                  <span>{t('tech_news_all_loaded')}</span>
                )}
              </div>
            </div>
            <CryptoNewsSidePanel
              latestItems={filteredItems.slice(0, 5)}
              symbolCounts={symbolCounts}
              sourceCounts={sourceCounts}
              labels={{
                latest: t('tech_news_side_latest'),
                symbols: t('crypto_news_side_symbols'),
                sources: t('tech_news_side_sources'),
                articles: t('tech_news_articles_count'),
                mentions: t('tech_news_mentions_count'),
                source: t('tech_news_source'),
              }}
              formatDateTime={formatDateTime}
            />
          </section>
        )}

        <p className="crypto-news-disclaimer">{t('crypto_news_disclaimer')}</p>
      </main>

      <style jsx global>{`
        .crypto-news-shell{--crypto-bg:#F4F8FC;--crypto-panel:var(--sfm-card);--crypto-panel-soft:var(--sfm-light-card);--crypto-border:rgba(29,140,255,.14);--crypto-border-strong:rgba(29,140,255,.22);--crypto-text:var(--sfm-primary-dark);--crypto-muted:var(--sfm-muted);--crypto-accent:var(--sfm-soft-cyan);min-height:100dvh;background:var(--crypto-bg);color:var(--crypto-text);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .crypto-news-shell,.crypto-news-shell *{box-sizing:border-box}.dark .crypto-news-shell{--crypto-bg:#0A1422;--crypto-panel:#0F1D31;--crypto-panel-soft:#0B1829;--crypto-border:#1D3050;--crypto-border-strong:#2A456C;--crypto-text:#E8EEF6;--crypto-muted:#8EA6C3;--crypto-accent:#2FD6C0}
        .crypto-news-main{width:100%;max-width:100%;margin:0;padding:18px 22px 32px;display:grid;gap:20px;overflow-x:hidden;min-width:0}
        @media(min-width:1025px){[dir="rtl"].crypto-news-shell .crypto-news-main{padding-right:calc(var(--sidebar-w,230px) + 32px);padding-left:32px}[dir="ltr"].crypto-news-shell .crypto-news-main{padding-left:calc(var(--sidebar-w,230px) + 32px);padding-right:32px}.crypto-news-main>*{width:100%;max-width:1280px;margin-inline:auto}}
        .crypto-news-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:4px 0 2px;min-width:0}.crypto-news-title-row{display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 420px}.crypto-news-title-row>div:last-child{min-width:0;text-align:start}.crypto-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--crypto-accent);box-shadow:0 12px 34px rgba(47,214,192,.10);flex:0 0 auto}.crypto-news-header h1{margin:0;color:var(--crypto-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950}.crypto-news-header p{margin:8px 0 0;color:var(--crypto-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}.crypto-news-header p span{width:8px;height:8px;border-radius:50%;background:var(--crypto-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}.crypto-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--crypto-border);background:var(--crypto-panel);color:var(--crypto-text);display:grid;place-items:center;cursor:pointer}.crypto-news-icon-btn:hover,.crypto-news-icon-btn:focus-visible{outline:none;color:var(--crypto-accent);border-color:rgba(47,214,192,.48);box-shadow:0 0 0 4px rgba(47,214,192,.10)}.crypto-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:cryptoSpin .9s linear infinite}@keyframes cryptoSpin{to{transform:rotate(360deg)}}
        .crypto-news-featured{display:grid;gap:14px;border:1px solid var(--crypto-border);background:linear-gradient(135deg,rgba(29,140,255,.055),rgba(47,214,192,.085)),var(--crypto-panel);border-radius:26px;padding:18px;box-shadow:0 18px 48px rgba(3,18,37,.10);min-width:0;overflow:hidden}.crypto-news-featured-head{display:flex;align-items:center;gap:10px;color:var(--crypto-accent)}.crypto-news-featured-head span{width:36px;height:36px;border-radius:14px;display:grid;place-items:center;background:rgba(47,214,192,.12);border:1px solid rgba(47,214,192,.24)}.crypto-news-featured-head h2{margin:0;color:var(--crypto-text);font-size:20px;font-weight:950}.crypto-news-featured-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px}.crypto-featured-main,.crypto-featured-mini{min-width:0;border:1px solid var(--crypto-border);background:linear-gradient(180deg,var(--crypto-panel),var(--crypto-panel-soft));border-radius:22px;box-shadow:0 12px 34px rgba(3,18,37,.08)}.crypto-featured-main{display:grid;gap:13px;padding:18px}.crypto-featured-badges,.crypto-symbol-row,.crypto-category-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.crypto-featured-badges span,.crypto-category-badge,.crypto-symbol-badge,.crypto-featured-mini span,.crypto-news-source-badge{border:1px solid #A7F3D0;background:#D1FAE5;color:#065F46;border-radius:999px;padding:6px 10px;font-size:11.5px;font-weight:950;line-height:1.25;text-decoration:none;box-shadow:0 8px 18px rgba(6,95,70,.08)}.crypto-symbol-badge{direction:ltr;unicode-bidi:isolate}.crypto-symbol-badge:hover,.crypto-symbol-badge:focus-visible{outline:none;border-color:rgba(47,214,192,.72);box-shadow:0 0 0 4px rgba(47,214,192,.14)}.crypto-featured-main h3{margin:0;color:var(--crypto-text);font-size:clamp(22px,3vw,32px);font-weight:950;line-height:1.25;overflow-wrap:anywhere}.crypto-featured-main p{margin:0;color:var(--crypto-muted);font-size:14px;font-weight:800;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.crypto-featured-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--crypto-border);padding-top:12px}.crypto-featured-meta span,.crypto-featured-mini small{display:inline-flex;align-items:center;gap:6px;color:var(--crypto-muted);font-size:12px;font-weight:900}.crypto-news-read-link{width:max-content;max-width:100%;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.36);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#061A2E;border-radius:999px;min-height:42px;padding:0 16px;text-decoration:none;font-size:12.5px;font-weight:950;box-shadow:0 14px 30px rgba(29,140,255,.18)}.crypto-news-read-link:hover,.crypto-news-read-link:focus-visible{outline:none;filter:saturate(1.1);transform:translateY(-1px);border-color:rgba(47,214,192,.72);box-shadow:0 0 0 4px rgba(47,214,192,.14),0 16px 36px rgba(29,140,255,.24)}.crypto-featured-side{display:grid;gap:10px}.crypto-featured-mini{display:grid;gap:8px;padding:13px;text-decoration:none;color:inherit}.crypto-featured-mini strong{color:var(--crypto-text);font-size:13px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .crypto-news-controls{display:grid;gap:14px;min-width:0}.crypto-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--crypto-border);background:var(--crypto-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--crypto-accent);box-shadow:0 16px 44px rgba(3,18,37,.08)}.crypto-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}.crypto-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--crypto-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}.crypto-news-search input::placeholder{color:var(--crypto-muted);opacity:1}.crypto-news-filter-row{display:grid;grid-template-columns:auto minmax(150px,1fr) minmax(150px,1fr) minmax(150px,1fr);gap:10px;align-items:end;border:1px solid var(--crypto-border);background:var(--crypto-panel);border-radius:18px;padding:12px;box-shadow:0 14px 38px rgba(3,18,37,.06)}.crypto-news-filter-label{min-height:42px;display:inline-flex;align-items:center;gap:8px;color:var(--crypto-accent);font-size:12px;font-weight:950;white-space:nowrap}.crypto-news-filter-row label{display:grid;gap:6px;min-width:0}.crypto-news-filter-row label span{color:var(--crypto-muted);font-size:11px;font-weight:950}.crypto-news-filter-row select{width:100%;height:42px;border:1px solid var(--crypto-border);border-radius:14px;background:var(--crypto-panel-soft);color:var(--crypto-text);padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;outline:0}.crypto-news-chip-row{display:flex;flex-wrap:wrap;gap:9px;overflow-x:visible}.crypto-news-chip-row button{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--crypto-border);background:var(--crypto-panel);color:var(--crypto-muted);border-radius:999px;min-height:40px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.crypto-news-chip-row button.active{background:#CCFBF1;border-color:rgba(15,118,110,.25);color:#0F766E;box-shadow:0 10px 24px rgba(15,118,110,.12)}.crypto-news-chip-row button b{min-width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;padding:0 6px;background:rgba(29,140,255,.10);font-size:11px}
        .crypto-news-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}.crypto-news-content-column{display:grid;gap:14px;min-width:0}.crypto-news-results-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--crypto-border);background:var(--crypto-panel);border-radius:18px;padding:12px 14px;color:var(--crypto-muted);box-shadow:0 12px 32px rgba(3,18,37,.06)}.crypto-news-results-bar span,.crypto-news-results-bar b{font-size:12px;font-weight:950}.crypto-news-results-bar b{color:var(--crypto-accent)}.crypto-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}.crypto-news-card{background:linear-gradient(180deg,var(--crypto-panel),var(--crypto-panel-soft));border:1px solid var(--crypto-border);border-radius:20px;padding:18px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden}.crypto-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}.crypto-news-card-top{display:grid;gap:9px}.crypto-news-card h2{margin:0;color:var(--crypto-text);font-size:clamp(17px,1.7vw,20px);font-weight:950;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.crypto-news-card p{margin:0;color:var(--crypto-muted);font-size:13.5px;font-weight:820;line-height:1.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.crypto-news-card-footer{border-top:1px solid var(--crypto-border);padding-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.crypto-news-meta{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap;color:var(--crypto-muted);font-size:12px;font-weight:900}.crypto-news-meta span{display:inline-flex;align-items:center;gap:6px}
        .crypto-news-side-panel{position:sticky;top:24px;display:grid;gap:12px}.crypto-side-card{display:grid;gap:12px;border:1px solid var(--crypto-border);background:linear-gradient(180deg,var(--crypto-panel),var(--crypto-panel-soft));border-radius:22px;padding:15px;box-shadow:0 16px 42px rgba(3,18,37,.10)}.crypto-side-card h3{margin:0;display:flex;align-items:center;gap:8px;color:var(--crypto-text);font-size:15px;font-weight:950}.crypto-side-card h3 svg{color:var(--crypto-accent)}.crypto-side-list{display:grid;gap:10px}.crypto-side-list a,.crypto-side-news-item{display:grid;gap:5px;text-decoration:none;color:inherit;border:1px solid var(--crypto-border);background:var(--crypto-panel-soft);border-radius:16px;padding:11px}.crypto-side-list strong{color:var(--crypto-text);font-size:12.5px;font-weight:950;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.crypto-side-list small{display:inline-flex;align-items:center;gap:5px;color:var(--crypto-muted);font-size:11px;font-weight:850}.crypto-side-symbols,.crypto-side-source-list{display:grid;gap:8px}.crypto-side-symbols a,.crypto-side-source-list span{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--crypto-border);background:var(--crypto-panel-soft);border-radius:14px;padding:10px 11px;text-decoration:none;color:inherit}.crypto-side-symbols b,.crypto-side-source-list b{color:var(--crypto-text);font-size:12px;font-weight:950}.crypto-side-symbols small,.crypto-side-source-list small{border:1px solid #A7F3D0;background:#D1FAE5;color:#065F46;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:950}
        .crypto-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--crypto-muted);background:linear-gradient(180deg,var(--crypto-panel),var(--crypto-panel-soft));border:1px dashed var(--crypto-border-strong);border-radius:22px}.crypto-news-state svg{color:var(--crypto-accent)}.crypto-news-state strong{display:block;color:var(--crypto-text);font-size:19px;font-weight:950}.crypto-news-state p{margin:0;max-width:620px;color:var(--crypto-muted);font-weight:850;line-height:1.75}.crypto-news-state button,.crypto-news-load-more{border:0;border-radius:14px;background:var(--crypto-accent);color:#061A2E;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 15px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.crypto-news-state-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}.crypto-news-load-more-wrap{display:grid;place-items:center;min-height:46px}.crypto-news-load-more{border-radius:999px;padding:0 22px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));box-shadow:0 14px 32px rgba(29,140,255,.18)}.crypto-news-load-more-wrap span,.crypto-news-disclaimer{color:var(--crypto-muted);font-size:12px;font-weight:850;text-align:center}.crypto-news-skeleton span,.crypto-news-skeleton i,.crypto-news-skeleton b,.crypto-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:cryptoShimmer 1.2s linear infinite}.crypto-news-skeleton span{width:42%;height:18px}.crypto-news-skeleton i{width:100%;height:15px}.crypto-news-skeleton i:nth-child(3){width:76%}.crypto-news-skeleton i:nth-child(4){width:64%}.crypto-news-skeleton b{width:58%;height:38px;border-radius:14px}.crypto-news-skeleton small{width:35%;height:14px}@keyframes cryptoShimmer{to{background-position:-220% 0}}
        .dark .crypto-featured-badges span,.dark .crypto-category-badge,.dark .crypto-symbol-badge,.dark .crypto-featured-mini span,.dark .crypto-news-source-badge,.dark .crypto-side-symbols small,.dark .crypto-side-source-list small{border-color:rgba(16,185,129,.45);background:rgba(6,78,59,.52);color:#D1FAE5;box-shadow:none}.dark .crypto-news-chip-row button.active{background:#2FD6C0;border-color:#2FD6C0;color:#061A2E}.dark .crypto-news-chip-row button.active b{background:rgba(6,26,46,.16);color:#061A2E}
        @media(max-width:1024px){[dir].crypto-news-shell .crypto-news-main{padding:92px 22px 32px}.crypto-news-featured-grid,.crypto-news-layout{grid-template-columns:1fr}.crypto-news-side-panel{position:static}.crypto-news-grid{grid-template-columns:1fr}}
        @media(max-width:860px){.crypto-news-filter-row{grid-template-columns:1fr 1fr}.crypto-news-filter-label{grid-column:1/-1}}
        @media(max-width:720px){[dir].crypto-news-shell .crypto-news-main{padding-inline:14px;gap:16px}.crypto-news-header{display:flex;flex-direction:column;gap:12px}.crypto-news-title-icon{width:50px;height:50px}.crypto-news-header h1{font-size:28px}.crypto-news-featured{border-radius:22px;padding:14px}.crypto-featured-main{padding:15px}.crypto-featured-main h3{font-size:20px}.crypto-news-card{padding:16px}.crypto-news-chip-row{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:10px;scrollbar-width:none}.crypto-news-chip-row::-webkit-scrollbar{display:none}}
        @media(max-width:640px){[dir].crypto-news-shell .crypto-news-main{padding-inline:12px;padding-top:84px}.crypto-news-filter-row{grid-template-columns:1fr;padding:10px}.crypto-news-title-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px}.crypto-news-header h1{font-size:25px}.crypto-news-title-icon{width:44px;height:44px;border-radius:15px}.crypto-news-card{border-radius:18px;padding:15px}.crypto-news-read-link{width:100%}.crypto-news-results-bar{display:grid;justify-content:stretch}.crypto-news-state-actions{display:grid;width:100%}.crypto-news-state-actions button{width:100%}}
        @media(prefers-reduced-motion:reduce){.crypto-news-card:hover,.crypto-news-read-link:hover{transform:none}}
      `}</style>
    </div>
  );
}

function symbolHref(symbol: CryptoNewsSymbol) {
  return `/market-analysis?symbol=${encodeURIComponent(SYMBOL_TO_MARKET_SYMBOL[symbol])}`;
}

function CategoryBadges({ item, labels }: { item: CryptoNewsItem; labels: Record<CategoryFilter, string> }) {
  return (
    <div className="crypto-category-row">
      {item.categories.slice(0, 3).map(category => (
        <span className="crypto-category-badge" key={category}>{labels[category]}</span>
      ))}
    </div>
  );
}

function SymbolBadges({ symbols }: { symbols: CryptoNewsSymbol[] }) {
  if (symbols.length === 0) return null;
  return (
    <div className="crypto-symbol-row">
      {symbols.slice(0, 6).map(symbol => (
        <Link className="crypto-symbol-badge" href={symbolHref(symbol)} key={symbol}>{symbol}</Link>
      ))}
    </div>
  );
}

function FeaturedCryptoNews({
  items,
  labels,
  formatDateTime,
  categoryLabels,
}: {
  items: CryptoNewsItem[];
  labels: { title: string; readNews: string; source: string; openArticle: string };
  formatDateTime: (value: string) => string;
  categoryLabels: Record<CategoryFilter, string>;
}) {
  const [lead, ...secondaryItems] = items;
  if (!lead) return null;
  const leadTitle = lead.title || lead.headline;
  const leadSummary = lead.summary || leadTitle;

  return (
    <section className="crypto-news-featured" aria-label={labels.title}>
      <div className="crypto-news-featured-head">
        <span><Star size={16} /></span>
        <h2>{labels.title}</h2>
      </div>
      <div className="crypto-news-featured-grid">
        <article className="crypto-featured-main">
          <div className="crypto-featured-badges">
            <span>{lead.source || labels.source}</span>
          </div>
          <CategoryBadges item={lead} labels={categoryLabels} />
          <SymbolBadges symbols={lead.symbols} />
          <h3>{leadTitle}</h3>
          <p>{leadSummary}</p>
          <div className="crypto-featured-meta">
            <span><Clock3 size={14} />{formatDateTime(lead.publishedAt)}</span>
            <a className="crypto-news-read-link" href={lead.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${leadTitle}`}>
              {labels.readNews}
              <ExternalLink size={14} />
            </a>
          </div>
        </article>
        <div className="crypto-featured-side">
          {secondaryItems.map(item => {
            const itemTitle = item.title || item.headline;
            return (
              <a className="crypto-featured-mini" href={item.url} target="_blank" rel="noreferrer" key={item.id} aria-label={`${labels.openArticle}: ${itemTitle}`}>
                <span>{item.source || labels.source}</span>
                <strong>{itemTitle}</strong>
                <small><Clock3 size={13} />{formatDateTime(item.publishedAt)}</small>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CryptoNewsCard({
  item,
  labels,
  categoryLabels,
  formatDateTime,
}: {
  item: CryptoNewsItem;
  labels: { source: string; readMore: string; openArticle: string; translated: string; originalLanguage: string };
  categoryLabels: Record<CategoryFilter, string>;
  formatDateTime: (value: string) => string;
}) {
  const displayTitle = item.title || item.headline;
  const displaySummary = item.summary || displayTitle;
  const contentDir = item.isTranslated && item.translatedTo === 'ar' ? 'rtl' : item.isTranslated ? 'ltr' : 'auto';

  return (
    <article className="crypto-news-card" dir={contentDir}>
      <div className="crypto-news-card-top">
        <div className="crypto-featured-badges">
          <span>{item.source || labels.source}</span>
          <span>{item.isTranslated ? labels.translated : labels.originalLanguage}</span>
        </div>
        <CategoryBadges item={item} labels={categoryLabels} />
        <SymbolBadges symbols={item.symbols} />
      </div>
      <h2>{displayTitle}</h2>
      <p>{displaySummary}</p>
      <div className="crypto-news-card-footer">
        <div className="crypto-news-meta">
          <span className="crypto-news-source-badge">{item.source || labels.source}</span>
          <span><Clock3 size={14} />{formatDateTime(item.publishedAt)}</span>
        </div>
        <a className="crypto-news-read-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`${labels.openArticle}: ${displayTitle}`}>
          {labels.readMore}
          <ExternalLink size={15} />
        </a>
      </div>
    </article>
  );
}

function CryptoNewsSkeleton() {
  return (
    <section className="crypto-news-grid" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="crypto-news-card crypto-news-skeleton" key={index}>
          <span />
          <i />
          <i />
          <i />
          <b />
          <small />
        </article>
      ))}
    </section>
  );
}

function CryptoNewsSidePanel({
  latestItems,
  symbolCounts,
  sourceCounts,
  labels,
  formatDateTime,
}: {
  latestItems: CryptoNewsItem[];
  symbolCounts: Array<[CryptoNewsSymbol, number]>;
  sourceCounts: Array<[string, number]>;
  labels: { latest: string; symbols: string; sources: string; articles: string; mentions: string; source: string };
  formatDateTime: (value: string) => string;
}) {
  return (
    <aside className="crypto-news-side-panel">
      <section className="crypto-side-card">
        <h3><Newspaper size={16} />{labels.latest}</h3>
        <div className="crypto-side-list">
          {latestItems.map(item => (
            <a href={item.url} target="_blank" rel="noreferrer" key={`latest-${item.id}`}>
              <span className="crypto-news-source-badge">{item.source || labels.source}</span>
              <strong>{item.title || item.headline}</strong>
              <small><Clock3 size={12} />{formatDateTime(item.publishedAt)}</small>
            </a>
          ))}
        </div>
      </section>
      {symbolCounts.length > 0 ? (
        <section className="crypto-side-card">
          <h3><Tags size={16} />{labels.symbols}</h3>
          <div className="crypto-side-symbols">
            {symbolCounts.map(([symbol, count]) => (
              <Link href={symbolHref(symbol)} key={symbol}>
                <b dir="ltr">{symbol}</b>
                <small>{count} {labels.mentions}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {sourceCounts.length > 0 ? (
        <section className="crypto-side-card">
          <h3><Newspaper size={16} />{labels.sources}</h3>
          <div className="crypto-side-source-list">
            {sourceCounts.map(([source, count]) => (
              <span key={source}>
                <b>{source}</b>
                <small>{count} {labels.articles}</small>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

export default CryptoNewsPage;
