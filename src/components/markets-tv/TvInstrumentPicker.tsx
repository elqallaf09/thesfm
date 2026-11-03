'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search, ListFilter, Plus } from 'lucide-react';
import type { TvLanguage, TvMarket } from '@/lib/markets-tv/types';
import type { TvInstrument, TvInstrumentPage } from '@/lib/markets-tv/selections';
import { tvText } from '@/lib/markets-tv/i18n';
import { selectedTvInstruments } from '@/lib/markets-tv/picker';
import { useTvResource } from './useTvResource';
import { TvAssetIcon } from './TvAssetIcon';

export function TvInstrumentPicker({ market, language, selected, change, back, done }: {
  market: TvMarket; language: TvLanguage; selected?: string[]; change: (symbols: string[] | undefined) => void; back: () => void; done: () => void;
}) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [selectedOnly, setSelectedOnly] = useState(false), [selectedPage, setSelectedPage] = useState(0);
  const [known, setKnown] = useState<Record<string, TvInstrument>>({});
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const params = new URLSearchParams({ group: market.group, market: market.id, page: String(page), q: query });
  const resource = useTvResource<TvInstrumentPage>(`/api/tv/instruments?${params}`, 300000, '', revision);
  const data = resource.data, all = selected === undefined, chosen = new Set(selected);
  useEffect(() => {
    if (data?.items.length) setKnown(current => Object.fromEntries([...Object.entries(current), ...data.items.map(item => [item.symbol, item])]));
  }, [data]);
  const label = language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn;
  const showSelected = selectedOnly && !all;
  const savedRows = showSelected ? selectedTvInstruments(selected, known, search) : [];
  const pageSize = showSelected ? 50 : data?.pageSize || 50;
  const total = showSelected ? savedRows.length : data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = showSelected ? Math.min(selectedPage, pages - 1) : page;
  const rows = showSelected ? savedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : data?.items || [];
  const pendingSearch = search.trim() !== query;
  const busy = !showSelected && (resource.loading || pendingSearch);
  const failed = !showSelected && Boolean(resource.error);
  const changePage = (value: number) => { if (showSelected) setSelectedPage(value); else setPage(value); };
  return <div className="tv-picker tv-instrument-picker">
    <div className="tv-picker-scroll">
      <button className="tv-picker-back" onClick={back}>{language === 'ar' ? <ArrowRight/> : <ArrowLeft/>}{t('backMarkets')}</button>
      <div className="tv-picker-intro"><div><h3>{label}</h3><p>{t('instrumentPickerHelp')}</p></div><span className="tv-picker-count"><b dir="ltr">{(all ? data?.directoryTotal ?? market.count : selected.length).toLocaleString('en-US')} / {(data?.directoryTotal ?? market.count).toLocaleString('en-US')}</b>{t('selectedInstruments')}</span></div>
      <div className="tv-instrument-modes" role="group" aria-label={t('displayInstruments')}>
        <button aria-label={t('allInstruments')} aria-pressed={all} onClick={() => { change(undefined); setSelectedOnly(false); }}><Check/><span>{t('allInstruments')}<small>{t('allInstrumentsHelp')}</small></span></button>
        <button aria-label={t('specificInstruments')} aria-pressed={!all} onClick={() => { if (all) change([]); }}><ListFilter/><span>{t('specificInstruments')}<small>{t('specificInstrumentsHelp')}</small></span></button>
      </div>
      <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={event => { setSearch(event.target.value); setSelectedPage(0); }} maxLength={120} placeholder={t('searchInstruments')} aria-label={t('searchInstruments')}/></label>
      <div className="tv-picker-toolbar"><div className="tv-segment" role="group" aria-label={t('instrumentList')}><button aria-pressed={!showSelected} onClick={() => setSelectedOnly(false)}>{t('browseInstruments')}</button><button disabled={all} aria-pressed={showSelected} onClick={() => { setSelectedOnly(true); setSelectedPage(0); }}>{t('myInstruments')} · {selected?.length ?? 0}</button></div>
        {!all && !showSelected && <button disabled={busy || failed || !rows.length} onClick={() => change([...new Set([...selected, ...rows.map(item => item.symbol)])])}>{t('selectPage')}</button>}
      </div>
      {all && <p className="tv-picker-help">{t('chooseFirstInstrument')}</p>}
      {busy ? <p className="tv-picker-empty" role="status">{t('loading')}</p> : failed ? <div className="tv-picker-empty" role="status"><p>{t('directoryUnavailable')}</p><button onClick={() => setRevision(value => value + 1)}>{t('retry')}</button></div> : <>
        <div className="tv-instrument-options">{rows.map(item => <button key={item.symbol} role={all ? undefined : 'checkbox'} aria-checked={all ? undefined : chosen.has(item.symbol)} data-tv-focus-key={`instrument-${item.symbol}`} onClick={() => change(all ? [item.symbol] : chosen.has(item.symbol) ? selected.filter(symbol => symbol !== item.symbol) : [...selected, item.symbol])}>
          <span className="tv-market-check" aria-hidden="true">{all ? <Plus/> : chosen.has(item.symbol) ? <Check/> : null}</span>
          <TvAssetIcon quote={{ symbol: item.symbol, name: item.name, exchange: item.region || market.id }} group={market.group}/>
          <span className="tv-instrument-identity"><b dir="ltr">{item.displaySymbol || item.symbol}</b><span dir="auto">{language === 'ar' ? item.nameAr || item.name : item.name}</span></span><small dir="ltr">{item.currency}</small>
        </button>)}</div>
        {!rows.length && <p className="tv-picker-empty" role="status">{t(showSelected && !selected.length ? 'noSelectedInstruments' : 'noMatchingInstruments')}</p>}
      </>}
    </div>
    <footer className="tv-picker-footer tv-instrument-footer">
      <div className="tv-instrument-pagination"><span>{t('matchingInstruments')}: {total.toLocaleString('en-US')}</span><button aria-label={t('previous')} disabled={busy || failed || currentPage === 0} onClick={() => changePage(currentPage - 1)}>{language === 'ar' ? <ArrowRight/> : <ArrowLeft/>}{t('previous')}</button><span dir="ltr">{currentPage + 1} / {pages}</span><button aria-label={t('next')} disabled={busy || failed || currentPage + 1 >= pages} onClick={() => changePage(currentPage + 1)}>{t('next')}{language === 'ar' ? <ArrowLeft/> : <ArrowRight/>}</button></div>
      <div className="tv-picker-footer-row"><span className="tv-picker-help">{t('instrumentSelectionSaved')}</span><div className="tv-picker-actions">{!all && <button disabled={!selected.length} onClick={() => change([])}>{t('clearSelection')}</button>}<button className="tv-picker-primary" onClick={done}><Check/>{t('done')}</button></div></div>
    </footer>
  </div>;
}
