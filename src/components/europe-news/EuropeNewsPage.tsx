'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, RefreshCcw, Search } from 'lucide-react';
import { NewsPageShell } from '@/components/news/NewsPageShell';
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

type EuropeNewsApiResponse =
  | {
    success: true;
    source: string;
    language: string;
    translationEnabled: boolean;
    lastUpdated: string;
    lastSuccessfulUpdate?: string | null;
    items: EuropeNewsItem[];
    marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>;
    providerCoverage?: Array<{ providerId: string; status: string }>;
    partialFailure?: boolean;
    liveUpdatesAvailable?: boolean;
    storedFallbackUsed?: boolean;
  }
  | { success: false; error?: string; reason?: string };

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
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
  const [deliveryStatus, setDeliveryStatus] = useState({ partialFailure: false, liveUpdatesAvailable: true, storedFallbackUsed: false, providerCount: 0 });
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
      setDeliveryStatus({
        partialFailure: json.partialFailure ?? false,
        liveUpdatesAvailable: json.liveUpdatesAvailable ?? true,
        storedFallbackUsed: json.storedFallbackUsed ?? false,
        providerCount: json.providerCoverage?.length ?? 0,
      });
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
  const coverageNotice = deliveryStatus.storedFallbackUsed || !deliveryStatus.liveUpdatesAvailable
    ? t('news_stored_fallback')
    : deliveryStatus.partialFailure ? t('news_partial_coverage') : '';
  const cardEvidenceLabels = {
    official: t('news_verification_official'), confirmed: t('news_verification_confirmed'),
    singleSource: t('news_verification_single_source'), conflicting: t('news_verification_conflicting'),
    unverified: t('news_verification_unverified'), confirmations: t('news_independent_confirmations'),
    singleSourceDetail: t('news_single_source_detail'), conflictDetail: t('news_conflict_detail'),
    sourceReliability: t('market_news_source_reliability_value'), whyItMatters: t('market_news_why_it_matters'),
    importance: t('market_news_importance_label'), impactTitle: t('market_news_impact_estimate_title'),
    impactDisclaimer: t('market_news_impact_disclaimer'), supportingSources: t('market_news_view_supporting_sources'),
    updated: t('market_news_updated_label'),
    eventLabel: (eventType: EuropeNewsItem['eventType']) => t(`market_news_event_${eventType ?? 'unknown'}`),
    impactLabel: (impact: EuropeNewsItem['expectedImpact']) => t(`market_news_impact_${impact ?? 'unknown'}`),
    sentimentLabel: (sentiment: EuropeNewsItem['sentiment']) => t(`market_news_sentiment_${sentiment ?? 'unknown'}`),
  };

  return (
    <NewsPageShell category="europe" className="europe-news-shell" dir={dir}>
      <main className="europe-news-main">
        <EuropeTickerStrip
          marketLabels={marketLabels}
          indexLabels={indexLabels}
          unavailableLabel={t('europe_news_unavailable')}
          marketData={marketData}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
          direction={dir === 'rtl' ? 'rtl' : 'ltr'}
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

        <div className={`europe-news-provider-state ${coverageNotice ? 'warning' : ''}`} role="status">
          {coverageNotice ? <AlertTriangle size={16} /> : <span className="europe-news-status-health" />}
          <span>{coverageNotice || t('market_news_provider_connected')}</span>
          {deliveryStatus.providerCount > 0 ? <strong>{t('market_news_provider_coverage_count').replace('{count}', String(deliveryStatus.providerCount))}</strong> : null}
        </div>

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
                        evidence: cardEvidenceLabels,
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
        .europe-news-main{box-sizing:border-box;width:100%;max-width:100%;margin:0;padding:18px 22px 32px;display:grid;gap:18px;overflow-x:hidden}
        @media(min-width:1025px){[dir="rtl"].europe-news-shell .europe-news-main{width:100%;margin:0;padding-right:calc(var(--sidebar-w,230px) + 32px);padding-left:32px}[dir="ltr"].europe-news-shell .europe-news-main{width:100%;margin:0;padding-left:calc(var(--sidebar-w,230px) + 32px);padding-right:32px}.europe-news-main>*{width:100%;max-width:1280px;margin-inline:auto}}
        .europe-ticker-strip{position:relative;z-index:2;display:block;width:100%;min-height:52px;border:1px solid var(--europe-border);background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border-radius:var(--r-xl);overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}.europe-ticker-viewport{width:100%;overflow:hidden;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.europe-ticker-viewport::-webkit-scrollbar{display:none}.europe-ticker-track{width:max-content;display:flex;align-items:center;animation:europeTickerMarquee 42s linear infinite;will-change:transform}.europe-ticker-strip:hover .europe-ticker-track,.europe-ticker-strip:focus-within .europe-ticker-track,.europe-ticker-strip:active .europe-ticker-track,.europe-ticker-strip.is-paused .europe-ticker-track{animation-play-state:paused}.europe-ticker-set{display:flex;align-items:center;flex:0 0 auto}.europe-ticker-item{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--europe-border);white-space:nowrap}.europe-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--europe-accent);font-size:12px;font-weight:950}.europe-ticker-item span{color:var(--europe-text);font-size:12px;font-weight:950;max-width:230px;overflow:hidden;text-overflow:ellipsis}.europe-ticker-item b{direction:ltr;unicode-bidi:isolate;color:var(--europe-muted);font-size:12px;font-style:normal}.europe-ticker-item em{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border:1px solid transparent;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;font-style:normal;line-height:1.2}.europe-ticker-item em.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-ticker-item em.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-ticker-item em.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}@keyframes europeTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .europe-news-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 0}.europe-news-title-row{display:flex;align-items:center;gap:14px;min-width:0}.europe-news-title-icon{width:58px;height:58px;border-radius:var(--r-xl);display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--europe-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}.europe-news-header h1{margin:0;color:var(--europe-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950}.europe-news-header p{margin:8px 0 0;color:var(--europe-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}.europe-news-status-dot,.europe-news-status-health{width:8px;height:8px;border-radius:50%;background:var(--europe-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}.europe-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}.europe-news-icon-btn{width:46px;height:46px;border-radius:var(--r-lg);border:1px solid var(--europe-border);background:var(--europe-panel);color:var(--europe-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}.europe-news-icon-btn:hover,.europe-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--europe-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}.europe-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:europeNewsSpin .9s linear infinite}@keyframes europeNewsSpin{to{transform:rotate(360deg)}}.europe-news-sun,.dark .europe-news-moon{display:block}.europe-news-moon,.dark .europe-news-sun{display:none}
        .europe-news-status-bar{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:var(--r-xl);padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--europe-muted);box-shadow:0 12px 30px rgba(3,18,37,.05);font-size:12px;font-weight:900}.europe-news-status-bar strong{border-radius:999px;padding:5px 10px;background:rgba(245,185,66,.12);color:var(--europe-amber);border:1px solid rgba(245,185,66,.24)}
        .europe-news-provider-state{min-height:44px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid rgba(47,214,192,.24);border-radius:var(--r-lg);background:rgba(47,214,192,.08);color:var(--europe-text);padding:10px 14px;font-size:13px;font-weight:850}.europe-news-provider-state.warning{border-color:rgba(245,185,66,.34);background:rgba(245,185,66,.10)}.europe-news-provider-state.warning>svg{color:var(--europe-amber);flex:0 0 auto}.europe-news-provider-state strong{margin-inline-start:auto;color:var(--europe-muted);font-size:12px}
        .europe-news-market-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.europe-news-market-grid button{min-width:0;min-height:120px;border:1px solid var(--europe-border);border-radius:var(--r-xl);background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));color:var(--europe-text);box-shadow:0 16px 44px rgba(3,18,37,.10);font-family:Tajawal,Arial,sans-serif;display:grid;grid-template-areas:"code change" "name name" "index index";gap:7px 10px;align-items:center;text-align:start;padding:16px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.europe-news-market-grid button:hover,.europe-news-market-grid button:focus-visible{outline:none;transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 0 0 4px rgba(47,214,192,.08),0 18px 48px rgba(3,18,37,.14)}.europe-news-market-grid button.active{background:linear-gradient(135deg,var(--europe-accent),#1AAE9D);border-color:rgba(47,214,192,.7);color:#061A2E;box-shadow:0 18px 48px rgba(47,214,192,.20)}.europe-news-market-code{grid-area:code;direction:ltr;unicode-bidi:isolate;width:max-content;border-radius:999px;padding:6px 10px;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--europe-accent);font-size:13px;font-weight:950}.active .europe-news-market-code{background:rgba(6,26,46,.18);border-color:rgba(6,26,46,.20);color:#061A2E}.europe-news-market-name{grid-area:name;font-size:15px;font-weight:950}.europe-news-market-index{grid-area:index;color:var(--europe-muted);font-size:12px;font-weight:900}.active .europe-news-market-index{color:#123344}.europe-news-market-change{grid-area:change;justify-self:end;display:inline-flex;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;line-height:1.2}.europe-news-market-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-news-market-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-news-market-change.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}.active .europe-news-market-change{background:rgba(6,26,46,.16);color:#061A2E}
        .europe-news-summary{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:var(--r-2xl);padding:20px;box-shadow:0 18px 48px rgba(3,18,37,.12);display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}.europe-news-summary-identity{display:flex;align-items:center;gap:13px;min-width:0}.europe-news-summary-code{direction:ltr;unicode-bidi:isolate;width:max-content;min-width:70px;height:64px;border-radius:var(--r-xl);display:grid;place-items:center;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.24);color:var(--europe-accent);font-size:18px;font-weight:950;padding-inline:10px}.europe-news-summary-identity span:not(.europe-news-summary-code){display:block;color:var(--europe-muted);font-size:12px;font-weight:950}.europe-news-summary-identity h2{margin:4px 0;color:var(--europe-text);font-size:24px;font-weight:950;line-height:1.2}.europe-news-summary-identity p{margin:0;color:var(--europe-muted);font-size:13px;font-weight:850}.europe-news-summary-identity>strong{align-self:flex-start;border-radius:999px;padding:6px 10px;background:rgba(245,185,66,.12);color:var(--europe-amber);border:1px solid rgba(245,185,66,.24);font-size:11px;font-weight:950;white-space:nowrap}.europe-news-summary-market{display:grid;justify-items:end;gap:5px;min-width:210px}.europe-news-summary-market span{color:var(--europe-muted);font-size:12px;font-weight:950}.europe-news-summary-market strong{direction:ltr;unicode-bidi:isolate;color:var(--europe-text);font-size:30px;font-weight:950;line-height:1.15}.europe-news-summary-market p{margin:0;max-width:320px;text-align:end;color:var(--europe-muted);font-size:12px;font-weight:820;line-height:1.6}.europe-news-summary-market small{color:var(--europe-muted);font-size:11px;font-weight:820}.europe-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex!important;align-items:center;gap:5px;width:max-content;border:1px solid transparent;border-radius:999px;padding:6px 10px;font-style:normal;font-size:13px;font-weight:950;line-height:1.2}.europe-news-change.up{color:#047857;background:#CCFBF1;border-color:rgba(15,118,110,.20)}.europe-news-change.down{color:#DC2626;background:#FEE2E2;border-color:rgba(220,38,38,.20)}.europe-news-change.neutral{color:var(--europe-muted);background:rgba(142,166,195,.10);border-color:var(--europe-border)}.dark .europe-ticker-item em.up,.dark .europe-news-market-change.up,.dark .europe-news-change.up{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.dark .europe-ticker-item em.down,.dark .europe-news-market-change.down,.dark .europe-news-change.down{color:#FF5B6E;background:rgba(255,91,110,.12);border-color:rgba(255,91,110,.25)}.europe-news-market-grid button.active .europe-news-market-change{background:rgba(6,26,46,.16);border-color:rgba(6,26,46,.20);color:#061A2E}
        .europe-news-content-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start;min-width:0;width:100%}.europe-news-news-column{display:grid;gap:16px;min-width:0}.europe-news-side-panel{width:100%;min-width:0;align-self:start;position:sticky;top:96px}
        .europe-news-controls{background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;min-width:0}.europe-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--europe-border);background:var(--europe-panel);border-radius:var(--r-xl);padding:0 16px;min-height:58px;color:var(--europe-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}.europe-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}.europe-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--europe-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}.europe-news-search input::placeholder{color:var(--europe-muted);opacity:1}
        .europe-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}.europe-news-card{background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px solid var(--europe-border);border-radius:var(--r-xl);padding:18px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.europe-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}.europe-news-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--europe-muted);font-size:11px;font-weight:900;line-height:1.55;flex-wrap:wrap}.europe-news-market-tag{border-radius:999px;background:#CCFBF1;border:1px solid rgba(15,118,110,.25);color:#0F766E;padding:6px 10px;font-size:12px;font-weight:950}.europe-news-translation-badge{border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950;border:1px solid var(--europe-border);color:var(--europe-muted);background:rgba(142,166,195,.10)}.europe-news-translation-badge.translated{color:#0F766E;border-color:rgba(15,118,110,.25);background:#CCFBF1}.europe-news-card h2{margin:0;color:var(--europe-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.europe-news-card p{margin:0;color:var(--europe-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.europe-news-meta{border-top:1px solid var(--europe-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--europe-muted);font-size:12px;font-weight:900;line-height:1.55}.europe-news-meta a,.europe-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;color:var(--europe-muted);text-decoration:none}.europe-news-meta a:hover,.europe-news-meta a:focus-visible{outline:none;color:var(--europe-accent)}
        .europe-news-card.is-official{border-inline-start:3px solid var(--europe-accent)}.europe-news-card.has-conflict{border-inline-start:3px solid var(--europe-amber)}.europe-news-source-line{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--europe-muted);font-size:12px;font-weight:900}.europe-news-source-line small{font-size:11px}.europe-news-evidence{display:flex;align-items:flex-start;gap:9px;border:1px solid var(--europe-border);border-radius:var(--r-md);background:rgba(142,166,195,.07);padding:10px;color:var(--europe-muted)}.europe-news-evidence>svg{flex:0 0 auto;margin-top:2px;color:var(--europe-accent)}.europe-news-evidence>div{display:grid;gap:2px}.europe-news-evidence strong{color:var(--europe-text);font-size:12px}.europe-news-evidence span{font-size:12px;line-height:1.55}.europe-news-evidence.official{border-color:rgba(47,214,192,.28);background:rgba(47,214,192,.08)}.europe-news-evidence.conflicting{border-color:rgba(245,185,66,.34);background:rgba(245,185,66,.10)}.europe-news-evidence.conflicting>svg{color:var(--europe-amber)}.europe-news-facts{display:flex;gap:6px;flex-wrap:wrap}.europe-news-facts span,.europe-news-facts bdi{border:1px solid var(--europe-border);border-radius:999px;background:rgba(142,166,195,.07);color:var(--europe-muted);padding:5px 8px;font-size:11px;font-weight:900}.europe-news-facts bdi{direction:ltr;color:var(--europe-accent)}.europe-news-why{display:grid;gap:3px;border-inline-start:2px solid rgba(47,214,192,.45);padding-inline-start:10px}.europe-news-why strong{font-size:12px}.europe-news-why span,.europe-news-why small,.europe-news-impact-disclaimer{color:var(--europe-muted);font-size:11px;line-height:1.55}.europe-news-supporting{border-top:1px solid var(--europe-border);padding-top:10px;color:var(--europe-muted);font-size:12px}.europe-news-supporting summary{min-height:36px;display:flex;align-items:center;cursor:pointer;font-weight:900;color:var(--europe-text)}.europe-news-supporting ul{display:grid;gap:7px;margin:5px 0 0;padding:0;list-style:none}.europe-news-supporting a{min-height:32px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--europe-muted);text-decoration:none}.europe-news-meta>div{display:grid;gap:4px}.europe-news-meta>div>span{display:flex;align-items:center;gap:6px}
        .dark .europe-news-market-tag,.dark .europe-news-translation-badge.translated{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}.europe-news-summary-code,.europe-news-market-code{background:#CCFBF1!important;border-color:rgba(15,118,110,.25)!important;color:#0F766E!important}.dark .europe-news-summary-code,.dark .europe-news-market-code{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.25)!important;color:#2FD6C0!important}.europe-news-market-grid button.active .europe-news-market-code{background:rgba(6,26,46,.18)!important;border-color:rgba(6,26,46,.20)!important;color:#061A2E!important}
        .europe-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--europe-muted);background:linear-gradient(180deg,var(--europe-panel),var(--europe-panel-soft));border:1px dashed var(--europe-border-strong);border-radius:var(--r-2xl)}.europe-news-state svg{color:var(--europe-accent)}.europe-news-state strong{display:block;color:var(--europe-text);font-size:19px;font-weight:950}.europe-news-state p{margin:0;max-width:620px;color:var(--europe-muted);font-weight:850;line-height:1.75}.europe-news-state button{border:0;border-radius:var(--r-md);background:var(--europe-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.europe-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--europe-muted);font-size:12px;font-weight:820;line-height:1.7}
        .europe-news-skeleton span,.europe-news-skeleton i,.europe-news-skeleton b,.europe-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:europeNewsShimmer 1.2s linear infinite}.europe-news-skeleton span{width:42%;height:18px}.europe-news-skeleton i{width:100%;height:15px}.europe-news-skeleton i:nth-child(3){width:76%}.europe-news-skeleton b{width:58%;height:38px;border-radius:var(--r-md)}.europe-news-skeleton small{width:35%;height:14px}@keyframes europeNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1180px){.europe-news-market-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:1024px){.europe-news-content-layout{grid-template-columns:1fr}.europe-news-side-panel{position:relative;top:auto;order:-1}}
        @media(max-width:1024px){.europe-news-main{margin-inline-start:0;padding-top:92px}.europe-news-header{align-items:flex-start}.europe-news-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.europe-news-main{padding-inline:14px}.europe-news-header{display:grid}.europe-news-header-actions{justify-content:flex-start}.europe-news-title-icon{width:50px;height:50px}.europe-news-header h1{font-size:29px}.europe-news-market-grid,.europe-news-summary{grid-template-columns:1fr}.europe-news-summary-market{justify-items:start;min-width:0}.europe-news-summary-market p{text-align:start}.europe-news-card,.europe-news-search{border-radius:var(--r-xl)}.europe-news-meta{display:grid;gap:8px}.europe-ticker-strip{margin-inline:-2px}.europe-ticker-viewport{overflow-x:auto;scrollbar-width:thin;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}.europe-ticker-item span{max-width:210px}}
        @media(prefers-reduced-motion:reduce){.europe-ticker-viewport{overflow-x:auto;scrollbar-width:thin}.europe-ticker-track{animation-duration:60s}.europe-ticker-set[aria-hidden="true"]{display:none}}
      `}</style>
    </NewsPageShell>
  );
}

export default EuropeNewsPage;

