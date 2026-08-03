'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Filter, MapPin, Newspaper } from 'lucide-react';
import { GlobalMarketsNewsFilters } from '@/components/global-markets/GlobalMarketsNewsFilters';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import {
  EMPTY_GLOBAL_NEWS_FILTERS,
  activeFilterCount,
  appendNewsFilters,
  localizedStripLabel,
  type GlobalNewsFilters,
  type SelectOption,
} from '@/lib/market/globalMarketNewsFilters';
import type { GlobalMarketStripConfig, GlobalMarketStripId } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

type NewsItem = {
  id?: string | null; title?: string | null; headline?: string | null; sourceName?: string | null; source?: string | null;
  url?: string | null; originalUrl?: string | null; publishedAt?: string | null; relatedSymbols?: string[]; exchangeCodes?: string[];
  countryCodes?: string[]; countries?: string[]; marketIds?: GlobalMarketStripId[]; sourceRegion?: string | null; originalLanguage?: string | null;
  verificationStatus?: string | null;
};

type NewsResponse = { success: boolean; items?: NewsItem[]; code?: string | null; partialFailure?: boolean; total?: number };
type Props = { lang: Lang; dir: 'rtl' | 'ltr'; selectedStrips: GlobalMarketStripConfig[] };
type Mode = 'automatic' | 'manual';

const COPY = {
  ar: { auto: 'تلقائي — حسب أسواقي المختارة', manual: 'تخصيص يدوي', customize: 'تخصيص الأخبار', according: 'الأخبار حسب', partial: 'بعض مزودي الأخبار غير متاحين؛ النتائج جزئية حسب البيانات الموثقة.', updating: 'تحديث النتائج…', relevance: 'مرتبط بـ', filters: 'مرشحات نشطة' },
  en: { auto: 'Automatic — based on my markets', manual: 'Manual customization', customize: 'Customize news', according: 'News based on', partial: 'Some providers are unavailable; results are partial and based on verified metadata.', updating: 'Updating results…', relevance: 'Relevant to', filters: 'active filters' },
  fr: { auto: 'Automatique — selon mes marchés', manual: 'Personnalisation manuelle', customize: 'Personnaliser les actualités', according: 'Actualités selon', partial: 'Certains fournisseurs sont indisponibles ; résultats partiels selon les métadonnées vérifiées.', updating: 'Mise à jour…', relevance: 'Pertinent pour', filters: 'filtres actifs' },
} as const;

const LOAD_COPY = {
  ar: { more: 'تحميل المزيد', all: 'تم تحميل جميع الأخبار' }, en: { more: 'Load more', all: 'All news loaded' }, fr: { more: 'Charger plus', all: 'Toutes les actualités sont chargées' },
} as const;

const NEWS_CACHE_TTL = 5 * 60_000;
const NEWS_SESSION_KEY = 'sfm.globalMarkets.newsCache.v1';
const newsCache = new Map<string, { at: number; data: NewsResponse }>();
const newsInflight = new Map<string, Promise<NewsResponse>>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function readNewsCache(url: string) {
  const memory = newsCache.get(url);
  if (memory && Date.now() - memory.at < NEWS_CACHE_TTL) return memory.data;
  try {
    const stored = JSON.parse(sessionStorage.getItem(NEWS_SESSION_KEY) ?? 'null') as { url: string; at: number; data: NewsResponse } | null;
    if (stored?.url === url && Date.now() - stored.at < NEWS_CACHE_TTL && stored.data.success) {
      newsCache.set(url, { at: stored.at, data: stored.data });
      return stored.data;
    }
  } catch { /* Ignore unavailable or corrupt session cache. */ }
  return null;
}

function writeNewsCache(url: string, data: NewsResponse) {
  const entry = { at: Date.now(), data };
  newsCache.set(url, entry);
  try { sessionStorage.setItem(NEWS_SESSION_KEY, JSON.stringify({ url, ...entry })); } catch { /* Storage may be unavailable. */ }
}

function localeFor(lang: Lang) { return lang === 'ar' ? 'ar-SA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US'; }
function dateFormatter(lang: Lang) {
  const locale = localeFor(lang);
  const cached = dateFormatters.get(locale);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  dateFormatters.set(locale, formatter);
  return formatter;
}

function fetchNews(url: string, signal: AbortSignal) {
  const existing = newsInflight.get(url);
  if (existing) return existing;
  const request = fetch(url, { signal }).then(async response => {
    const json = await response.json() as NewsResponse;
    if (!json.success) throw new Error(json.code ?? 'unavailable');
    writeNewsCache(url, json);
    return json;
  }).finally(() => newsInflight.delete(url));
  newsInflight.set(url, request);
  return request;
}

const NewsRow = memo(function NewsRow({ item, lang, relevance }: { item: NewsItem; lang: Lang; relevance: string }) {
  const href = safeExternalNewsUrl(item.url ?? item.originalUrl);
  const title = item.title || item.headline || '';
  const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
  const date = publishedAt && !Number.isNaN(publishedAt.getTime()) ? dateFormatter(lang).format(publishedAt) : '';
  const entity = (item.relatedSymbols ?? [])[0] ?? (item.exchangeCodes ?? [])[0] ?? '';
  return (
    <li>
      <div className="gm-news-row-meta"><strong dir="auto">{item.sourceName || item.source || ''}</strong><time dir="ltr">{date}</time></div>
      <h3 dir="auto">{title}</h3>
      <div className="gm-news-row-context">
        {relevance ? <span className="gm-news-relevance"><MapPin size={12} aria-hidden="true" />{relevance}</span> : null}
        {entity ? <span className="gm-news-entity" dir="ltr">· {entity}</span> : null}
        {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={t('global_markets_news_open_article', lang)}><ExternalLink size={15} /></a> : null}
      </div>
    </li>
  );
});

export function GlobalMarketsNews({ lang, dir, selectedStrips }: Props) {
  const copy = COPY[lang];
  const [mode, setMode] = useState<Mode>('automatic');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<GlobalNewsFilters>(EMPTY_GLOBAL_NEWS_FILTERS);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const hasItemsRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const selectedKey = selectedStrips.map(strip => strip.id).join(',');
  const stripsById = useMemo(() => new Map(selectedStrips.map(strip => [strip.id, strip])), [selectedStrips]);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({ scope: 'general', lang, limit: '24' });
    if (mode === 'automatic') params.set('marketIds', selectedKey);
    else appendNewsFilters(params, filters);
    return `/api/market-news?${params.toString()}`;
  }, [filters, lang, mode, selectedKey]);

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    const controller = new AbortController();
    const cached = readNewsCache(requestUrl);
    if (cached) {
      const cachedItems = cached.items ?? [];
      hasItemsRef.current = cachedItems.length > 0;
      setItems(cachedItems); setPartial(cached.partialFailure === true); setLoading(false); setError(false);
      return () => controller.abort();
    }
    if (hasItemsRef.current) setRefreshing(true); else setLoading(true);
    setError(false); setVisibleCount(6);
    void fetchNews(requestUrl, controller.signal).then(json => {
      if (requestSequence !== requestSequenceRef.current) return;
      const nextItems = json.items ?? [];
      hasItemsRef.current = nextItems.length > 0;
      setItems(nextItems); setPartial(json.partialFailure === true);
    }).catch(fetchError => {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
      if (requestSequence !== requestSequenceRef.current) return;
      if (!hasItemsRef.current) setItems([]);
      setError(true);
    }).finally(() => {
      if (requestSequence !== requestSequenceRef.current) return;
      setLoading(false); setRefreshing(false);
    });
    return () => controller.abort();
  }, [requestUrl]); // Keep the last visible result set while a replacement request is in flight.

  const newsItems = useMemo(() => dedupeNewsItems(items.map(item => ({ ...item, url: item.url ?? item.originalUrl }))), [items]);
  const visibleNewsItems = useMemo(() => newsItems.slice(0, visibleCount), [newsItems, visibleCount]);
  const selectedLabels = useMemo(() => selectedStrips.map(strip => localizedStripLabel(strip, lang).split(' — ')[0]), [lang, selectedStrips]);
  const sourceOptions = useMemo<SelectOption[]>(() => [...new Set(items.map(item => item.sourceName || item.source || '').filter(Boolean))].sort().map(value => ({ value, label: value })), [items]);
  const filterCount = activeFilterCount(filters);

  function relevanceFor(item: NewsItem) {
    const market = (item.marketIds ?? []).map(id => stripsById.get(id)).find(Boolean);
    if (market) return localizedStripLabel(market, lang).split(' — ')[0];
    return item.sourceRegion || (item.countryCodes ?? item.countries ?? [])[0] || (item.exchangeCodes ?? [])[0] || '';
  }

  return (
    <section className="gm-news" aria-labelledby="gm-news-heading" dir={dir} aria-busy={loading || refreshing}>
      <div className="gm-news-head">
        <h2 id="gm-news-heading"><Newspaper size={18} aria-hidden="true" />{t('global_markets_news_heading', lang)}</h2>
        <div className="gm-news-modes" role="group" aria-label={copy.customize}>
          <button type="button" className={mode === 'automatic' ? 'is-active' : ''} onClick={() => setMode('automatic')}>{copy.auto}</button>
          <button type="button" className={mode === 'manual' ? 'is-active' : ''} onClick={() => { setMode('manual'); setFiltersOpen(true); }}>{copy.manual}</button>
        </div>
      </div>

      <div className="gm-news-summary"><span><strong>{copy.according}:</strong> {mode === 'automatic' ? selectedLabels.join(' · ') : `${filterCount} ${copy.filters}`}</span><button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><Filter size={15} />{copy.customize}</button></div>

      {mode === 'manual' && filtersOpen ? <GlobalMarketsNewsFilters key={lang} lang={lang} filters={filters} sourceOptions={sourceOptions} onApply={next => { setFilters(next); setVisibleCount(6); }} /> : null}
      {refreshing ? <p className="gm-news-updating" role="status">{copy.updating}</p> : null}
      {partial ? <p className="gm-news-partial" role="status"><AlertTriangle size={15} />{copy.partial}</p> : null}
      {loading ? <div className="gm-news-skeleton" role="status" aria-label={copy.updating}>{Array.from({ length: 6 }).map((_, index) => <div key={index}><i /><span /></div>)}</div>
        : error && newsItems.length === 0 ? <div className="gm-news-empty" role="alert"><AlertTriangle size={18} />{t('global_markets_news_error', lang)}</div>
          : newsItems.length === 0 ? <div className="gm-news-empty" role="status"><Newspaper size={18} />{t('global_markets_news_empty', lang)}</div>
            : <><ul className="gm-news-list">{visibleNewsItems.map((item, index) => <NewsRow key={item.id ?? item.url ?? `${item.title}-${index}`} item={item} lang={lang} relevance={relevanceFor(item)} />)}</ul>{visibleCount < newsItems.length ? <button type="button" className="gm-news-load" onClick={() => setVisibleCount(count => Math.min(newsItems.length, count + 6))}>{LOAD_COPY[lang].more}</button> : <p className="gm-news-loaded" role="status">{LOAD_COPY[lang].all}</p>}</>}

      <style jsx>{`
        .gm-news{display:grid;gap:12px;min-width:0}.gm-news-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.gm-news-head h2{display:flex;align-items:center;gap:8px;margin:0;font-size:16px}.gm-news-modes{display:flex;gap:6px;flex-wrap:wrap}.gm-news-modes button,.gm-news-summary button,.gm-news-load{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);padding:0 11px;background:var(--surface);color:var(--foreground);cursor:pointer}.gm-news-modes .is-active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}.gm-news-summary{position:sticky;top:var(--workspace-header-offset,72px);z-index:3;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-control);background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(10px);font-size:12px}.gm-news-summary button{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto}.gm-news-updating{margin:0;color:var(--accent);font-size:11px}.gm-news-partial,.gm-news-empty{display:flex;align-items:center;gap:7px;margin:0;padding:11px;border:1px dashed var(--border-strong);border-radius:var(--radius-control);color:var(--foreground-muted)}.gm-news-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}.gm-news-list :global(li){display:grid;gap:7px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);content-visibility:auto;contain-intrinsic-size:96px;transition:border-color .16s ease,transform .16s ease}.gm-news-list :global(li:hover){border-color:var(--border-strong);transform:translateY(-1px)}.gm-news-list :global(h3){display:-webkit-box;overflow:hidden;margin:0;font-size:14px;line-height:1.45;-webkit-line-clamp:3;-webkit-box-orient:vertical}.gm-news-list :global(.gm-news-row-meta),.gm-news-list :global(.gm-news-row-context){display:flex;align-items:center;gap:7px;color:var(--foreground-muted);font-size:11px;min-width:0}.gm-news-list :global(.gm-news-row-meta strong){color:var(--foreground-secondary);font-weight:650}.gm-news-list :global(.gm-news-row-meta time){margin-inline-start:auto}.gm-news-list :global(.gm-news-relevance){display:inline-flex;align-items:center;gap:4px;color:var(--accent);font-weight:600}.gm-news-list :global(.gm-news-entity){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gm-news-list :global(.gm-news-row-context a){margin-inline-start:auto;color:var(--accent);display:grid;place-items:center;inline-size:32px;block-size:32px}.gm-news-skeleton{display:grid;gap:7px}.gm-news-skeleton>div{min-height:96px;display:grid;align-content:center;gap:12px;padding:14px;border-radius:var(--radius-card);background:var(--surface)}.gm-news-skeleton i,.gm-news-skeleton span{display:block;border-radius:var(--radius-pill);background:var(--surface-muted);animation:gm-pulse 1.4s ease-in-out infinite}.gm-news-skeleton i{width:28%;height:10px}.gm-news-skeleton span{width:82%;height:18px}.gm-news-load{justify-self:center;padding-inline:22px}.gm-news-loaded{margin:0;text-align:center;color:var(--foreground-muted);font-size:12px}
        :global(.gm-news-filter-panel){display:grid;gap:12px;padding:13px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}:global(.gm-news-filter-grid){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}:global(.gm-news-select){position:relative;min-width:0}:global(.gm-news-select summary){min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 11px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface);cursor:pointer;font-size:12px;list-style:none}:global(.gm-news-select summary::-webkit-details-marker){display:none}:global(.gm-news-select summary b),:global(.gm-news-apply b){display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:var(--radius-pill);background:var(--accent);color:var(--accent-contrast);font-size:10px}:global(.gm-news-select-panel){position:absolute;z-index:8;inset-inline:0;top:calc(100% + 5px);max-height:270px;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:6px;padding:8px;border:1px solid var(--border-strong);border-radius:var(--radius-card);background:var(--surface-elevated,var(--surface));box-shadow:var(--shadow-overlay)}:global(.gm-news-option-search){min-height:38px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-control)}:global(.gm-news-option-search input){min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--foreground)}:global(.gm-news-options){min-height:0;display:grid;gap:3px;overflow:auto;overscroll-behavior:contain}:global(.gm-news-options label){min-height:40px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;padding:4px 7px;border-radius:var(--radius-control);font-size:12px;cursor:pointer}:global(.gm-news-options label:hover),:global(.gm-news-options label.is-selected){background:var(--accent-soft)}:global(.gm-news-options input){inline-size:18px;block-size:18px}:global(.gm-news-date-sort){display:flex;align-items:end;gap:8px;flex-wrap:wrap;color:var(--foreground-muted);font-size:11px}:global(.gm-news-date-sort label){display:grid;gap:3px}:global(.gm-news-date-sort input),:global(.gm-news-date-sort select),:global(.gm-news-date-sort select),:global(.gm-news-date-sort>select){min-height:40px;border:1px solid var(--border);border-radius:var(--radius-control);padding:0 8px;background:var(--surface);color:var(--foreground)}:global(.gm-news-date-sort .gm-news-latest){display:flex;align-items:center;gap:6px;min-height:40px;padding:0 9px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface)}:global(.gm-news-filter-tokens){display:flex;flex-wrap:wrap;gap:5px}:global(.gm-news-filter-tokens button){min-height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 8px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--border));border-radius:var(--radius-pill);background:transparent;color:var(--foreground-secondary);font-size:10.5px}:global(.gm-news-filter-actions){display:flex;justify-content:flex-end;gap:8px}:global(.gm-news-filter-actions button){min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;border:1px solid var(--border);border-radius:var(--radius-control);font-weight:650}:global(.gm-news-reset){background:transparent;color:var(--foreground-secondary)}:global(.gm-news-apply){background:var(--accent);color:var(--accent-contrast)}
        @media(max-width:760px){.gm-news-head{align-items:stretch;flex-direction:column}.gm-news-modes{display:grid;grid-template-columns:1fr 1fr}.gm-news-summary{top:var(--workspace-header-offset,64px)}:global(.gm-news-filter-grid){grid-template-columns:1fr 1fr}:global(.gm-news-select-panel){position:fixed;inset-inline:12px;top:auto;bottom:12px;max-height:54dvh}.gm-news-list :global(li){padding:10px 11px}.gm-news-list :global(h3){font-size:13.5px;-webkit-line-clamp:2}}
        @media(max-width:480px){:global(.gm-news-filter-grid){grid-template-columns:1fr}.gm-news-modes{grid-template-columns:1fr}.gm-news-summary{align-items:flex-start}.gm-news-summary>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}:global(.gm-news-date-sort){display:grid;grid-template-columns:1fr 1fr}:global(.gm-news-date-sort>span){grid-column:1/-1}:global(.gm-news-date-sort label),:global(.gm-news-date-sort input),:global(.gm-news-date-sort select){width:100%}:global(.gm-news-filter-actions){display:grid;grid-template-columns:1fr 1fr}}
      `}</style>
    </section>
  );
}

export default GlobalMarketsNews;
