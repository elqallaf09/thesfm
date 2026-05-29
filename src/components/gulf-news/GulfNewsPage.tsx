'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, RefreshCcw, Search } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { GULF_MARKETS, getGulfMarket, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import type { GulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';
import type { GulfNewsItem } from '@/lib/gulf/parseRssFeeds';
import { GulfExchangeSelector } from '@/components/gulf-news/GulfExchangeSelector';
import { GulfMarketSummary } from '@/components/gulf-news/GulfMarketSummary';
import { GulfNewsCard } from '@/components/gulf-news/GulfNewsCard';
import { GulfNewsHeader } from '@/components/gulf-news/GulfNewsHeader';
import { GulfNewsSkeleton } from '@/components/gulf-news/GulfNewsSkeleton';
import { GulfNewsStatusBar } from '@/components/gulf-news/GulfNewsStatusBar';
import { GulfTickerStrip } from '@/components/gulf-news/GulfTickerStrip';

type GulfNewsApiResponse =
  | {
    success: true;
    source: string;
    lastUpdated: string;
    items: GulfNewsItem[];
    marketData: Partial<Record<GulfMarketId, GulfMarketData>>;
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

export function GulfNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<GulfNewsItem[]>([]);
  const [marketData, setMarketData] = useState<Partial<Record<GulfMarketId, GulfMarketData>>>({});
  const [selectedMarket, setSelectedMarket] = useState<GulfMarketId>('saudi');
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
      const response = await fetch('/api/gulf-news');
      const json = await response.json().catch(() => ({})) as GulfNewsApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('gulf_news_error') : t('gulf_news_error'));
      }
      setItems(json.items);
      setMarketData(json.marketData ?? {});
      setLastUpdated(json.lastUpdated);
      setLastLoadedAt(Date.now());
      setCountdown(300);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('gulf_news_error'));
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

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

  const selectedMarketConfig = getGulfMarket(selectedMarket);
  const marketLabels = useMemo<Record<GulfMarketId, string>>(() => ({
    kuwait: t('gulf_news_market_kuwait'),
    saudi: t('gulf_news_market_saudi'),
    oman: t('gulf_news_market_oman'),
    bahrain: t('gulf_news_market_bahrain'),
    uae: t('gulf_news_market_uae'),
    qatar: t('gulf_news_market_qatar'),
  }), [t]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(item => item.market === selectedMarket)
      .filter(item => !needle
        || item.headline.toLowerCase().includes(needle)
        || item.summary.toLowerCase().includes(needle)
        || item.source.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [items, query, selectedMarket]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return t('gulf_news_unavailable');
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return t('gulf_news_unavailable');
    return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value)}%`;
  };

  const searchPlaceholder = t('gulf_news_search_market_placeholder').replace('{market}', marketLabels[selectedMarket]);

  return (
    <div className="gulf-news-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="gulf-news-main">
        <GulfTickerStrip
          labels={marketLabels}
          unavailableLabel={t('gulf_news_unavailable')}
          marketData={marketData}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <GulfNewsHeader
          title={t('gulf_news_title')}
          subtitle={t('gulf_news_header_subtitle')}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />

        <GulfNewsStatusBar
          labels={{
            lastUpdated: t('gulf_news_last_updated'),
            nextUpdate: t('gulf_news_next_update'),
            delayed: t('gulf_news_delayed_short'),
            source: t('gulf_news_source_rss'),
          }}
          lastUpdated={lastUpdated}
          nextUpdate={formatCountdown(countdown)}
          formatDateTime={formatDateTime}
        />

        <GulfExchangeSelector
          markets={GULF_MARKETS}
          selectedMarket={selectedMarket}
          labels={marketLabels}
          unavailableLabel={t('gulf_news_unavailable')}
          marketData={marketData}
          formatPercent={formatPercent}
          onSelect={setSelectedMarket}
        />

        <GulfMarketSummary
          market={selectedMarketConfig}
          marketLabel={marketLabels[selectedMarket]}
          data={marketData[selectedMarket]}
          labels={{
            title: t('gulf_news_market_summary'),
            indexName: t('gulf_news_index_name'),
            indexValue: t('gulf_news_index_value'),
            dailyChange: t('gulf_news_daily_change'),
            source: t('gulf_news_source'),
            unavailable: t('gulf_news_unavailable'),
            unavailableHelper: t('gulf_news_unavailable_helper'),
            delayed: t('gulf_news_delayed_badge'),
          }}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
        />

        <section className="gulf-news-controls">
          <label className="gulf-news-search">
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
          <GulfNewsSkeleton />
        ) : error ? (
          <section className="gulf-news-state error" role="alert">
            <AlertTriangle size={24} />
            <strong>{t('gulf_news_error')}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              <RefreshCcw size={16} />
              {t('market_retry')}
            </button>
          </section>
        ) : visibleItems.length === 0 ? (
          <section className="gulf-news-state">
            <Newspaper size={24} />
            <strong>{t('gulf_news_empty')}</strong>
            <p>{t('gulf_news_empty_hint')}</p>
          </section>
        ) : (
          <section className="gulf-news-grid" aria-label={t('gulf_news_title')}>
            {visibleItems.map(item => {
              const market = getGulfMarket(item.market);
              return (
                <GulfNewsCard
                  key={item.id}
                  item={item}
                  marketBadge={`${market.code} ${marketLabels[item.market]}`}
                  labels={{
                    source: t('gulf_news_source'),
                    published: t('gulf_news_published'),
                    openArticle: t('gulf_news_open_article'),
                  }}
                  formatDateTime={formatDateTime}
                />
              );
            })}
          </section>
        )}

        <p className="gulf-news-disclaimer">{t('gulf_news_disclaimer')}</p>
      </main>

      <style jsx global>{`
        .gulf-news-shell{
          --gulf-bg:#F4F8FC;
          --gulf-panel:var(--sfm-card);
          --gulf-panel-soft:var(--sfm-light-card);
          --gulf-border:rgba(29,140,255,.14);
          --gulf-border-strong:rgba(29,140,255,.24);
          --gulf-text:var(--sfm-primary-dark);
          --gulf-muted:var(--sfm-muted);
          --gulf-accent:var(--sfm-soft-cyan);
          --gulf-amber:#B45309;
          --gulf-red:#DC2626;
          min-height:100dvh;background:var(--gulf-bg);color:var(--gulf-text);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden
        }
        .dark .gulf-news-shell{
          --gulf-bg:#0A1422;
          --gulf-panel:#0F1D31;
          --gulf-panel-soft:#0B1829;
          --gulf-border:#1D3050;
          --gulf-border-strong:#2A456C;
          --gulf-text:#E8EEF6;
          --gulf-muted:#8EA6C3;
          --gulf-accent:#2FD6C0;
          --gulf-amber:#F5B942;
          --gulf-red:#FF5B6E;
        }
        .gulf-news-main{width:100%;max-width:1280px;margin:0 auto;padding:18px 22px 32px;margin-inline-start:230px;display:grid;gap:18px;overflow-x:hidden}
        .gulf-ticker-strip{position:relative;z-index:2;display:block;width:100%;min-height:52px;border:1px solid var(--gulf-border);background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border-radius:18px;overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}
        .gulf-ticker-viewport{width:100%;overflow:hidden}.gulf-ticker-track{width:max-content;display:flex;align-items:center;animation:gulfTickerMarquee 38s linear infinite;will-change:transform}.gulf-ticker-strip:hover .gulf-ticker-track{animation-play-state:paused}.gulf-ticker-set{display:flex;align-items:center;flex:0 0 auto}.gulf-ticker-item{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--gulf-border);white-space:nowrap}.gulf-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--gulf-accent);font-size:12px;font-weight:950}.gulf-ticker-item span{color:var(--gulf-text);font-size:12px;font-weight:950;max-width:230px;overflow:hidden;text-overflow:ellipsis}.gulf-ticker-item b{direction:ltr;unicode-bidi:isolate;color:var(--gulf-muted);font-size:12px;font-style:normal}.gulf-ticker-item em{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 7px;font-size:11px;font-weight:950;font-style:normal}.gulf-ticker-item em.up{color:var(--gulf-accent);background:rgba(47,214,192,.10)}.gulf-ticker-item em.down{color:var(--gulf-red);background:rgba(255,91,110,.10)}.gulf-ticker-item em.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10)}@keyframes gulfTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .gulf-news-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 0}.gulf-news-title-row{display:flex;align-items:center;gap:14px;min-width:0}.gulf-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--gulf-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}.gulf-news-header h1{margin:0;color:var(--gulf-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950}.gulf-news-header p{margin:8px 0 0;color:var(--gulf-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}.gulf-news-status-dot,.gulf-news-status-health{width:8px;height:8px;border-radius:50%;background:var(--gulf-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}.gulf-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}.gulf-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--gulf-border);background:var(--gulf-panel);color:var(--gulf-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}.gulf-news-icon-btn:hover,.gulf-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--gulf-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}.gulf-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:gulfNewsSpin .9s linear infinite}@keyframes gulfNewsSpin{to{transform:rotate(360deg)}}.gulf-news-sun,.dark .gulf-news-moon{display:block}.gulf-news-moon,.dark .gulf-news-sun{display:none}
        .gulf-news-status-bar{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--gulf-muted);box-shadow:0 12px 30px rgba(3,18,37,.05);font-size:12px;font-weight:900}.gulf-news-status-bar strong{border-radius:999px;padding:5px 10px;background:rgba(245,185,66,.12);color:var(--gulf-amber);border:1px solid rgba(245,185,66,.24)}
        .gulf-news-exchange-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.gulf-news-exchange-grid button{min-width:0;min-height:104px;border:1px solid var(--gulf-border);border-radius:20px;background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));color:var(--gulf-text);box-shadow:0 16px 44px rgba(3,18,37,.10);font-family:Tajawal,Arial,sans-serif;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"code name" "code change";gap:6px 12px;align-items:center;text-align:start;padding:16px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.gulf-news-exchange-grid button:hover,.gulf-news-exchange-grid button:focus-visible{outline:none;transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 0 0 4px rgba(47,214,192,.08),0 18px 48px rgba(3,18,37,.14)}.gulf-news-exchange-grid button.active{background:linear-gradient(135deg,var(--gulf-accent),#1AAE9D);border-color:rgba(47,214,192,.7);color:#061A2E;box-shadow:0 18px 48px rgba(47,214,192,.20)}.gulf-news-exchange-code{grid-area:code;direction:ltr;unicode-bidi:isolate;width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--gulf-accent);font-size:20px;font-weight:950}.active .gulf-news-exchange-code{background:rgba(6,26,46,.18);border-color:rgba(6,26,46,.20);color:#061A2E}.gulf-news-exchange-name{grid-area:name;font-size:15px;font-weight:950}.gulf-news-exchange-change{grid-area:change;display:inline-flex;align-items:center;gap:5px;width:max-content;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950}.gulf-news-exchange-change.up{color:var(--gulf-accent);background:rgba(47,214,192,.10)}.gulf-news-exchange-change.down{color:var(--gulf-red);background:rgba(255,91,110,.10)}.gulf-news-exchange-change.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10)}.active .gulf-news-exchange-change{background:rgba(6,26,46,.16);color:#061A2E}
        .gulf-news-summary{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:22px;padding:20px;box-shadow:0 18px 48px rgba(3,18,37,.12);display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}.gulf-news-summary-identity{display:flex;align-items:center;gap:13px;min-width:0}.gulf-news-summary-code{direction:ltr;unicode-bidi:isolate;width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.24);color:var(--gulf-accent);font-size:22px;font-weight:950}.gulf-news-summary-identity span:not(.gulf-news-summary-code){display:block;color:var(--gulf-muted);font-size:12px;font-weight:950}.gulf-news-summary-identity h2{margin:4px 0;color:var(--gulf-text);font-size:24px;font-weight:950;line-height:1.2}.gulf-news-summary-identity p{margin:0;color:var(--gulf-muted);font-size:13px;font-weight:850}.gulf-news-summary-identity>strong{align-self:flex-start;border-radius:999px;padding:6px 10px;background:rgba(245,185,66,.12);color:var(--gulf-amber);border:1px solid rgba(245,185,66,.24);font-size:11px;font-weight:950;white-space:nowrap}.gulf-news-summary-market{display:grid;justify-items:end;gap:5px;min-width:210px}.gulf-news-summary-market span{color:var(--gulf-muted);font-size:12px;font-weight:950}.gulf-news-summary-market strong{direction:ltr;unicode-bidi:isolate;color:var(--gulf-text);font-size:30px;font-weight:950;line-height:1.15}.gulf-news-summary-market p{margin:0;max-width:320px;text-align:end;color:var(--gulf-muted);font-size:12px;font-weight:820;line-height:1.6}.gulf-news-summary-market small{color:var(--gulf-muted);font-size:11px;font-weight:820}.gulf-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex!important;align-items:center;gap:5px;width:max-content;border-radius:999px;padding:5px 9px;font-style:normal;font-size:13px;font-weight:950}.gulf-news-change.up{color:var(--gulf-accent);background:rgba(47,214,192,.10)}.gulf-news-change.down{color:var(--gulf-red);background:rgba(255,91,110,.10)}.gulf-news-change.neutral{color:var(--gulf-muted);background:rgba(142,166,195,.10)}
        .gulf-news-controls{background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;min-width:0}.gulf-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--gulf-border);background:var(--gulf-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--gulf-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}.gulf-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}.gulf-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--gulf-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}.gulf-news-search input::placeholder{color:var(--gulf-muted);opacity:1}
        .gulf-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}.gulf-news-card{background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px solid var(--gulf-border);border-radius:20px;padding:18px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.gulf-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}.gulf-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--gulf-muted);font-size:11px;font-weight:900;line-height:1.55;flex-wrap:wrap}.gulf-news-market-tag{border-radius:999px;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--gulf-accent);padding:5px 9px;font-size:11px;font-weight:950}.gulf-news-card h2{margin:0;color:var(--gulf-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.gulf-news-card p{margin:0;color:var(--gulf-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.gulf-news-meta{border-top:1px solid var(--gulf-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--gulf-muted);font-size:12px;font-weight:900;line-height:1.55}.gulf-news-meta a,.gulf-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;color:var(--gulf-muted);text-decoration:none}.gulf-news-meta a:hover,.gulf-news-meta a:focus-visible{outline:none;color:var(--gulf-accent)}
        .gulf-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--gulf-muted);background:linear-gradient(180deg,var(--gulf-panel),var(--gulf-panel-soft));border:1px dashed var(--gulf-border-strong);border-radius:22px}.gulf-news-state svg{color:var(--gulf-accent)}.gulf-news-state strong{display:block;color:var(--gulf-text);font-size:19px;font-weight:950}.gulf-news-state p{margin:0;max-width:620px;color:var(--gulf-muted);font-weight:850;line-height:1.75}.gulf-news-state button{border:0;border-radius:14px;background:var(--gulf-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.gulf-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--gulf-muted);font-size:12px;font-weight:820;line-height:1.7}
        .gulf-news-skeleton span,.gulf-news-skeleton i,.gulf-news-skeleton b,.gulf-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:gulfNewsShimmer 1.2s linear infinite}.gulf-news-skeleton span{width:42%;height:18px}.gulf-news-skeleton i{width:100%;height:15px}.gulf-news-skeleton i:nth-child(3){width:76%}.gulf-news-skeleton b{width:58%;height:38px;border-radius:14px}.gulf-news-skeleton small{width:35%;height:14px}@keyframes gulfNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1024px){.gulf-news-main{margin-inline-start:0;padding-top:92px}.gulf-news-header{align-items:flex-start}.gulf-news-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.gulf-news-main{padding-inline:14px}.gulf-news-header{display:grid}.gulf-news-header-actions{justify-content:flex-start}.gulf-news-title-icon{width:50px;height:50px}.gulf-news-header h1{font-size:29px}.gulf-news-exchange-grid,.gulf-news-summary{grid-template-columns:1fr}.gulf-news-summary-market{justify-items:start;min-width:0}.gulf-news-summary-market p{text-align:start}.gulf-news-card,.gulf-news-search{border-radius:18px}.gulf-news-meta{display:grid;gap:8px}.gulf-ticker-strip{margin-inline:-2px}.gulf-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.gulf-ticker-track{animation:none}.gulf-ticker-set[aria-hidden="true"]{display:none}.gulf-ticker-item span{max-width:210px}}
        @media(prefers-reduced-motion:reduce){.gulf-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.gulf-ticker-track{animation:none}.gulf-ticker-set[aria-hidden="true"]{display:none}}
      `}</style>
    </div>
  );
}

export default GulfNewsPage;
