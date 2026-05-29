'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, RefreshCcw } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechNewsItem, TechNewsPayload } from '@/lib/market/fetchTechNews';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import type { TechNewsSectorFilter } from '@/lib/market/techStocks';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import { TechNewsFilters } from '@/components/tech-news/TechNewsFilters';
import { TechNewsHeader } from '@/components/tech-news/TechNewsHeader';
import { TechNewsSkeleton } from '@/components/tech-news/TechNewsSkeleton';
import { TechTickerStrip } from '@/components/tech-news/TechTickerStrip';

type ApiResponse = TechNewsPayload | { success: false; error?: string; reason?: string };

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

export function TechNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<TechNewsItem[]>([]);
  const [prices, setPrices] = useState<TechStockPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<TechNewsSectorFilter>('all');
  const locale = localeFor(lang);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setRefreshing(!showLoader);
    setError('');
    try {
      const response = await fetch(`/api/tech-news?lang=${encodeURIComponent(lang)}`);
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

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(item => sector === 'all' || item.sector === sector)
      .filter(item => !needle
        || item.companyName.toLowerCase().includes(needle)
        || item.ticker.toLowerCase().includes(needle)
        || item.headline.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [items, query, sector]);

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
    ? t('tech_news_updated_daily')
    : `${t('tech_news_updated_daily')} • ${t('tech_news_last_updated_before')} ${updatedMinutes} ${t('tech_news_minutes')}`;

  const sectorLabels = {
    all: t('tech_news_sector_all'),
    ai: t('tech_news_sector_ai'),
    semiconductors: t('tech_news_sector_semiconductors'),
    software: t('tech_news_sector_software'),
    hardware: t('tech_news_sector_hardware'),
    ecommerce: t('tech_news_sector_ecommerce'),
    cloud: t('tech_news_sector_cloud'),
    ev: t('tech_news_sector_ev'),
  };

  return (
    <div className="tech-news-shell" dir={dir}>
      <AppHeader />
      <Sidebar />
      <main className="tech-news-main">
        <TechTickerStrip prices={prices} formatPrice={formatPrice} />

        <TechNewsHeader
          title={t('tech_news_title')}
          subtitle={headerSubtitle}
          refreshing={refreshing}
          onRefresh={() => void load(false)}
        />

        <TechNewsFilters
          query={query}
          sector={sector}
          sort="recent"
          labels={{
            search: t('tech_news_search_placeholder'),
            sort: t('tech_news_sort'),
            recent: t('tech_news_sort_recent'),
            sectors: sectorLabels,
          }}
          onQueryChange={setQuery}
          onSectorChange={setSector}
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
        ) : visibleItems.length === 0 ? (
          <section className="tech-news-state">
            <Newspaper size={24} />
            <strong>{t('tech_news_empty')}</strong>
            <p>{t('tech_news_empty_hint')}</p>
          </section>
        ) : (
          <section className="tech-news-grid" aria-label={t('tech_news_title')}>
            {visibleItems.map(item => (
              <TechNewsCard
                key={item.id}
                item={item}
                labels={{
                  source: t('tech_news_source'),
                  published: t('tech_news_published'),
                  openArticle: t('tech_news_open_article'),
                  priceUnavailable: t('tech_news_price_unavailable'),
                  translated: t('news_translated_badge'),
                  originalLanguage: t('news_original_language_badge'),
                }}
                formatDateTime={formatDateTime}
                formatPrice={formatPrice}
              />
            ))}
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
        .tech-news-main{width:100%;max-width:1280px;margin:0 auto;padding:18px 22px 32px;margin-inline-start:230px;display:grid;gap:18px;overflow-x:hidden}
        .tech-ticker-strip{border:1px solid var(--tech-border);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border-radius:18px;overflow:hidden;box-shadow:0 16px 44px rgba(3,18,37,.12)}
        .tech-ticker-track{width:max-content;display:flex;gap:0;overflow-x:auto;scrollbar-width:thin;animation:techTickerMarquee 34s linear infinite;will-change:transform}.tech-ticker-strip:hover .tech-ticker-track{animation-play-state:paused}@keyframes techTickerMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .tech-ticker-item{flex:0 0 auto;min-height:44px;display:flex;align-items:center;gap:9px;padding:0 16px;border-inline-end:1px solid var(--tech-border);white-space:nowrap}
        .tech-ticker-item strong{direction:ltr;unicode-bidi:isolate;color:var(--tech-text);font-size:12px;font-weight:950}
        .tech-ticker-item span{direction:ltr;unicode-bidi:isolate;color:var(--tech-muted);font-size:12px;font-weight:900}
        .tech-ticker-item b{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 7px;font-size:11px;font-weight:950}
        .tech-ticker-item b.up{color:#2FD6C0;background:rgba(47,214,192,.10)}.tech-ticker-item b.down{color:#FB7185;background:rgba(251,113,133,.10)}.tech-ticker-item b.neutral{color:var(--tech-muted);background:rgba(142,166,195,.10)}
        .tech-news-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 0}
        .tech-news-title-row{display:flex;align-items:center;gap:14px;min-width:0}
        .tech-news-title-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(47,214,192,.22),rgba(47,214,192,.06));border:1px solid rgba(47,214,192,.34);color:var(--tech-accent);box-shadow:0 12px 34px rgba(47,214,192,.10)}
        .tech-news-header h1{margin:0;color:var(--tech-text);font-size:clamp(28px,4vw,42px);line-height:1.1;font-weight:950;letter-spacing:0}
        .tech-news-header p{margin:8px 0 0;color:var(--tech-muted);font-size:13px;font-weight:850;display:flex;align-items:center;gap:8px;line-height:1.6}
        .tech-news-status-dot{width:8px;height:8px;border-radius:50%;background:var(--tech-accent);box-shadow:0 0 0 4px rgba(47,214,192,.14);flex:0 0 auto}
        .tech-news-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}
        .tech-news-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--tech-border);background:var(--tech-panel);color:var(--tech-text);display:grid;place-items:center;position:relative;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease}
        .tech-news-icon-btn:hover,.tech-news-icon-btn:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(47,214,192,.48);color:var(--tech-accent);box-shadow:0 0 0 4px rgba(47,214,192,.10)}
        .tech-news-icon-btn:disabled{opacity:.62;cursor:not-allowed}.spinning{animation:techNewsSpin .9s linear infinite}@keyframes techNewsSpin{to{transform:rotate(360deg)}}
        .tech-news-sun,.dark .tech-news-moon{display:block}.tech-news-moon,.dark .tech-news-sun{display:none}
        .tech-news-controls{background:transparent;border:0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;min-width:0}
        .tech-news-search{display:flex;align-items:center;gap:10px;border:1px solid var(--tech-border);background:var(--tech-panel);border-radius:18px;padding:0 16px;min-height:58px;color:var(--tech-accent);min-width:0;box-shadow:0 16px 44px rgba(3,18,37,.08);transition:border-color .18s ease,box-shadow .18s ease}
        .tech-news-search:focus-within{border-color:rgba(47,214,192,.62);box-shadow:0 0 0 4px rgba(47,214,192,.10),0 16px 44px rgba(3,18,37,.12)}
        .tech-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--tech-text);font:900 14px Tajawal,Arial,sans-serif;text-align:start}
        .tech-news-search input::placeholder{color:var(--tech-muted);opacity:1}
        .tech-news-chip-row{display:flex;gap:9px;overflow-x:auto;max-width:100%;padding-bottom:2px;scrollbar-width:thin;overscroll-behavior-inline:contain}
        .tech-news-chip-row button{flex:0 0 auto;border:1px solid var(--tech-border);background:var(--tech-panel);color:var(--tech-muted);border-radius:999px;min-height:40px;padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;transition:background .18s ease,border-color .18s ease,color .18s ease,box-shadow .18s ease}
        .tech-news-chip-row button.active{background:var(--tech-accent);border-color:var(--tech-accent);color:#061A2E;box-shadow:0 10px 24px rgba(47,214,192,.22)}
        .tech-news-chip-row button:hover,.tech-news-chip-row button:focus-visible{outline:none;border-color:rgba(47,214,192,.56);color:var(--tech-accent)}
        .tech-news-chip-row button.active:hover,.tech-news-chip-row button.active:focus-visible{color:#061A2E}
        .tech-news-filter-icon{width:40px!important;padding:0!important;display:grid!important;place-items:center!important;color:var(--tech-accent)!important}
        .tech-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-width:0}
        .tech-news-card{background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border:1px solid var(--tech-border);border-radius:20px;padding:18px;display:grid;gap:15px;box-shadow:0 18px 48px rgba(3,18,37,.13);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .tech-news-card:hover{transform:translateY(-2px);border-color:rgba(47,214,192,.46);box-shadow:0 24px 60px rgba(3,18,37,.18)}
        .tech-news-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;min-width:0}
        .tech-news-company-wrap{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
        .tech-news-company{min-width:0;color:var(--tech-text);font-size:13px;font-weight:950;overflow-wrap:anywhere}
        .tech-news-ticker{direction:ltr;unicode-bidi:isolate;border-radius:999px;background:rgba(47,214,192,.10);border:1px solid rgba(47,214,192,.18);color:var(--tech-accent);padding:5px 9px;font-size:11px;font-weight:950}.tech-news-translation-badge{border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;border:1px solid var(--tech-border);color:var(--tech-muted);background:rgba(142,166,195,.10)}.tech-news-translation-badge.translated{color:var(--tech-accent);border-color:rgba(47,214,192,.24);background:rgba(47,214,192,.10)}
        .tech-news-card-price{display:grid;justify-items:end;gap:4px;flex:0 0 auto}.tech-news-card-price strong{direction:ltr;unicode-bidi:isolate;color:var(--tech-text);font-size:15px;font-weight:950}
        .tech-news-change{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:950}.tech-news-change.up{color:#2FD6C0;background:rgba(47,214,192,.10)}.tech-news-change.down{color:#FB7185;background:rgba(251,113,133,.10)}.tech-news-change.neutral{color:var(--tech-muted);background:rgba(142,166,195,.10)}
        .tech-news-card h2{margin:0;color:var(--tech-text);font-size:18px;font-weight:950;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .tech-news-card p{margin:0;color:var(--tech-muted);font-size:13.5px;font-weight:760;line-height:1.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .tech-news-meta{border-top:1px solid var(--tech-border);padding-top:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;color:var(--tech-muted);font-size:12px;font-weight:900;line-height:1.55}
        .tech-news-meta a,.tech-news-meta span{display:inline-flex;align-items:center;gap:6px;min-width:0;color:var(--tech-muted);text-decoration:none}.tech-news-meta a:hover,.tech-news-meta a:focus-visible{outline:none;color:var(--tech-accent)}
        .tech-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:58px 20px;color:var(--tech-muted);background:linear-gradient(180deg,var(--tech-panel),var(--tech-panel-soft));border:1px dashed var(--tech-border-strong);border-radius:22px}.tech-news-state svg{color:var(--tech-accent)}.tech-news-state strong{display:block;color:var(--tech-text);font-size:19px;font-weight:950}.tech-news-state p{margin:0;max-width:620px;color:var(--tech-muted);font-weight:850;line-height:1.75}.tech-news-state button{border:0;border-radius:14px;background:var(--tech-accent);color:#061A2E;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .tech-news-disclaimer{margin:2px auto 0;text-align:center;color:var(--tech-muted);font-size:12px;font-weight:820;line-height:1.7}
        .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(142,166,195,.10),rgba(47,214,192,.20),rgba(142,166,195,.10));background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}.tech-news-skeleton span{width:42%;height:18px}.tech-news-skeleton i{width:100%;height:15px}.tech-news-skeleton i:nth-child(3){width:76%}.tech-news-skeleton i:nth-child(4){width:64%}.tech-news-skeleton b{width:58%;height:38px;border-radius:14px}.tech-news-skeleton small{width:35%;height:14px}@keyframes techNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1024px){.tech-news-main{margin-inline-start:0;padding-top:92px}.tech-news-header{align-items:flex-start}.tech-news-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.tech-news-main{padding-inline:14px}.tech-news-header{display:grid}.tech-news-header-actions{justify-content:flex-start}.tech-news-title-icon{width:50px;height:50px}.tech-news-header h1{font-size:29px}.tech-news-card,.tech-news-search{border-radius:18px}.tech-news-card-top{display:grid}.tech-news-card-price{justify-items:start}.tech-news-meta{display:grid;gap:8px}.tech-ticker-strip{margin-inline:-2px}.tech-ticker-track{animation:none;width:auto}}
        @media(prefers-reduced-motion:reduce){.tech-ticker-track{animation:none;width:auto}}
      `}</style>
    </div>
  );
}

export default TechNewsPage;
