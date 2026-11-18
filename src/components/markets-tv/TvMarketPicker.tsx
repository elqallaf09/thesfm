'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Check, Search, RotateCcw, ListFilter, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { TV_STRIP_SPEEDS, type TvMarket, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { sessionText } from '@/lib/markets-tv/sessionCopy';
import { matchesTvSearch, moveTvMarket, selectedTvMarkets } from '@/lib/markets-tv/picker';
import './market-picker-tv.css';

// Four full-size rows keep the directory readable from the sofa, regardless of
// catalog size. Only the selected market's options may scroll on short screens.
const MARKETS_PER_PAGE = 4;

export function TvMarketPicker({ markets, settings, change, selections, customize, done, initialMarketId, loading, error, retry }: {
  markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections;
  customize: (market: TvMarket) => void; done: () => void; initialMarketId?: string;
  loading?: boolean; error?: boolean; retry: () => void;
}) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeId, setActiveId] = useState(initialMarketId || '');
  const [page, setPage] = useState(() => Math.max(0, Math.floor(markets.findIndex(market => market.id === initialMarketId) / MARKETS_PER_PAGE)));
  const doneRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const rtl = settings.language === 'ar';
  const selected = selectedTvMarkets(markets, settings);
  const label = (market: TvMarket) => settings.language === 'ar' ? market.labelAr : settings.language === 'fr' ? market.labelFr : market.labelEn;
  const ordered = selectedOnly ? selected.flatMap(id => markets.find(market => market.id === id) || []) : markets;
  const rows = ordered.filter(market => (region === 'all' || market.group === region)
    && matchesTvSearch(search, market.labelAr, market.labelEn, market.labelFr, market.id));
  const pages = Math.max(1, Math.ceil(rows.length / MARKETS_PER_PAGE));
  const currentPage = Math.min(page, pages - 1);
  const visibleRows = rows.slice(currentPage * MARKETS_PER_PAGE, (currentPage + 1) * MARKETS_PER_PAGE);
  const active = visibleRows.find(market => market.id === activeId) || visibleRows[0];
  const position = active ? selected.indexOf(active.id) : -1;
  const groups = [...new Set(markets.map(market => market.group))];

  // The picker is lazy-loaded after its dialog. Establish a useful initial
  // target even if the remote hook already focused the dialog's close button.
  useEffect(() => { doneRef.current?.focus(); }, []);

  function openMarket(market: TvMarket) {
    setActiveId(market.id);
    requestAnimationFrame(() => editorRef.current?.querySelector<HTMLButtonElement>('[data-tv-focus-key="market-visible"]')?.focus());
  }

  function movePage(next: number) {
    setPage(next);
    setActiveId(rows[next * MARKETS_PER_PAGE]?.id || '');
    if (editorRef.current) editorRef.current.scrollTop = 0;
  }

  return <div className="tv-picker tv-market-picker tv-market-picker-tv">
    <div className="tv-market-picker-controls">
      <div className="tv-market-picker-top">
        <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')} data-tv-focus-key="markets-search"/></label>
        <label className="tv-picker-region"><span>{t('marketRegion')}</span><select aria-label={t('marketRegion')} value={region} onChange={event => { setRegion(event.target.value); setPage(0); }} data-tv-focus-key="markets-region"><option value="all">{t('allMarkets')}</option>{groups.map(group => <option key={group} value={group}>{t(group)}</option>)}</select></label>
        <span className="tv-picker-count"><b dir="ltr">{selected.length} / {markets.length}</b>{t('selectedMarkets')}</span>
      </div>
      <div className="tv-picker-toolbar"><div className="tv-segment" role="group" aria-label={t('marketList')}><button aria-pressed={!selectedOnly} onClick={() => { setSelectedOnly(false); setPage(0); }} data-tv-focus-key="markets-all">{t('allMarkets')}</button><button aria-pressed={selectedOnly} onClick={() => { setSelectedOnly(true); setPage(0); }} data-tv-focus-key="markets-selected">{t('selectedMarkets')} · {selected.length}</button></div>
        <button disabled={!visibleRows.length || visibleRows.every(market => selected.includes(market.id))} onClick={() => change({ ...settings, marketIds: [...new Set([...selected, ...visibleRows.map(market => market.id)])] })} data-tv-focus-key="markets-select-page"><CheckCheck aria-hidden="true"/>{t('selectPage')}</button>
      </div>
    </div>

    {loading && !markets.length ? <p className="tv-picker-empty" role="status">{t('loading')}</p> : error && !markets.length ? <div className="tv-picker-empty" role="status"><p>{t('directoryUnavailable')}</p><button onClick={retry}>{t('retry')}</button></div> : <div className="tv-picker-workspace">
      <section className="tv-market-directory" aria-label={t('marketList')}>
        <div className="tv-market-list" data-empty={!visibleRows.length} data-tv-focus-grid role="group" aria-label={t('marketList')}>{visibleRows.map((market, index) => <button key={market.id} className="tv-market-row" aria-pressed={active?.id === market.id} aria-controls="tv-market-editor" data-tv-focus-key={`market-${market.id}`}
          data-tv-nav-left={rtl ? 'market-visible' : undefined} data-tv-nav-right={rtl ? undefined : 'market-visible'}
          data-tv-nav-down={index === visibleRows.length - 1 ? currentPage < pages - 1 ? 'markets-next' : currentPage > 0 ? 'markets-previous' : 'markets-done' : undefined}
          onFocus={() => setActiveId(market.id)} onClick={() => openMarket(market)}>
          <span className="tv-market-check" data-selected={selected.includes(market.id)} aria-hidden="true">{selected.includes(market.id) && <Check/>}</span>
          <span className="tv-picker-identity"><strong>{label(market)}</strong><small>{t(market.group)} · {market.count.toLocaleString('en-US')} · {t(selected.includes(market.id) ? 'marketVisible' : 'marketHidden')}</small></span>
          {selected.includes(market.id) && <span className="tv-market-position" dir="ltr">#{selected.indexOf(market.id) + 1}</span>}
        </button>)}{!visibleRows.length && <p className="tv-picker-empty" role="status">{t('noMatchingMarkets')}</p>}</div>
        <nav className="tv-market-pagination" aria-label={t('marketList')}>
          <button disabled={currentPage === 0} onClick={() => movePage(currentPage - 1)} data-tv-focus-key="markets-previous" data-tv-nav-down="markets-done">{rtl ? <ChevronRight aria-hidden="true"/> : <ChevronLeft aria-hidden="true"/>}{t('previous')}</button>
          <span aria-live="polite"><bdi>{currentPage + 1} / {pages}</bdi><small>{t('batchRange')} <bdi>{rows.length ? currentPage * MARKETS_PER_PAGE + 1 : 0}–{Math.min((currentPage + 1) * MARKETS_PER_PAGE, rows.length)} / {rows.length}</bdi></small></span>
          <button disabled={currentPage === pages - 1} onClick={() => movePage(currentPage + 1)} data-tv-focus-key="markets-next" data-tv-nav-down="markets-done">{t('next')}{rtl ? <ChevronLeft aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}</button>
        </nav>
      </section>
      {active && <section ref={editorRef} id="tv-market-editor" className="tv-market-editor" aria-label={`${t('marketOptions')}: ${label(active)}`}>
        <div className="tv-market-editor-title"><small>{t('marketOptions')}</small><h3>{label(active)}</h3></div>
        <button className="tv-picker-primary" role="switch" aria-checked={position >= 0} aria-label={`${t('showMarket')}: ${label(active)}`} data-tv-focus-key="market-visible"
          data-tv-nav-right={rtl ? `market-${active.id}` : undefined} data-tv-nav-left={rtl ? undefined : `market-${active.id}`}
          onClick={() => change({ ...settings, marketIds: position >= 0 ? selected.filter(id => id !== active.id) : [...selected, active.id] })}><Check aria-hidden="true"/>{t(position >= 0 ? 'marketVisible' : 'addMarket')}</button>
        <button className="tv-market-customize" disabled={!active.count} onClick={() => customize(active)} aria-label={`${t('customizeInstruments')}: ${label(active)}`} data-tv-focus-key="market-instruments" data-tv-nav-down={position < 0 ? 'markets-done' : undefined}><ListFilter aria-hidden="true"/><span>{t('customizeInstruments')}<small>{selections[active.id] ? `${selections[active.id].length.toLocaleString('en-US')} ${t('selectedInstruments')}` : t('allInstruments')}</small></span></button>
        {active.status === 'unavailable' && <p className="tv-picker-help">{t('directoryUnavailable')}</p>}
        {position >= 0 && <>
          <div className="tv-picker-control"><span>{t('displayOrder')} <b dir="ltr">{position + 1} / {selected.length}</b></span><div className="tv-picker-actions"><button disabled={position === 0} aria-label={`${t('moveMarketUp')}: ${label(active)}`} data-tv-focus-key="market-up" onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, -1) })}><ArrowUp aria-hidden="true"/>{t('moveMarketUp')}</button><button disabled={position === selected.length - 1} aria-label={`${t('moveMarketDown')}: ${label(active)}`} data-tv-focus-key="market-down" onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, 1) })}><ArrowDown aria-hidden="true"/>{t('moveMarketDown')}</button></div></div>
          <div className="tv-picker-control"><span>{t('stripSpeed')}</span><div className="tv-speed-options" role="group" aria-label={`${t('stripSpeed')}: ${label(active)}`}>{[undefined, ...TV_STRIP_SPEEDS].map((speed, index) => <button key={speed ?? 'inherit'} aria-pressed={settings.marketSpeeds?.[active.id] === speed} data-tv-focus-key={`market-speed-${speed ?? 'inherit'}`} data-tv-nav-down={index >= 2 ? 'markets-done' : undefined} onClick={() => {
            const marketSpeeds = { ...settings.marketSpeeds };
            if (speed === undefined) delete marketSpeeds[active.id]; else marketSpeeds[active.id] = speed;
            change({ ...settings, marketSpeeds });
          }}>{t((['inheritSpeed', 'slow', 'normal', 'fast'] as const)[index])}</button>)}</div></div>
        </>}
      </section>}
    </div>}

    <footer className="tv-picker-footer"><span className="tv-picker-help">{t('settingsSaved')}</span><div className="tv-picker-actions"><button disabled={!markets.length} onClick={() => change({ ...settings, marketIds: undefined })} data-tv-focus-key="markets-reset"><RotateCcw aria-hidden="true"/>{t('resetSelection')}</button><button disabled={!selected.length} onClick={() => change({ ...settings, marketIds: [] })} data-tv-focus-key="markets-clear">{t('clearSelection')}</button><button ref={doneRef} className="tv-picker-primary" onClick={done} data-tv-focus-key="markets-done" data-tv-initial-focus><Check aria-hidden="true"/>{sessionText(settings.language, 'done')}</button></div></footer>
  </div>;
}
