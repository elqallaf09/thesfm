'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Newspaper, RefreshCcw } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import type { TechNewsItem, TechNewsPayload } from '@/lib/market/fetchTechNews';
import type { TechNewsSectorFilter } from '@/lib/market/techStocks';
import { TechNewsCard } from '@/components/tech-news/TechNewsCard';
import { TechNewsFilters } from '@/components/tech-news/TechNewsFilters';
import { TechNewsSkeleton } from '@/components/tech-news/TechNewsSkeleton';

type ApiResponse = TechNewsPayload | { success: false; error?: string; reason?: string };

function localeFor(lang: string) {
  if (lang === 'en') return 'en-US';
  if (lang === 'fr') return 'fr-FR';
  return 'ar-KW';
}

export function TechNewsPage() {
  const { dir, lang, t } = useLanguage();
  const [items, setItems] = useState<TechNewsItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<TechNewsSectorFilter>('all');
  const locale = localeFor(lang);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tech-news');
      const json = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok || !json.success) {
        throw new Error('reason' in json ? json.reason || json.error || t('tech_news_error') : t('tech_news_error'));
      }
      setItems(json.items);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      setItems([]);
      setLastUpdated('');
      setError(loadError instanceof Error ? loadError.message : t('tech_news_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatPrice = (value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value > 100 ? 2 : 3,
    }).format(value);
  };

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
        <section className="tech-news-hero">
          <div className="tech-news-hero-icon" aria-hidden="true">
            <Newspaper size={24} />
          </div>
          <div>
            <span className="tech-news-eyebrow">{t('nav_group_invest_market')}</span>
            <h1>{t('tech_news_title')}</h1>
            <p>{t('tech_news_subtitle')}</p>
          </div>
          <span className="tech-news-status">
            {t('tech_news_last_updated')}: {lastUpdated ? formatDateTime(lastUpdated) : '—'}
          </span>
        </section>

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
                }}
                formatDateTime={formatDateTime}
                formatPrice={formatPrice}
              />
            ))}
          </section>
        )}
      </main>

      <style jsx global>{`
        .tech-news-shell{min-height:100dvh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .tech-news-main{width:100%;max-width:1320px;margin:0 auto;padding:22px;margin-inline-start:230px;display:grid;gap:16px;overflow-x:hidden}
        .tech-news-hero{position:relative;overflow:hidden;border-radius:26px;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 150%);color:var(--sfm-card);padding:28px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:end;box-shadow:0 20px 60px rgba(3,18,37,.16);border:1px solid rgba(167,243,240,.24)}
        .tech-news-hero:before{content:"";position:absolute;inset-inline-end:-70px;top:-80px;width:230px;height:230px;border-radius:50%;background:rgba(167,243,240,.14);filter:blur(18px)}
        .tech-news-hero-icon{position:relative;z-index:1;width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:rgba(167,243,240,.14);border:1px solid rgba(167,243,240,.24);color:var(--sfm-soft-cyan)}
        .tech-news-hero h1{position:relative;z-index:1;margin:6px 0 8px;color:#FFFFFF;font-size:clamp(30px,5vw,48px);line-height:1.05;font-weight:950}
        .tech-news-hero p{position:relative;z-index:1;margin:0;max-width:760px;color:rgba(255,255,255,.74);font-size:14px;font-weight:850;line-height:1.8}
        .tech-news-eyebrow,.tech-news-status{position:relative;z-index:1;display:inline-flex;align-items:center;width:max-content;border:1px solid rgba(167,243,240,.22);background:rgba(167,243,240,.10);border-radius:999px;padding:7px 12px;color:var(--sfm-soft-cyan);font-size:12px;font-weight:950;line-height:1.4}
        .tech-news-status{align-self:start;color:#EAF6FF;background:rgba(255,255,255,.10);white-space:nowrap}
        .tech-news-controls{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr) auto;gap:12px;align-items:center;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}
        .tech-news-search{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);border-radius:15px;padding:0 12px;min-height:44px;color:var(--sfm-primary);min-width:0}
        .tech-news-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--sfm-primary-dark);font:900 13px Tajawal,Arial,sans-serif}
        .tech-news-search input::placeholder{color:var(--sfm-muted);opacity:1}
        .tech-news-chip-row{display:flex;gap:8px;overflow-x:auto;max-width:100%;padding-bottom:2px;scrollbar-width:thin;overscroll-behavior-inline:contain}
        .tech-news-chip-row button{flex:0 0 auto;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:999px;min-height:38px;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}
        .tech-news-chip-row button.active,.tech-news-chip-row button:hover,.tech-news-chip-row button:focus-visible{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.14)}
        .tech-news-sort{display:grid;gap:5px;min-width:130px}.tech-news-sort span{color:var(--sfm-muted);font-size:11px;font-weight:950}.tech-news-sort select{height:38px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-primary-dark);font:900 12px Tajawal,Arial,sans-serif;padding:0 10px}
        .tech-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}
        .tech-news-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:18px;display:grid;gap:13px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0;overflow:hidden;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .tech-news-card:hover{transform:translateY(-2px);border-color:rgba(24,212,212,.28);box-shadow:0 18px 46px rgba(3,18,37,.10)}
        .tech-news-card-top,.tech-news-price-row,.tech-news-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
        .tech-news-company{min-width:0;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;overflow-wrap:anywhere}
        .tech-news-ticker{direction:ltr;unicode-bidi:isolate;border-radius:999px;background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.16);color:var(--sfm-primary);padding:5px 9px;font-size:11px;font-weight:950}
        .tech-news-card h2{margin:0;color:var(--sfm-primary-dark);font-size:17px;font-weight:950;line-height:1.42;overflow-wrap:anywhere}
        .tech-news-card p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:820;line-height:1.75;overflow-wrap:anywhere}
        .tech-news-price-row{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:16px;padding:11px 12px}.tech-news-price-row strong{direction:ltr;unicode-bidi:isolate;color:var(--sfm-foreground);font-size:17px;font-weight:950}
        .tech-news-change{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950}.tech-news-change.up{color:#16A34A;background:rgba(34,197,94,.10)}.tech-news-change.down{color:#DC2626;background:rgba(239,68,68,.10)}.tech-news-change.neutral{color:var(--sfm-muted);background:rgba(29,140,255,.08)}
        .tech-news-meta{align-items:flex-start;flex-wrap:wrap;color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.55}
        .tech-news-link{min-height:40px;border-radius:14px;background:var(--sfm-primary-dark);color:var(--sfm-card);display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:12px;font-weight:950;padding:0 13px;transition:background .18s ease,transform .18s ease,box-shadow .18s ease}.tech-news-link:hover,.tech-news-link:focus-visible{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;outline:none;transform:translateY(-1px);box-shadow:0 10px 24px rgba(29,140,255,.18)}
        .tech-news-state{display:grid;place-items:center;gap:10px;text-align:center;padding:54px 20px;color:var(--sfm-muted);background:var(--sfm-card);border:1px dashed rgba(29,140,255,.24);border-radius:22px}.tech-news-state svg{color:var(--sfm-primary)}.tech-news-state strong{display:block;color:var(--sfm-primary-dark);font-size:19px;font-weight:950}.tech-news-state p{margin:0;max-width:620px;color:var(--sfm-muted);font-weight:850;line-height:1.75}.tech-news-state button{border:0;border-radius:14px;background:var(--sfm-primary-dark);color:var(--sfm-card);display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .tech-news-skeleton span,.tech-news-skeleton i,.tech-news-skeleton b,.tech-news-skeleton small{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(29,140,255,.08),rgba(24,212,212,.18),rgba(29,140,255,.08));background-size:220% 100%;animation:techNewsShimmer 1.2s linear infinite}.tech-news-skeleton span{width:42%;height:18px}.tech-news-skeleton i{width:100%;height:15px}.tech-news-skeleton i:nth-child(3){width:76%}.tech-news-skeleton b{width:58%;height:38px;border-radius:14px}.tech-news-skeleton small{width:35%;height:14px}@keyframes techNewsShimmer{to{background-position:-220% 0}}
        @media(max-width:1180px){.tech-news-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tech-news-controls{grid-template-columns:1fr}.tech-news-sort{max-width:220px}}
        @media(max-width:1024px){.tech-news-main{margin-inline-start:0;padding-top:86px}.tech-news-hero{grid-template-columns:1fr}.tech-news-status{white-space:normal}}
        @media(max-width:720px){.tech-news-main{padding-inline:14px}.tech-news-grid{grid-template-columns:1fr}.tech-news-hero{padding:22px;border-radius:22px}.tech-news-hero h1{font-size:30px}.tech-news-controls,.tech-news-card{border-radius:18px}.tech-news-card-top,.tech-news-price-row{align-items:flex-start}.tech-news-price-row{display:grid}.tech-news-link{width:100%}}
      `}</style>
    </div>
  );
}

export default TechNewsPage;
