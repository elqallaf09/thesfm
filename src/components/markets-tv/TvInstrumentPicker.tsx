'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import type { TvLanguage, TvMarket } from '@/lib/markets-tv/types';
import type { TvInstrumentPage } from '@/lib/markets-tv/selections';
import { tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvAssetIcon } from './TvAssetIcon';
export function TvInstrumentPicker({ market, language, selected, change, back }: { market: TvMarket; language: TvLanguage; selected?: string[]; change: (symbols: string[] | undefined) => void; back: () => void }) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const params = new URLSearchParams({ group: market.group, market: market.id, page: String(page), q: query });
  const resource = useTvResource<TvInstrumentPage>(`/api/tv/instruments?${params}`, 300000, '', revision);
  const data = resource.data, all = selected === undefined, chosen = new Set(selected);
  const label = language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn;
  return <div className="tv-instrument-picker">
    <button className="tv-picker-back" onClick={back}>{language === 'ar' ? <ArrowRight/> : <ArrowLeft/>}{t('backMarkets')}</button>
    <h3>{label}</h3>
    <div className="tv-segment" role="group" aria-label={t('displayInstruments')}>
      <button aria-pressed={all} onClick={() => change(undefined)}>{t('allInstruments')}</button>
      <button aria-pressed={!all} onClick={() => { if (all) change([]); }}>{t('specificInstruments')}</button>
    </div>
    <p className="tv-picker-count">{t('selectedInstruments')}: <b dir="ltr">{(all ? data?.directoryTotal ?? market.count : selected.length).toLocaleString('en-US')} / {(data?.directoryTotal ?? market.count).toLocaleString('en-US')}</b></p>
    <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={e => setSearch(e.target.value)} maxLength={120} placeholder={t('searchInstruments')} aria-label={t('searchInstruments')}/></label>
    {!all && <div className="tv-market-presets"><button disabled={!data?.items.length} onClick={() => change([...new Set([...selected, ...data!.items.map(a => a.symbol)])])}>{t('selectPage')}</button><button onClick={() => change([])}>{t('clearSelection')}</button></div>}
    {resource.loading ? <p role="status">{t('loading')}</p> : resource.error ? <p role="status">{t('directoryUnavailable')} <button onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></p> : <>
      <div className="tv-instrument-options">{data?.items.map(a => <button key={a.symbol} role="checkbox" aria-checked={all || chosen.has(a.symbol)} disabled={all} onClick={() => change(chosen.has(a.symbol) ? selected!.filter(s => s !== a.symbol) : [...selected!, a.symbol])}>
        <span className="tv-market-check">{(all || chosen.has(a.symbol)) && <Check aria-hidden="true"/>}</span>
        <TvAssetIcon quote={{ symbol: a.symbol, name: a.name, exchange: a.region || market.id }} group={market.group}/>
        <span className="tv-instrument-identity"><b dir="ltr">{a.displaySymbol || a.symbol}</b><span dir="auto">{language === 'ar' ? a.nameAr || a.name : a.name}</span></span><small dir="ltr">{a.currency}</small>
      </button>)}</div>
      {!data?.items.length && <p>{t('noMatchingInstruments')}</p>}
      <div className="tv-instrument-pagination"><span>{t('matchingInstruments')}: {(data?.total ?? 0).toLocaleString('en-US')}</span><button aria-label={t('previous')} disabled={page === 0} onClick={() => setPage(p => p - 1)}><ArrowLeft/></button><span dir="ltr">{page + 1} / {Math.max(1, Math.ceil((data?.total || 0) / 50))}</span><button aria-label={t('next')} disabled={!data || (page + 1) * 50 >= data.total} onClick={() => setPage(p => p + 1)}><ArrowRight/></button></div>
    </>}
    {!all && !selected.length && <p role="status">{t('noSelectedInstruments')}</p>}
    <p className="tv-muted">{t('instrumentSelectionSaved')}</p>
  </div>;
}
