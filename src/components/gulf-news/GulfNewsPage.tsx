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
import { GulfNewsSkeleton } from '@/components/gulf-news/GulfNewsSkeleton';
import { GulfNewsStatusBar } from '@/components/gulf-news/GulfNewsStatusBar';

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
  const [selectedMarket, setSelectedMarket] = useState<GulfMarketId>('kuwait');
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(Date.now());
  const [countdown, setCountdown] = useState(300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
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

  return (
    <div className="gulf-news-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="gulf-news-main">
        <section className="gulf-news-hero">
          <div className="gulf-news-hero-icon" aria-hidden="true">
            <Newspaper size={24} />
          </div>
          <div>
            <span className="gulf-news-eyebrow">{t('nav_group_invest_market')}</span>
            <h1>{t('gulf_news_title')}</h1>
            <p>{t('gulf_news_subtitle')}</p>
          </div>
          <span className="gulf-news-status">{t('gulf_news_delayed_badge')}</span>
        </section>

        <GulfNewsStatusBar
          labels={{
            lastUpdated: t('gulf_news_last_updated'),
            nextUpdate: t('gulf_news_next_update'),
            delayed: t('gulf_news_delayed_badge'),
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
            delayed: t('gulf_news_delayed_15'),
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
              placeholder={t('gulf_news_search_placeholder')}
              aria-label={t('gulf_news_search_placeholder')}
            />
          </label>
          <div className="gulf-news-sort">
            <span>{t('gulf_news_sort')}</span>
            <select value="recent" aria-label={t('gulf_news_sort')} onChange={() => undefined}>
              <option value="recent">{t('gulf_news_sort_recent')}</option>
            </select>
          </div>
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
          </section>
        ) : (
          <section className="gulf-news-grid" aria-label={t('gulf_news_title')}>
            {visibleItems.map(item => (
              <GulfNewsCard
                key={item.id}
                item={item}
                marketLabel={marketLabels[item.market]}
                labels={{
                  source: t('gulf_news_source'),
                  published: t('gulf_news_published'),
                  openArticle: t('gulf_news_open_article'),
                }}
                formatDateTime={formatDateTime}
              />
            ))}
          </section>
        )}

        <p className="gulf-news-disclaimer">{t('gulf_news_disclaimer')}</p>
      </main>

      <style jsx global>{`
        .gulf-news-shell{min-height:100dvh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .gulf-news-main{width:100%;max-width:1320px;margin:0 auto;padding:22px;margin-inline-start:230px;display:grid;gap:16px;overflow-x:hidden}
        .gulf-news-hero{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);padding:28px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:end;box-shadow:0 20px 60px rgba(3,18,37,.16);border:1px solid rgba(167,243,240,.24)}
        .gulf-news-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(167,243,240,.14);filter:blur(18px)}
        .gulf-news-hero-icon{position:relative;z-index:1;width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:rgba(167,243,240,.14);border:1px solid rgba(167,243,240,.24);color:var(--sfm-soft-cyan)}
        .gulf-news-hero h1{position:relative;z-index:1;margin:6px 0 8px;color:#FFFFFF;font-size:clamp(30px,5vw,48px);line-height:1.05;font-weight:950}
        .gulf-news-hero p{position:relative;z-index:1;margin:0;max-width:760px;color:rgba(255,255,255,.74);font-size:14px;font-weight:850;line-height:1.8}
        .gulf-news-eyebrow,.gulf-news-status{position:relative;z-index:1;display:inline-flex;align-items:center;width:max-content;border:1px solid rgba(167,243,240,.22);background:rgba(167,243,240,.10);border-radius:999px;padding:7px 12px;color:var(--sfm-soft-cyan);font-size:12px;font-weight:950;line-height:1.4}
        .gulf-news-status{align-self:start;color:#EAF6FF;background:rgba(255,255,255,.10);white-space:nowrap}
        .gulf-news-status-bar{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--sfm-muted);box-shadow:0 12px 30px rgba(3,18,37,.05);font-size:12px;font-weight:900}
        .gulf-news-status-bar strong{border-radius:999px;padding:5px 10px;background:rgba(245,158,11,.12);color:#B45309;border:1px solid rgba(245,158,11,.24)}
        .gulf-news-exchange-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
        .gulf-news-exchange-grid button{min-width:0;min-height:52px;border:1px solid rgba(29,140,255,.14);border-radius:18px;background:var(--sfm-card);color:var(--sfm-primary-dark);box-shadow:0 12px 30px rgba(3,18,37,.05);font:950 13px Tajawal,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,color .18s ease}
        .gulf-news-exchange-grid button:hover,.gulf-news-exchange-grid button:focus-visible,.gulf-news-exchange-grid button.active{outline:none;transform:translateY(-1px);border-color:rgba(24,212,212,.34);background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);box-shadow:0 14px 34px rgba(3,18,37,.10)}
        .gulf-news-flag{font-size:18px;line-height:1}
        .gulf-news-summary{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:18px;box-shadow:0 14px 38px rgba(3,18,37,.06);display:grid;gap:14px}
        .gulf-news-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.gulf-news-summary-head span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.gulf-news-summary-head h2{margin:4px 0 0;color:var(--sfm-primary-dark);font-size:22px;font-weight:950;line-height:1.2}.gulf-news-summary-head>strong{border-radius:999px;padding:6px 10px;background:rgba(245,158,11,.12);color:#B45309;border:1px solid rgba(245,158,11,.24);font-size:11px;font-weight:950;white-space:nowrap}
        .gulf-news-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.gulf-news-summary-grid>div{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:16px;padding:12px;display:grid;gap:5px;min-width:0}.gulf-news-summary-grid span{color:var(--sfm-muted);font-size:11px;font-weight:950}.gulf-news-summary-grid strong{color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .gulf-news-change{display:inline-flex!important;align-items:center;gap:5px;width:max-content;border-radius:999px;padding:5px 9px}.gulf-news-change.up{color:#16A34A;background:rgba(34,197,94,.10)}.gulf-news-change.down{color:#DC2626;background:rgba(239,68,68,.10)}.gulf-news-change.neutral{color:var(--sfm-muted);background:rgba(29,140,255,.08)}
        .gulf-news-controls{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:12px;align-items:center;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}
        .gulf-news-search{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);border-radius:15px;padding:0 12px;min-height:44px;color:var(--sfm-primary);min-width:0}.gulf-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--sfm-primary-dark);font:900 13px Tajawal,Arial,sans-serif}.gulf-news-search input::placeholder{color:var(--sfm-muted);opacity:1}
        .gulf-news-sort{display:grid;gap:5px;min-width:130px}.gulf-news-sort span{color:var(--sfm-muted);font-size:11px;font-weight:950}.gulf-news-sort select{height:38px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-primary-dark);font:900 12px Tajawal,Arial,sans-serif;padding:0 10px}
        .gulf-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}.gulf-news-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:18px;display:grid;gap:13px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.gulf-news-card:hover{transform:translateY(-2px);border-color:rgba(24,212,212,.28);box-shadow:0 18px 46px rgba(3,18,37,.10)}
        .gulf-news-card-top,.gulf-news-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.55;flex-wrap:wrap}.gulf-news-market-tag{border-radius:999px;background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.16);color:var(--sfm-primary);padding:5px 9px;font-size:11px;font-weight:950}
        .gulf-news-card h2{margin:0;color:var(--sfm-primary-dark);font-size:17px;font-weight:950;line-height:1.42;overflow-wrap:anywhere}.gulf-news-card p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:820;line-height:1.75;overflow-wrap:anywhere}
        .gulf-news-link{min-height:40px;border-radius:14px;background:var(--sfm-primary-dark);color:var(--sfm-card);display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:12px;font-weight:950;padding:0 13px;transition:background .18s ease,transform .18s ease,box-shadow .18s ease}.gulf-news-link:hover,.gulf-news-link:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;outline:none;transform:translateY(-1px);box-shadow:0 10px 24px rgba(29,140,255,.18)}
        .gulf-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:54px 20px;color:var(--sfm-muted);background:var(--sfm-card);border:1px dashed rgba(29,140,255,.24);border-radius:22px}.gulf-news-state svg{color:var(--sfm-primary)}.gulf-news-state strong{display:block;color:var(--sfm-primary-dark);font-size:19px;font-weight:950}.gulf-news-state p{margin:0;max-width:620px;color:var(--sfm-muted);font-weight:850;line-height:1.75}.gulf-news-state button{border:0;border-radius:14px;background:var(--sfm-primary-dark);color:var(--sfm-card);display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .gulf-news-disclaimer{margin:0;color:var(--sfm-muted);background:var(--sfm-card);border:1px solid rgba(245,158,11,.22);border-radius:18px;padding:13px 14px;font-size:12px;font-weight:850;line-height:1.7}
        .gulf-news-skeleton span,.gulf-news-skeleton i,.gulf-news-skeleton b,.gulf-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(29,140,255,.08),rgba(24,212,212,.18),rgba(29,140,255,.08));background-size:220% 100%;animation:gulfNewsShimmer 1.2s linear infinite}.gulf-news-skeleton span{width:42%;height:18px}.gulf-news-skeleton i{width:100%;height:15px}.gulf-news-skeleton i:nth-child(3){width:76%}.gulf-news-skeleton b{width:58%;height:38px;border-radius:14px}.gulf-news-skeleton small{width:35%;height:14px}@keyframes gulfNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1180px){.gulf-news-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gulf-news-exchange-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.gulf-news-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:1024px){.gulf-news-main{margin-inline-start:0;padding-top:86px}.gulf-news-hero{grid-template-columns:1fr}.gulf-news-status{white-space:normal}}
        @media(max-width:720px){.gulf-news-main{padding-inline:14px}.gulf-news-grid,.gulf-news-controls,.gulf-news-summary-grid{grid-template-columns:1fr}.gulf-news-exchange-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gulf-news-hero{padding:22px;border-radius:22px}.gulf-news-hero h1{font-size:30px}.gulf-news-controls,.gulf-news-card,.gulf-news-summary{border-radius:18px}.gulf-news-link{width:100%}.gulf-news-summary-head{display:grid}}
      `}</style>
    </div>
  );
}

export default GulfNewsPage;
