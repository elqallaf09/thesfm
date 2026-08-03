'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Filter, Newspaper } from 'lucide-react';
import { dedupeNewsItems, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';
import type { GlobalMarketStripConfig } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';
import { t } from '@/lib/translations';

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
type Props = { lang: Lang; dir: 'rtl' | 'ltr'; selectedStrips: GlobalMarketStripConfig[] };
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

export function GlobalMarketsNews({ lang, dir, selectedStrips }: Props) {
  const copy = COPY[lang];
  const [mode, setMode] = useState<Mode>('automatic');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manual, setManual] = useState({ country: '', exchange: '', symbol: '', region: '', language: '', source: '', asset: '', from: '', to: '', sort: 'latest' });
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const selectedKey = selectedStrips.map(strip => strip.id).join(',');

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({ scope: 'general', lang, limit: '24', sort: manual.sort });
    if (mode === 'automatic') params.set('marketIds', selectedKey);
    else {
      if (manual.country) params.set('countries', manual.country);
      if (manual.exchange) params.set('exchangeCodes', manual.exchange);
      if (manual.symbol) params.set('symbols', manual.symbol.toUpperCase());
      if (manual.language) params.set('sourceLanguages', manual.language);
      if (manual.source) params.set('sources', manual.source);
      if (manual.asset) params.set('assetTypes', manual.asset);
      if (manual.from) params.set('from', manual.from);
      if (manual.to) params.set('to', manual.to);
      if (manual.region) params.set('marketCodes', manual.region);
    }
    return `/api/market-news?${params.toString()}`;
  }, [lang, manual, mode, selectedKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setVisibleCount(6);
    fetch(requestUrl, { signal: controller.signal })
      .then(response => response.json() as Promise<NewsResponse>)
      .then(json => {
        if (!json.success) throw new Error(json.code ?? 'unavailable');
        setItems(json.items ?? []);
        setPartial(json.partialFailure === true);
      })
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setItems([]);
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestUrl]);

  const newsItems = dedupeNewsItems(items.map(item => ({ ...item, url: item.url ?? item.originalUrl })));
  const visibleNewsItems = newsItems.slice(0, visibleCount);
  const labels = selectedStrips.map(strip => lang === 'ar' ? strip.labelAr.split(' — ')[0] : lang === 'fr' ? strip.labelFr.split(' — ')[0] : strip.labelEn.split(' — ')[0]);

  return (
    <section className="gm-news" aria-labelledby="gm-news-heading" dir={dir}>
      <div className="gm-news-head">
        <h2 id="gm-news-heading"><Newspaper size={18} aria-hidden="true" />{t('global_markets_news_heading', lang)}</h2>
        <div className="gm-news-modes" role="group" aria-label={copy.customize}>
          <button type="button" className={mode === 'automatic' ? 'is-active' : ''} onClick={() => setMode('automatic')}>{copy.auto}</button>
          <button type="button" className={mode === 'manual' ? 'is-active' : ''} onClick={() => { setMode('manual'); setFiltersOpen(true); }}>{copy.manual}</button>
        </div>
      </div>

      <div className="gm-news-summary"><strong>{copy.according}:</strong> {mode === 'automatic' ? labels.join(' · ') : copy.manual}<button type="button" onClick={() => setFiltersOpen(value => !value)}><Filter size={15} />{copy.customize}</button></div>

      {mode === 'manual' && filtersOpen ? (
        <div className="gm-news-filters">
          <input aria-label={copy.country} placeholder={copy.country} value={manual.country} onChange={event => setManual(value => ({ ...value, country: event.target.value.toUpperCase() }))} />
          <input aria-label={copy.exchange} placeholder={copy.exchange} value={manual.exchange} onChange={event => setManual(value => ({ ...value, exchange: event.target.value.toUpperCase() }))} />
          <input aria-label={copy.company} placeholder={copy.company} value={manual.symbol} onChange={event => setManual(value => ({ ...value, symbol: event.target.value }))} />
          <select aria-label={copy.region} value={manual.region} onChange={event => setManual(value => ({ ...value, region: event.target.value }))}><option value="">{copy.region}: {copy.all}</option><option value="GULF">الخليج / Gulf</option><option value="ARAB">العالم العربي / Arab world</option><option value="MIDDLE_EAST">الشرق الأوسط / Middle East</option><option value="CHINA_HONGKONG">الصين وهونغ كونغ</option><option value="ASIA">Asia</option><option value="NORTH_AMERICA">US & Canada</option><option value="GLOBAL">Global</option></select>
          <select aria-label={copy.language} value={manual.language} onChange={event => setManual(value => ({ ...value, language: event.target.value }))}><option value="">{copy.language}: {copy.all}</option><option value="ar">العربية</option><option value="en">English</option><option value="zh">中文</option><option value="fr">Français</option></select>
          <input aria-label={copy.source} placeholder={copy.source} value={manual.source} onChange={event => setManual(value => ({ ...value, source: event.target.value }))} />
          <select aria-label={copy.asset} value={manual.asset} onChange={event => setManual(value => ({ ...value, asset: event.target.value }))}><option value="">{copy.asset}: {copy.all}</option><option value="stock">Stock</option><option value="forex">Forex</option><option value="commodity">Commodity</option><option value="crypto">Crypto</option><option value="index">Index</option></select>
          <input type="date" aria-label={copy.from} value={manual.from} onChange={event => setManual(value => ({ ...value, from: event.target.value }))} />
          <input type="date" aria-label={copy.to} value={manual.to} onChange={event => setManual(value => ({ ...value, to: event.target.value }))} />
          <select aria-label={copy.sort} value={manual.sort} onChange={event => setManual(value => ({ ...value, sort: event.target.value }))}><option value="latest">{copy.latest}</option><option value="relevance">{copy.relevance}</option></select>
        </div>
      ) : null}

      {partial ? <p className="gm-news-partial" role="status"><AlertTriangle size={15} />{copy.partial}</p> : null}
      {loading ? <div className="gm-news-skeleton" role="status">{Array.from({ length: 6 }).map((_, index) => <div key={index} />)}</div>
        : error ? <div className="gm-news-empty" role="alert"><AlertTriangle size={18} />{t('global_markets_news_error', lang)}</div>
          : newsItems.length === 0 ? <div className="gm-news-empty" role="status"><Newspaper size={18} />{t('global_markets_news_empty', lang)}</div>
            : <><ul className="gm-news-list">{visibleNewsItems.map((item, index) => {
              const href = safeExternalNewsUrl(item.url);
              const title = item.title || item.headline || '';
              const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
              const date = publishedAt && !Number.isNaN(publishedAt.getTime()) ? new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(publishedAt) : '';
              const chips = [...(item.relatedSymbols ?? []), ...(item.exchangeCodes ?? [])].slice(0, 2);
              return <li key={item.id ?? href ?? `${title}-${index}`}><div className="gm-news-row-meta"><span dir="auto">{item.sourceName || item.source || ''}</span><time dir="ltr">{date}</time></div><h3 dir="auto">{title}</h3><div className="gm-news-row-foot">{chips.map(chip => <span key={chip}>{chip}</span>)}{href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={t('global_markets_news_open_article', lang)}><ExternalLink size={15} /></a> : null}</div></li>;
            })}</ul>{visibleCount < newsItems.length ? <button type="button" className="gm-news-load" onClick={() => setVisibleCount(count => Math.min(newsItems.length, count + 6))}>{LOAD_COPY[lang].more}</button> : <p className="gm-news-loaded" role="status">{LOAD_COPY[lang].all}</p>}</>}

      <style jsx>{`
        .gm-news{display:grid;gap:12px;min-width:0}.gm-news-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.gm-news-head h2{display:flex;align-items:center;gap:8px;margin:0;font-size:16px}.gm-news-modes{display:flex;gap:6px;flex-wrap:wrap}.gm-news-modes button,.gm-news-summary button,.gm-news-load{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);padding:0 11px;background:var(--surface);color:var(--foreground);cursor:pointer}.gm-news-modes .is-active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}.gm-news-summary{position:sticky;top:var(--workspace-header-offset,72px);z-index:3;display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:9px 11px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface)}.gm-news-summary button{margin-inline-start:auto;display:inline-flex;align-items:center;gap:5px}.gm-news-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.gm-news-filters input,.gm-news-filters select{width:100%;min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);padding:0 10px;background:var(--surface);color:var(--foreground)}.gm-news-partial,.gm-news-empty{display:flex;align-items:center;gap:7px;margin:0;padding:11px;border:1px dashed var(--border-strong);border-radius:var(--radius-control);color:var(--foreground-muted)}.gm-news-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.gm-news-list li{display:grid;gap:6px;padding:11px 12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);content-visibility:auto}.gm-news-row-meta,.gm-news-row-foot{display:flex;align-items:center;gap:8px;color:var(--foreground-muted);font-size:11px}.gm-news-row-meta time{margin-inline-start:auto}.gm-news-list h3{display:-webkit-box;overflow:hidden;margin:0;font-size:13.5px;line-height:1.4;-webkit-line-clamp:3;-webkit-box-orient:vertical}.gm-news-row-foot span{padding:2px 7px;border-radius:999px;background:var(--surface-muted)}.gm-news-row-foot a{margin-inline-start:auto;color:var(--accent)}.gm-news-skeleton{display:grid;gap:8px}.gm-news-skeleton div{min-height:92px;border-radius:var(--radius-card);background:var(--surface-muted)}.gm-news-load{justify-self:center;padding-inline:22px}.gm-news-loaded{margin:0;text-align:center;color:var(--foreground-muted);font-size:12px}@media(max-width:640px){.gm-news-head{align-items:stretch;flex-direction:column}.gm-news-modes{display:grid;grid-template-columns:1fr}.gm-news-filters{grid-template-columns:1fr}.gm-news-summary{font-size:12px}.gm-news-list li{min-height:88px;max-height:126px}}
      `}</style>
    </section>
  );
}

export default GlobalMarketsNews;
