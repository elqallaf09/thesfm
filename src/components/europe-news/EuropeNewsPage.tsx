'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, RefreshCcw, Search } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { EUROPE_MARKETS, getEuropeMarket, type EuropeMarketId } from '@/lib/europe/europeMarkets';
import type { EuropeMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';
import type { EuropeNewsItem } from '@/lib/europe/parseEuropeRssFeeds';
import { EuropeMarketSelector } from '@/components/europe-news/EuropeMarketSelector';
import { EuropeMarketSummary } from '@/components/europe-news/EuropeMarketSummary';
import { EuropeNewsCard } from '@/components/europe-news/EuropeNewsCard';
import { EuropeNewsHeader } from '@/components/europe-news/EuropeNewsHeader';
import { EuropeNewsSkeleton } from '@/components/europe-news/EuropeNewsSkeleton';
import { EuropeNewsStatusBar } from '@/components/europe-news/EuropeNewsStatusBar';
import { EuropeTickerStrip } from '@/components/europe-news/EuropeTickerStrip';
import { MarketMoversCard } from '@/components/market-news/MarketMoversCard';
import { PortfolioComparisonCard } from '@/components/market-news/PortfolioComparisonCard';

type EuropeNewsApiResponse =
  | {
    success: true;
    source: string;
    language: string;
    translationEnabled: boolean;
    lastUpdated: string;
    items: EuropeNewsItem[];
    marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>;
  }
  | { success: false; error?: string; reason?: string };

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

function secondsUntilNextRefresh(lastLoadedAt: number) {
  const elapsed = Math.floor((Date.now() - lastLoadedAt) / 1000);
  return Math.max(0, 300 - elapsed);
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function EuropeNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<EuropeNewsItem[]>([]);
  const [marketData, setMarketData] = useState<Partial<Record<EuropeMarketId, EuropeMarketData>>>({});
  const [selectedMarket, setSelectedMarket] = useState<EuropeMarketId>('uk');
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(Date.now());
  const [countdown, setCountdown] = useState(300);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/europe-news?lang=${encodeURIComponent(lang)}&limit=50`);
      const json = await response.json().catch(() => ({})) as EuropeNewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('europe_news_error') : t('europe_news_error'));
      }
      setItems(json.items);
      setMarketData(json.marketData ?? {});
      setLastUpdated(json.lastUpdated);
      setLastLoadedAt(Date.now());
      setCountdown(300);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('europe_news_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [lang, t]);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => {
      void load(false);
    }, 300000);
    return () => window.clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(secondsUntilNextRefresh(lastLoadedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [lastLoadedAt]);

  const selectedMarketConfig = getEuropeMarket(selectedMarket);
  const marketLabels = useMemo<Record<EuropeMarketId, string>>(() => ({
    uk: t('europe_news_market_uk'),
    germany: t('europe_news_market_germany'),
    france: t('europe_news_market_france'),
    italy: t('europe_news_market_italy'),
    spain: t('europe_news_market_spain'),
    netherlands: t('europe_news_market_netherlands'),
    switzerland: t('europe_news_market_switzerland'),
    europe: t('europe_news_market_europe'),
  }), [t]);

  const indexLabels = useMemo<Record<EuropeMarketId, string>>(() => ({
    uk: t('europe_news_index_ftse'),
    germany: t('europe_news_index_dax'),
    france: t('europe_news_index_cac'),
    italy: t('europe_news_index_mib'),
    spain: t('europe_news_index_ibex'),
    netherlands: t('europe_news_index_aex'),
    switzerland: t('europe_news_index_smi'),
    europe: t('europe_news_index_stoxx'),
  }), [t]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(item => item.market === selectedMarket)
      .filter(item => !needle
        || item.title.toLowerCase().includes(needle)
        || item.summary.toLowerCase().includes(needle)
        || (item.titleOriginal ?? '').toLowerCase().includes(needle)
        || (item.summaryOriginal ?? '').toLowerCase().includes(needle)
        || item.source.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [items, query, selectedMarket]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return t('europe_news_unavailable');
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return t('europe_news_unavailable');
    return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value)}%`;
  };

  const searchPlaceholder = t('europe_news_search_market_placeholder').replace('{market}', marketLabels[selectedMarket]);

  return (
    <div className="europe-news-shell" dir={dir}>
      <Sidebar />
      <main className="europe-news-main">
        <EuropeTickerStrip
          marketLabels={marketLabels}
          indexLabels={indexLabels}
          unavailableLabel={t('europe_news_unavailable')}
          marketData={marketData}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <EuropeNewsHeader
          title={t('europe_news_title')}
          subtitle={t('europe_news_header_subtitle')}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />

        <EuropeNewsStatusBar
          labels={{
            lastUpdated: t('europe_news_last_updated'),
            nextUpdate: t('europe_news_next_update'),
            delayed: t('europe_news_delayed_short'),
            source: t('europe_news_source_rss'),
          }}
          lastUpdated={lastUpdated}
          nextUpdate={formatCountdown(countdown)}
          formatDateTime={formatDateTime}
        />

        <EuropeMarketSelector
          markets={EUROPE_MARKETS}
          selectedMarket={selectedMarket}
          marketLabels={marketLabels}
          indexLabels={indexLabels}
          unavailableLabel={t('europe_news_unavailable')}
          marketData={marketData}
          formatPercent={formatPercent}
          onSelect={setSelectedMarket}
        />

        <EuropeMarketSummary
          market={selectedMarketConfig}
          marketLabel={marketLabels[selectedMarket]}
          indexLabel={indexLabels[selectedMarket]}
          data={marketData[selectedMarket]}
          labels={{
            indexName: t('europe_news_index_name'),
            dailyChange: t('europe_news_daily_change'),
            source: t('europe_news_source'),
            unavailable: t('europe_news_unavailable'),
            unavailableHelper: t('europe_news_unavailable_helper'),
            delayed: t('europe_news_delayed_badge'),
          }}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <PortfolioComparisonCard
          market={selectedMarket}
          marketLabel={marketLabels[selectedMarket]}
          locale={locale}
          t={t}
        />

        <section className="europe-news-content-layout">
          <div className="europe-news-news-column">
            <section className="europe-news-controls">
              <label className="europe-news-search">
                <Search size={17} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </label>
            </section>

            {loading ? (
              <EuropeNewsSkeleton />
            ) : error ? (
              <section className="europe-news-state error" role="alert">
                <AlertTriangle size={24} />
                <strong>{t('europe_news_error')}</strong>
                <p>{error}</p>
                <button type="button" onClick={() => void load()}>
                  <RefreshCcw size={16} />
                  {t('market_retry')}
                </button>
              </section>
            ) : visibleItems.length === 0 ? (
              <section className="europe-news-state">
                <Newspaper size={24} />
                <strong>{t('europe_news_empty')}</strong>
                <p>{t('europe_news_empty_hint')}</p>
              </section>
            ) : (
              <section className="europe-news-grid" aria-label={t('europe_news_title')}>
                {visibleItems.map(item => {
                  const market = getEuropeMarket(item.market);
                  return (
                    <EuropeNewsCard
                      key={item.id}
                      item={item}
                      marketBadge={`${market.code} ${indexLabels[item.market]}`}
                      labels={{
                        source: t('europe_news_source'),
                        openArticle: t('europe_news_open_article'),
                        translated: t('news_translated_badge'),
                        originalLanguage: t('news_original_language_badge'),
                      }}
                      formatDateTime={formatDateTime}
                    />
                  );
                })}
              </section>
            )}

            <p className="europe-news-disclaimer">{t('europe_news_disclaimer')}</p>
          </div>

          <aside className="europe-news-side-panel" aria-label={t('market_movers_title')}>
            <MarketMoversCard
              market={selectedMarket}
              marketLabel={marketLabels[selectedMarket]}
              locale={locale}
              labels={{
                title: t('market_movers_title'),
                subtitle: t('market_movers_subtitle'),
                compactTitle: t('market_movers_compact_title'),
                compactSubtitle: t('market_movers_compact_subtitle'),
                fullDetails: t('market_movers_full_details'),
                fullTitle: t('market_movers_full_title'),
                fullSubtitle: t('market_movers_full_subtitle'),
                close: t('market_movers_close'),
                topGainers: t('market_movers_top_gainers'),
                topLosers: t('market_movers_top_losers'),
                highestPrice: t('market_movers_highest_price'),
                lowestPrice: t('market_movers_lowest_price'),
                highestVolume: t('market_movers_highest_volume'),
                lowestVolume: t('market_movers_lowest_volume'),
                topGainersShort: t('market_movers_top_gainers_short'),
                topLosersShort: t('market_movers_top_losers_short'),
                highestVolumeShort: t('market_movers_highest_volume_short'),
                stocksCount: t('market_movers_stocks_count'),
                price: t('market_movers_price'),
                change: t('market_movers_change'),
                volume: t('market_movers_volume'),
                source: t('market_movers_source'),
                lastUpdated: t('market_movers_last_updated'),
                refresh: t('market_movers_refresh'),
                loading: t('market_movers_loading'),
                unavailableTitle: t('market_movers_unavailable_title'),
                unavailableBody: t('market_movers_unavailable_body'),
                emptyTitle: t('market_movers_empty_title'),
                emptyBody: t('market_movers_empty_body'),
                limitedData: t('market_movers_limited_data'),
              }}
            />
          </aside>
        </section>
      </main>

      <style jsx global>{`
        .europe-news-shell{--europe-bg:#F4F8FC;--europe-panel:var(--sfm-card);--europe-panel-soft:var(--sfm-light-card);--europe-border:rgba(29,140,255,.14);--europe-border-strong:rgba(29,140,255,.24);--europe-text:var(--sfm-primary-dark);--europe-muted:var(--sfm-muted);--europe-accent:var(--sfm-soft-cyan);--europe-amber:#B45309;--europe-red:#DC2626;min-height:100dvh;background:var(--europe-bg);color:var(--europe-text);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .dark .europe-news-shell{--europe-bg:#0A1422;--europe-panel:#0F1D31;--europe-panel-soft:#0B1829;--europe-border:#1D3050;--europe-border-strong:#2A456C;--europe-text:#E8EEF6;--europe-muted:#8EA6C3;--europe-accent:#2FD6C0;--europe-amber:#F5B942;--europe-red:#FF5B6E}
        .europe-news-main{width:100%;max-width:1280px;margin:0 auto;padding:18px 22px 32px;margin-inline-start:230px;display:grid;gap:18px;overflow-x:hidden}
        .europe-ticker-strip{position:relative;z-index:2;display:block;width:100%;min-height:52px;border:1px solid var(--europe-border);background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border-radius:18px;overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}.europe-ticker-viewport{width:100%;overflow-x:auto;scrollbar-width:none;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.europe-ticker-viewport::-webkit-scrollbar{display:none}.europe-ticker-track{width:max-content;display:flex;align-items:center;animation:europeTickerMarquee 42s linear infinite;will-change:transform}.europe-ticker-strip:hover .europe-ticker-track,.europe-ticker-strip:focus-within .europe-ticker-track,.europe-ticker-strip:active .europe-ticker-track,.europe-ticker-strip.is-paused .europe-ticker-track{animation-play-state:paused}.europe-ticker-set{display:flex;align-items:center;flex:0 0 auto}.europe-ticker-item{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--europe-border);white-space:nowrap}.europe-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--europe-accent);font-size:12px;font-weight:950}.europe-ticker-item span{color:var(--europe-text);font-size:12px;font-weight:950;max-width:230px;overflow:hidden;text-overflow:ellipsis}.europe-ticker-item b{direction:ltr;unicode-bidi:isolate;color:var(--europe-muted);font-size:12px;font-style:normal}.europe-ticker-item em{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;font-style:normal;line-height:1.2}.europe-ticker-item em.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-ticker-item em.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-ticker-item em.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}@keyframes europeTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .europe-news-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 0}.europe-news-title-row{display:flex;align-items:center;gap:14px;min-width:0}.europe-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--europe-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}.europe-news-header h1{margin:0;color:var(--europe-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950}.europe-news-header p{margin:8px 0 0;color:var(--europe-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}.europe-news-status-dot,.europe-news-status-health{width:8px;height:8px;border-radius:50%;background:var(--europe-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}.europe-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}.europe-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--europe-border);background:var(--europe-panel);color:var(--europe-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}.europe-news-icon-btn:hover,.europe-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--europe-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}.europe-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:europeNewsSpin .9s linear infinite}@keyframes europeNewsSpin{to{transform:rotate(360deg)}}.europe-news-sun,.dark .europe-news-moon{display:block}.europe-news-moon,.dark .europe-news-sun{display:none}
        .europe-news-status-bar{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--europe-muted);box-shadow:0 12px 30px rgba(3,18,37,.05);font-size:12px;font-weight:900}.europe-news-status-bar strong{border-radius:999px;padding:5px 10px;background:rgba(245,185,66,.12);color:var(--europe-amber);border:1px solid rgba(245,185,66,.24)}
        .europe-news-market-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.europe-news-market-grid button{min-width:0;min-height:120px;border:1px solid var(--europe-border);border-radius:20px;background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));color:var(--europe-text);box-shadow:0 16px 44px rgba(3,18,37,.10);font-family:Tajawal,Arial,sans-serif;display:grid;grid-template-areas:"code change" "name name" "index index";gap:7px 10px;align-items:center;text-align:start;padding:16px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.europe-news-market-grid button:hover,.europe-news-market-grid button:focus-visible{outline:none;transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 0 0 4px rgba(47,214,192,.08),0 18px 48px rgba(3,18,37,.14)}.europe-news-market-grid button.active{background:linear-gradient(135deg,var(--europe-accent),#1AAE9D);border-color:rgba(47,214,192,.7);color:#061A2E;box-shadow:0 18px 48px rgba(47,214,192,.20)}.europe-news-market-code{grid-area:code;direction:ltr;unicode-bidi:isolate;width:max-content;border-radius:999px;padding:6px 10px;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--europe-accent);font-size:13px;font-weight:950}.active .europe-news-market-code{background:rgba(6,26,46,.18);border-color:rgba(6,26,46,.20);color:#061A2E}.europe-news-market-name{grid-area:name;font-size:15px;font-weight:950}.europe-news-market-index{grid-area:index;color:var(--europe-muted);font-size:12px;font-weight:900}.active .europe-news-market-index{color:#123344}.europe-news-market-change{grid-area:change;justify-self:end;display:inline-flex;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.europe-news-market-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-news-market-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-news-market-change.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}.active .europe-news-market-change{background:rgba(6,26,46,.16);color:#061A2E}
        .europe-news-summary{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:22px;padding:20px;box-shadow:0 18px 48px rgba(3,18,37,.12);display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}.europe-news-summary-identity{display:flex;align-items:center;gap:13px;min-width:0}.europe-news-summary-code{direction:ltr;unicode-bidi:isolate;width:max-content;min-width:70px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.24);color:var(--europe-accent);font-size:18px;font-weight:950;padding-inline:10px}.europe-news-summary-identity span:not(.europe-news-summary-code){display:block;color:var(--europe-muted);font-size:12px;font-weight:950}.europe-news-summary-identity h2{margin:4px 0;color:var(--europe-text);font-size:24px;font-weight:950;line-height:1.2}.europe-news-summary-identity p{margin:0;color:var(--europe-muted);font-size:13px;font-weight:850}.europe-news-summary-identity>strong{align-self:flex-start;border-radius:999px;padding:6px 10px;background:rgba(245,185,66,.12);color:var(--europe-amber);border:1px solid rgba(245,185,66,.24);font-size:11px;font-weight:950;white-space:nowrap}.europe-news-summary-market{display:grid;justify-items:end;gap:5px;min-width:210px}.europe-news-summary-market span{color:var(--europe-muted);font-size:12px;font-weight:950}.europe-news-summary-market strong{direction:ltr;unicode-bidi:isolate;color:var(--europe-text);font-size:30px;font-weight:950;line-height:1.15}.europe-news-summary-market p{margin:0;max-width:320px;text-align:end;color:var(--europe-muted);font-size:12px;font-weight:820;line-height:1.6}.europe-news-summary-market small{color:var(--europe-muted);font-size:11px;font-weight:820}.europe-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex!important;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-style:normal;font-size:13px;font-weight:950;line-height:1.2}.europe-news-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-news-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-news-change.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}.dark .europe-ticker-item em.up,.dark .europe-news-market-change.up,.dark .europe-news-change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .europe-ticker-item em.down,.dark .europe-news-market-change.down,.dark .europe-news-change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.europe-news-market-grid button.active .europe-news-market-change{background:rgba(6,26,46,.16);border-color:rgba(6,26,46,.20);color:#061A2E}
        .europe-news-content-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);gap:18px;align-items:start;min-width:0}.europe-news-shell[dir="rtl"] .europe-news-content-layout{grid-template-columns:minmax(300px,360px) minmax(0,1fr)}.europe-news-shell[dir="rtl"] .europe-news-news-column{grid-column:2}.europe-news-shell[dir="rtl"] .europe-news-side-panel{grid-column:1}.europe-news-news-column{display:grid;gap:16px;min-width:0}.europe-news-side-panel{min-width:0;position:sticky;top:24px}
        .europe-news-controls{background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;min-width:0}.europe-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--europe-border);background:var(--europe-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--europe-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}.europe-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}.europe-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--europe-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}.europe-news-search input::placeholder{color:var(--europe-muted);opacity:1}
        .europe-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}.europe-news-card{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:20px;padding:18px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.europe-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}.europe-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--europe-muted);font-size:11px;font-weight:900;line-height:1.55;flex-wrap:wrap}.europe-news-market-tag{border-radius:999px;background:#CCFBF1;border:1px solid rgba(15,118,110,.25);color:#0F766E;padding:6px 10px;font-size:12px;font-weight:950}.europe-news-translation-badge{border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;border:1px solid var(--europe-border);color:var(--europe-muted);background:rgba(142,166,195,.10)}.europe-news-translation-badge.translated{color:#0F766E;border-color:rgba(15,118,110,.25);background:#CCFBF1}.europe-news-card h2{margin:0;color:var(--europe-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.europe-news-card p{margin:0;color:var(--europe-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.europe-news-meta{border-top:1px solid var(--europe-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--europe-muted);font-size:12px;font-weight:900;line-height:1.55}.europe-news-meta a,.europe-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;color:var(--europe-muted);text-decoration:none}.europe-news-meta a:hover,.europe-news-meta a:focus-visible{outline:none;color:var(--europe-accent)}
        .dark .europe-news-market-tag,.dark .europe-news-translation-badge.translated{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.europe-news-summary-code,.europe-news-market-code{background:#CCFBF1!important;border-color:rgba(15,118,110,.25)!important;color:#0F766E!important}.dark .europe-news-summary-code,.dark .europe-news-market-code{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.25)!important;color:#2FD6C0!important}.europe-news-market-grid button.active .europe-news-market-code{background:rgba(6,26,46,.18)!important;border-color:rgba(6,26,46,.20)!important;color:#061A2E!important}
        .europe-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--europe-muted);background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px dashed var(--europe-border-strong);border-radius:22px}.europe-news-state svg{color:var(--europe-accent)}.europe-news-state strong{display:block;color:var(--europe-text);font-size:19px;font-weight:950}.europe-news-state p{margin:0;max-width:620px;color:var(--europe-muted);font-weight:850;line-height:1.75}.europe-news-state button{border:0;border-radius:14px;background:var(--europe-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.europe-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--europe-muted);font-size:12px;font-weight:820;line-height:1.7}
        .europe-news-skeleton span,.europe-news-skeleton i,.europe-news-skeleton b,.europe-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:europeNewsShimmer 1.2s linear infinite}.europe-news-skeleton span{width:42%;height:18px}.europe-news-skeleton i{width:100%;height:15px}.europe-news-skeleton i:nth-child(3){width:76%}.europe-news-skeleton b{width:58%;height:38px;border-radius:14px}.europe-news-skeleton small{width:35%;height:14px}@keyframes europeNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1180px){.europe-news-market-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.europe-news-content-layout,.europe-news-shell[dir="rtl"] .europe-news-content-layout{grid-template-columns:1fr}.europe-news-shell[dir="rtl"] .europe-news-news-column,.europe-news-shell[dir="rtl"] .europe-news-side-panel{grid-column:auto}.europe-news-side-panel{position:relative;top:auto;order:-1}}
        @media(max-width:1024px){.europe-news-main{margin-inline-start:0;padding-top:92px}.europe-news-header{align-items:flex-start}.europe-news-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.europe-news-main{padding-inline:14px}.europe-news-header{display:grid}.europe-news-header-actions{justify-content:flex-start}.europe-news-title-icon{width:50px;height:50px}.europe-news-header h1{font-size:29px}.europe-news-market-grid,.europe-news-summary{grid-template-columns:1fr}.europe-news-summary-market{justify-items:start;min-width:0}.europe-news-summary-market p{text-align:start}.europe-news-card,.europe-news-search{border-radius:18px}.europe-news-meta{display:grid;gap:8px}.europe-ticker-strip{margin-inline:-2px}.europe-ticker-viewport{overflow-x:auto;scrollbar-width:thin;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.europe-ticker-item span{max-width:210px}}
        @media(prefers-reduced-motion:reduce){.europe-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.europe-ticker-track{animation:none}.europe-ticker-set[aria-hidden="true"]{display:none}}
      `}</style>
    </div>
  );
}

export default EuropeNewsPage;
