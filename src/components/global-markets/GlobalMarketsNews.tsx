'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Filter, Newspaper } from 'lucide-react';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import type { GlobalMarketStripConfig } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';
import { GlobalMarketsNewsFilters } from '@/components/global-markets/GlobalMarketsNewsFilters';
import { EMPTY_NEWS_FILTERS, globalMarketNewsRequest } from '@/lib/market/globalMarketNewsRequest';

type NewsItem = {
  id?: string | null;
  title?: string | null;
  headline?: string | null;
  sourceName?: string | null;
  source?: string | null;
  url?: string | null;
  originalUrl?: string | null;
  publishedAt?: string | null;
  relatedSymbols?: string[];
  exchangeCodes?: string[];
  countryCodes?: string[];
  originalLanguage?: string | null;
  verificationStatus?: string | null;
};

type NewsResponse = { success: boolean; items?: NewsItem[]; code?: string | null; partialFailure?: boolean; total?: number };
type Props = { lang: Lang; dir: 'rtl' | 'ltr'; selectedStrips: GlobalMarketStripConfig[]; ready?: boolean };
type Mode = 'automatic' | 'manual';

const COPY = {
  ar: { auto: 'تلقائي — حسب أسواقي المختارة', manual: 'تخصيص يدوي', customize: 'تخصيص الأخبار', country: 'الدولة', exchange: 'البورصة', company: 'الشركة أو الرمز', region: 'منطقة الأخبار', language: 'لغة المصدر', source: 'المصدر', asset: 'نوع الأصل', from: 'من تاريخ', to: 'إلى تاريخ', sort: 'الترتيب', all: 'الكل', latest: 'الأحدث', relevance: 'الأكثر صلة', according: 'الأخبار حسب', partial: 'بعض مزودي الأخبار غير متاحين؛ النتائج جزئية وموضحة حسب البيانات المتاحة.' },
  en: { auto: 'Automatic — based on my markets', manual: 'Manual customization', customize: 'Customize news', country: 'Country', exchange: 'Exchange', company: 'Company or symbol', region: 'News region', language: 'Source language', source: 'Source', asset: 'Asset type', from: 'From', to: 'To', sort: 'Sort', all: 'All', latest: 'Latest', relevance: 'Most relevant', according: 'News based on', partial: 'Some news providers are unavailable; these are truthful partial results.' },
  fr: { auto: 'Automatique — selon mes marchés', manual: 'Personnalisation manuelle', customize: 'Personnaliser les actualités', country: 'Pays', exchange: 'Bourse', company: 'Société ou symbole', region: 'Région', language: 'Langue source', source: 'Source', asset: 'Type d’actif', from: 'Du', to: 'Au', sort: 'Tri', all: 'Tous', latest: 'Plus récentes', relevance: 'Plus pertinentes', according: 'Actualités selon', partial: 'Certains fournisseurs sont indisponibles ; les résultats sont partiels.' },
} as const;

const LOAD_COPY = {
  ar: { more: 'تحميل المزيد', all: 'تم تحميل جميع الأخبار' },
  en: { more: 'Load more', all: 'All news loaded' },
  fr: { more: 'Charger plus', all: 'Toutes les actualités sont chargées' },
} as const;

function localeFor(lang: Lang) {
  return lang === 'ar' ? 'ar-SA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

export function GlobalMarketsNews({ lang, dir, selectedStrips, ready = true }: Props) {
  const copy = COPY[lang];
  const [mode, setMode] = useState<Mode>('automatic');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manual, setManual] = useState({ ...EMPTY_NEWS_FILTERS });
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const selectedKey = selectedStrips.map(strip => strip.id).join(',');

  const requestUrl = useMemo(() => globalMarketNewsRequest(lang, selectedKey, mode === 'manual' ? manual : null), [lang, manual, mode, selectedKey]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(requestUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('news_unavailable');
        return response.json() as Promise<NewsResponse>;
      })
      .then(json => {
        if (controller.signal.aborted) return;
        if (!json.success) throw new Error(json.code ?? 'unavailable');
        setItems(json.items ?? []);
        setPartial(json.partialFailure === true);
        setVisibleCount(6);
      })
      .catch(fetchError => {
        if (controller.signal.aborted || (fetchError instanceof DOMException && fetchError.name === 'AbortError')) return;
        setError(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setSettled(true);
      });
    return () => controller.abort();
  }, [ready, requestUrl]);

  const newsItems = dedupeNewsItems(items.map(item => ({ ...item, url: item.url ?? item.originalUrl })));
  const visibleNewsItems = newsItems.slice(0, visibleCount);
  const stateCopy = {
    ar: { loading: 'جارٍ تحميل الأخبار', refreshing: 'جارٍ تحديث الأخبار؛ المعروض آخر نتائج متاحة.', failed: 'تعذر التحديث؛ المعروض آخر نتائج متاحة.' },
    en: { loading: 'Loading news', refreshing: 'Refreshing news; showing the last available results.', failed: 'Refresh failed; showing the last available results.' },
    fr: { loading: 'Chargement des actualités', refreshing: 'Actualisation ; les derniers résultats restent affichés.', failed: 'Échec de l’actualisation ; les derniers résultats restent affichés.' },
  }[lang];
  const notice = loading ? (newsItems.length ? stateCopy.refreshing : stateCopy.loading)
    : error ? (newsItems.length ? stateCopy.failed : t('global_markets_news_error', lang))
      : partial ? copy.partial : '';
  const filterCount = Object.entries(manual).filter(([key, value]) => key !== 'sort' && value).length;
  const sourceOptions = [...new Set(items.map(item => item.sourceName || item.source || '').filter(Boolean))];
  const labels = selectedStrips.map(strip => lang === 'ar' ? strip.labelAr.split(' — ')[0] : lang === 'fr' ? strip.labelFr.split(' — ')[0] : strip.labelEn.split(' — ')[0]);

  return (
    <section className="gm-news" aria-labelledby="gm-news-heading" dir={dir}>
      <div className="gm-news-head">
        <h2 id="gm-news-heading"><Newspaper size={18} aria-hidden="true" />{t('global_markets_news_heading', lang)}</h2>
        <div className="gm-news-modes" role="group" aria-label={copy.customize}>
          <button type="button" className={mode === 'automatic' ? 'is-active' : ''} aria-pressed={mode === 'automatic'} onClick={() => { setMode('automatic'); setFiltersOpen(false); }}>{copy.auto}</button>
          <button type="button" className={mode === 'manual' ? 'is-active' : ''} aria-pressed={mode === 'manual'} onClick={() => { setMode('manual'); setFiltersOpen(true); }}>{copy.manual}</button>
        </div>
      </div>

      <div className="gm-news-summary"><strong>{copy.according}:</strong> <span>{mode === 'automatic' ? [...new Set(labels)].join(' · ') : `${copy.manual} · ${filterCount}`}</span><button type="button" aria-expanded={filtersOpen} aria-controls="gm-news-filters" onClick={() => { setFiltersOpen(value => !value); }}><Filter size={15} aria-hidden="true" />{copy.customize}</button></div>

      {filtersOpen ? (
        <GlobalMarketsNewsFilters lang={lang} value={manual} sources={sourceOptions}
          onApply={filters => { setManual(filters); setMode('manual'); }} />
      ) : null}

      <p className="gm-news-notice" role="status" title={notice}>{notice}</p>
      <div className="gm-news-results" aria-busy={loading}>
        {loading && !settled ? (
          <ul className="gm-news-list gm-news-skeleton" aria-label={stateCopy.loading}>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} aria-hidden="true">
                <div className="gm-news-row-meta" />
                <div className="gm-news-headline" />
                <div className="gm-news-row-foot" />
              </li>
            ))}
          </ul>
        ) : newsItems.length === 0 ? (
          <div className="gm-news-empty" role={error ? 'alert' : 'status'}>
            {error ? <AlertTriangle size={18} /> : <Newspaper size={18} />}
            {t(error ? 'global_markets_news_error' : 'global_markets_news_empty', lang)}
          </div>
        ) : (
          <ul className="gm-news-list">
            {visibleNewsItems.map((item, index) => {
              const href = safeExternalNewsUrl(item.url);
              const title = item.title || item.headline || '';
              const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
              const date = publishedAt && !Number.isNaN(publishedAt.getTime())
                ? new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(publishedAt) : '';
              const chips = [...(item.relatedSymbols ?? []), ...(item.exchangeCodes ?? [])].slice(0, 2);
              return (
                <li key={item.id ?? href ?? `${title}-${index}`}>
                  <div className="gm-news-row-meta"><span dir="auto">{item.sourceName || item.source || ''}</span><time dir="ltr">{date}</time></div>
                  <h3 className="gm-news-headline" dir="auto" title={title}>{title}</h3>
                  <div className="gm-news-row-foot">
                    {chips.map(chip => <span key={chip}>{chip}</span>)}
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={t('global_markets_news_open_article', lang)}><ExternalLink size={15} /></a> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="gm-news-footer">
        {newsItems.length > 0 && visibleCount < newsItems.length ? (
          <button type="button" className="gm-news-load" disabled={loading}
            onClick={() => setVisibleCount(count => Math.min(newsItems.length, count + 6))}>{LOAD_COPY[lang].more}</button>
        ) : newsItems.length > 0 ? <p className="gm-news-loaded" role="status">{LOAD_COPY[lang].all}</p> : null}
      </div>

      <style jsx>{`
        .gm-news { --gm-news-row-size:108px; display:grid; gap:12px; min-width:0; }
        .gm-news-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .gm-news-head h2 { display:flex; align-items:center; gap:8px; margin:0; font-size:16px; }
        .gm-news-modes { display:flex; gap:6px; flex-wrap:wrap; }
        .gm-news-modes button,.gm-news-summary button,.gm-news-load { min-height:44px; border:1px solid var(--border); border-radius:var(--radius-control); padding:0 11px; background:var(--surface); color:var(--foreground); cursor:pointer; }
        .gm-news :is(button,a):focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
        .gm-news-modes .is-active { border-color:var(--accent); background:var(--accent-soft); color:var(--accent); }
        .gm-news-summary { display:flex; align-items:center; gap:7px; flex-wrap:wrap; padding:9px 11px; border:1px solid var(--border); border-radius:var(--radius-control); background:var(--surface); }
        .gm-news-summary button { margin-inline-start:auto; display:inline-flex; align-items:center; gap:5px; }
        .gm-news-notice { margin:0; block-size:34px; font-size:12px; line-height:17px; color:var(--foreground-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .gm-news-results { min-block-size:calc(6 * var(--gm-news-row-size) + 40px); min-inline-size:0; }
        .gm-news-empty { display:flex; align-items:center; gap:7px; margin:0; padding:11px; border:1px dashed var(--border-strong); border-radius:var(--radius-control); color:var(--foreground-muted); }
        .gm-news-list { display:grid; gap:8px; margin:0; padding:0; list-style:none; }
        .gm-news-list li { display:grid; grid-template-rows:16px 38px 18px; gap:6px; min-inline-size:0; min-block-size:var(--gm-news-row-size); padding:11px 12px; border:1px solid var(--border); border-radius:var(--radius-card); background:var(--surface); }
        .gm-news-row-meta,.gm-news-row-foot { display:flex; align-items:center; gap:8px; min-inline-size:0; color:var(--foreground-muted); font-size:11px; line-height:16px; }
        .gm-news-row-meta span { min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .gm-news-row-meta time { margin-inline-start:auto; flex:none; white-space:nowrap; }
        .gm-news-headline { display:-webkit-box; overflow:hidden; margin:0; font-size:13.5px; line-height:19px; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
        .gm-news-row-foot span { padding:0 7px; border-radius:var(--radius-pill); background:var(--surface-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .gm-news-row-foot a { margin-inline-start:auto; color:var(--accent); }
        .gm-news-skeleton .gm-news-row-meta,.gm-news-skeleton .gm-news-headline,.gm-news-skeleton .gm-news-row-foot { background:var(--surface-muted); border-radius:var(--radius-control); }
        .gm-news-footer { min-block-size:44px; display:grid; place-items:center; }
        .gm-news-load { padding-inline:22px; }
        .gm-news-loaded { margin:0; text-align:center; color:var(--foreground-muted); font-size:12px; }
        @media(max-width:640px) {
          .gm-news-head { align-items:stretch; flex-direction:column; }
          .gm-news-modes { display:grid; grid-template-columns:1fr; }
          .gm-news-summary { font-size:12px; }
        }
      `}</style>
    </section>
  );
}

export default GlobalMarketsNews;
