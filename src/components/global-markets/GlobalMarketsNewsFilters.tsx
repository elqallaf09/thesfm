'use client';

import { useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';

export const EMPTY_NEWS_FILTERS = { country: '', exchange: '', symbol: '', region: '', language: '', source: '', asset: '', from: '', to: '', sort: 'latest' };
export type MarketNewsFilters = typeof EMPTY_NEWS_FILTERS;

const COPY = {
  ar: { country: 'الدولة', exchange: 'البورصة', company: 'الشركة أو الرمز', region: 'منطقة الأخبار', language: 'لغة المصدر', source: 'المصدر', asset: 'نوع الأصل', from: 'من تاريخ', to: 'إلى تاريخ', sort: 'الترتيب', all: 'الكل', latest: 'الأحدث', relevance: 'الأكثر صلة', apply: 'تطبيق الفلاتر', reset: 'مسح الفلاتر', hint: 'اختر من القوائم ثم اضغط تطبيق الفلاتر. المصادر من الأخبار المتاحة.', invalid: 'اختر فترة صحيحة لا تتجاوز 90 يوماً.', stock: 'الأسهم', forex: 'الفوركس', commodity: 'السلع والمعادن', crypto: 'العملات الرقمية', index: 'المؤشرات', GULF: 'الخليج', ARAB: 'العالم العربي', MIDDLE_EAST: 'الشرق الأوسط', CHINA_HONGKONG: 'الصين وهونغ كونغ', ASIA: 'آسيا', NORTH_AMERICA: 'أمريكا الشمالية', GLOBAL: 'العالم' },
  en: { country: 'Country', exchange: 'Exchange', company: 'Company or symbol', region: 'News region', language: 'Source language', source: 'Source', asset: 'Asset type', from: 'From', to: 'To', sort: 'Sort', all: 'All', latest: 'Latest', relevance: 'Most relevant', apply: 'Apply filters', reset: 'Clear filters', hint: 'Choose from the lists, then apply your filters. Sources come from available news.', invalid: 'Choose a valid date range of up to 90 days.', stock: 'Stocks', forex: 'Forex', commodity: 'Commodities', crypto: 'Crypto', index: 'Indices', GULF: 'Gulf', ARAB: 'Arab world', MIDDLE_EAST: 'Middle East', CHINA_HONGKONG: 'China & Hong Kong', ASIA: 'Asia', NORTH_AMERICA: 'North America', GLOBAL: 'Global' },
  fr: { country: 'Pays', exchange: 'Bourse', company: 'Société ou symbole', region: 'Région', language: 'Langue source', source: 'Source', asset: 'Type d’actif', from: 'Du', to: 'Au', sort: 'Tri', all: 'Tous', latest: 'Plus récentes', relevance: 'Plus pertinentes', apply: 'Appliquer les filtres', reset: 'Effacer les filtres', hint: 'Choisissez dans les listes, puis appliquez les filtres. Les sources proviennent des actualités disponibles.', invalid: 'Choisissez une période valide de 90 jours maximum.', stock: 'Actions', forex: 'Forex', commodity: 'Matières premières', crypto: 'Crypto', index: 'Indices', GULF: 'Golfe', ARAB: 'Monde arabe', MIDDLE_EAST: 'Moyen-Orient', CHINA_HONGKONG: 'Chine et Hong Kong', ASIA: 'Asie', NORTH_AMERICA: 'Amérique du Nord', GLOBAL: 'Monde' },
} as const;

export function GlobalMarketsNewsFilters({ lang, value, sources, onApply }: {
  lang: Lang;
  value: MarketNewsFilters;
  sources: string[];
  onApply: (value: MarketNewsFilters) => void;
}) {
  const copy = COPY[lang];
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const labels = (strip: typeof GLOBAL_MARKET_STRIPS[number]) => lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
  const countries = [...new Map(GLOBAL_MARKET_STRIPS.filter(strip => strip.countryCode).map(strip => [strip.countryCode!, labels(strip).split(' — ')[0]])).entries()];
  const exchanges = GLOBAL_MARKET_STRIPS.filter(strip => strip.exchangeCode && (!draft.country || strip.countryCode === draft.country));
  const symbols = useMemo(() => [...new Map(GLOBAL_MARKET_STRIPS.filter(strip => (!draft.country || strip.countryCode === draft.country) && (!draft.exchange || strip.exchangeCode === draft.exchange)).flatMap(strip => strip.items).map(item => [item.symbol, item])).values()], [draft.country, draft.exchange]);
  function update(key: keyof MarketNewsFilters, next: string) {
    setDraft(current => ({ ...current, [key]: next, ...(key === 'country' ? { exchange: '', symbol: '', region: '' } : key === 'exchange' ? { symbol: '' } : key === 'region' ? { country: '', exchange: '', symbol: '' } : {}) }));
    setInvalid(false);
  }
  return (
    <form className="gm-news-filter-panel" id="gm-news-filters" onSubmit={event => {
      event.preventDefault();
      const today = new Date().toISOString().slice(0, 10);
      const start = Date.parse(draft.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
      const end = Date.parse(draft.to || today);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 90 * 86400000) { setInvalid(true); return; }
      setInvalid(false);
      onApply({ ...draft });
    }}>
      <p>{copy.hint}</p>
      <div className="gm-news-filters">
        <label>{copy.country}<select value={draft.country} onChange={event => update('country', event.target.value)}><option value="">{copy.all}</option>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <label>{copy.exchange}<select value={draft.exchange} onChange={event => update('exchange', event.target.value)}><option value="">{copy.all}</option>{exchanges.map(strip => <option key={strip.id} value={strip.exchangeCode}>{labels(strip)}</option>)}</select></label>
        <label>{copy.company}<select value={draft.symbol} onChange={event => update('symbol', event.target.value)}><option value="">{copy.all}</option>{symbols.map(item => <option key={item.symbol} value={item.symbol}>{lang === 'ar' ? item.nameAr : item.name} · {item.symbol}</option>)}</select></label>
        <label>{copy.region}<select value={draft.region} onChange={event => update('region', event.target.value)}><option value="">{copy.all}</option>{(['GULF', 'ARAB', 'MIDDLE_EAST', 'CHINA_HONGKONG', 'ASIA', 'NORTH_AMERICA', 'GLOBAL'] as const).map(region => <option key={region} value={region}>{copy[region]}</option>)}</select></label>
        <label>{copy.language}<select value={draft.language} onChange={event => update('language', event.target.value)}><option value="">{copy.all}</option><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option><option value="zh">中文</option></select></label>
        <label>{copy.source}<select value={draft.source} onChange={event => update('source', event.target.value)}><option value="">{copy.all}</option>{[...new Set([...sources, draft.source].filter(Boolean))].map(source => <option key={source} value={source}>{source}</option>)}</select></label>
        <label>{copy.asset}<select value={draft.asset} onChange={event => update('asset', event.target.value)}><option value="">{copy.all}</option>{(['stock', 'forex', 'commodity', 'crypto', 'index'] as const).map(asset => <option key={asset} value={asset}>{copy[asset]}</option>)}</select></label>
        <label>{copy.from}<input type="date" value={draft.from} max={draft.to || undefined} onChange={event => update('from', event.target.value)} /></label>
        <label>{copy.to}<input type="date" value={draft.to} min={draft.from || undefined} onChange={event => update('to', event.target.value)} /></label>
        <label>{copy.sort}<select value={draft.sort} onChange={event => update('sort', event.target.value)}><option value="latest">{copy.latest}</option><option value="relevance">{copy.relevance}</option></select></label>
      </div>
      {invalid ? <p className="gm-news-filter-error" role="alert">{copy.invalid}</p> : null}
      <div className="gm-news-filter-actions">
        <button type="button" onClick={() => { setDraft({ ...EMPTY_NEWS_FILTERS }); setInvalid(false); }}><RotateCcw size={16} aria-hidden="true" />{copy.reset}</button>
        <button type="submit" className="gm-news-filter-apply"><Check size={17} aria-hidden="true" />{copy.apply}</button>
      </div>
      <style jsx>{`
        .gm-news-filter-panel { display:grid; gap:14px; padding:16px; border:1px solid var(--border); border-radius:var(--radius-card); background:var(--surface); }
        .gm-news-filter-panel p { margin:0; font-size:12px; line-height:1.6; color:var(--foreground-secondary); }
        .gm-news-filters { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
        .gm-news-filters label { display:grid; gap:6px; min-width:0; color:var(--foreground-secondary); font-size:12px; font-weight:600; }
        .gm-news-filters input,.gm-news-filters select { width:100%; min-width:0; min-height:46px; border:1px solid var(--border-strong); border-radius:var(--radius-control); padding:8px 10px; background:var(--surface-muted); color:var(--foreground); font:inherit; font-size:13px; }
        .gm-news-filter-actions { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
        .gm-news-filter-actions button { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:44px; padding:0 15px; border:1px solid var(--border); border-radius:var(--radius-control); color:var(--foreground); background:var(--surface-muted); font-weight:650; cursor:pointer; }
        .gm-news-filter-actions .gm-news-filter-apply { background:var(--accent); color:var(--accent-foreground); border-color:var(--accent); }
        .gm-news-filter-panel .gm-news-filter-error { color:var(--danger); }
        .gm-news-filter-panel :is(input,select,button):focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
        @media(max-width:900px) { .gm-news-filters { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:640px) { .gm-news-filters input,.gm-news-filters select { font-size:16px; } }
        @media(max-width:480px) { .gm-news-filters { grid-template-columns:1fr; } .gm-news-filter-actions button { flex:1; } }
      `}</style>
    </form>
  );
}
