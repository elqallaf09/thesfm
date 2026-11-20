'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Check, Search, RotateCcw, ListFilter, CheckCheck } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { TV_STRIP_SPEEDS, type TvMarket, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { matchesTvSearch, moveTvMarket, selectedTvMarkets } from '@/lib/markets-tv/picker';
import { sessionText } from '@/lib/markets-tv/sessionCopy';
import { marketPickerText } from '@/lib/markets-tv/marketPickerCopy';
import './market-picker-tv.css';

export function TvMarketPicker({ markets, settings, change, selections, customize, done, initialMarketId, loading, error, retry }: {
  markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections;
  customize: (market: TvMarket) => void; done: () => void; initialMarketId?: string;
  loading?: boolean; error?: boolean; retry: () => void;
}) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<'all' | TvMarket['group']>('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeId, setActiveId] = useState(initialMarketId || '');
  const doneButton = useRef<HTMLButtonElement>(null);
  const visibilityButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Let the dialog's remote handler capture its opener before moving focus.
    // A cached lazy component mounts its effects before the parent's effects.
    const timer = setTimeout(() => doneButton.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(timer);
  }, []);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const copy = (key: Parameters<typeof marketPickerText>[1]) => marketPickerText(settings.language, key);
  const selected = selectedTvMarkets(markets, settings);
  const label = (market: TvMarket) => settings.language === 'ar' ? market.labelAr : settings.language === 'fr' ? market.labelFr : market.labelEn;
  const ordered = selectedOnly ? selected.flatMap(id => markets.find(market => market.id === id) || []) : markets;
  const rows = ordered.filter(market => (region === 'all' || market.group === region)
    && matchesTvSearch(search, market.labelAr, market.labelEn, market.labelFr, market.id));
  const active = rows.find(market => market.id === activeId) || rows[0];
  const position = active ? selected.indexOf(active.id) : -1;
  const firstOrderControl = position > 0 ? 'market-up' : position >= 0 && position < selected.length - 1 ? 'market-down' : 'market-speed-inherit';
  const optionsAfterInstruments = position >= 0 ? firstOrderControl : 'markets-done';
  const optionsBeforeOrder = active?.count ? 'market-instruments' : 'market-visible';
  const speedFocusKeys = ['market-speed-inherit', ...TV_STRIP_SPEEDS.map(speed => `market-speed-${speed}`)];
  const groups = [...new Set(markets.map(market => market.group))];
  const accessibleMarketName = (market: TvMarket) => {
    const order = selected.indexOf(market.id);
    return `${label(market)} · ${t(order >= 0 ? 'marketVisible' : 'marketHidden')}${order >= 0 ? ` · ${t('displayOrder')} ${order + 1} ${copy('of')} ${selected.length}` : ''}`;
  };
  return <div className="tv-picker tv-market-picker tv-market-picker-tv">
    <div className="tv-picker-scroll">
      <div className="tv-market-picker-top" data-tv-focus-row>
        <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')} data-tv-focus-key="markets-search"/></label>
        <div className="tv-segment" role="group" aria-label={t('marketList')}><button aria-pressed={!selectedOnly} onClick={() => setSelectedOnly(false)} data-tv-focus-key="markets-all">{t('allMarkets')}</button><button aria-pressed={selectedOnly} onClick={() => setSelectedOnly(true)} data-tv-focus-key="markets-selected">{t('selectedMarkets')} · <bdi>{selected.length} {copy('of')} {markets.length}</bdi></button></div>
        <button disabled={!rows.length || rows.every(market => selected.includes(market.id))} onClick={() => change({ ...settings, marketIds: [...new Set([...selected, ...rows.map(market => market.id)])] })} data-tv-focus-key="markets-select-results"><CheckCheck aria-hidden="true"/>{t('selectResults')}</button>
      </div>
      <div className="tv-market-region-options" role="group" aria-label={t('marketRegion')} data-tv-focus-row>
        <button aria-pressed={region === 'all'} onClick={() => setRegion('all')} data-tv-focus-key="markets-region-all">{sessionText(settings.language, 'allRegions')}</button>
        {groups.map(group => <button key={group} aria-pressed={region === group} onClick={() => setRegion(group)} data-tv-focus-key={`markets-region-${group}`}>{t(group)}</button>)}
      </div>
      {loading && !markets.length ? <p className="tv-picker-empty" role="status">{t('loading')}</p> : error && !markets.length ? <div className="tv-picker-empty" role="status"><p>{t('directoryUnavailable')}</p><button onClick={retry}>{t('retry')}</button></div> : <div className="tv-picker-workspace">
        {rows.length > 0 && <label className="tv-picker-mobile-market"><span>{t('marketList')}</span><select value={active?.id || ''} onChange={event => setActiveId(event.target.value)}>{rows.map(market => <option key={market.id} value={market.id}>{label(market)}{selected.includes(market.id) ? ` · ${t('displayOrder')} ${selected.indexOf(market.id) + 1} ${copy('of')} ${selected.length}` : ''}</option>)}</select></label>}
        <div className="tv-market-list" data-empty={!rows.length} data-many={rows.length > 24} data-tv-focus-grid data-tv-grid-exit-left={settings.language === 'ar' ? 'market-visible' : undefined} data-tv-grid-exit-right={settings.language === 'ar' ? undefined : 'market-visible'} role="group" aria-label={t('marketList')}>{rows.map(market => <button key={market.id} className="tv-market-row" aria-label={accessibleMarketName(market)} aria-pressed={active?.id === market.id} aria-controls="tv-market-editor" title={label(market)} data-tv-focus-key={`market-${market.id}`} onFocus={() => setActiveId(market.id)} onClick={() => { setActiveId(market.id); visibilityButton.current?.focus({ preventScroll: true }); }}>
          <span className="tv-market-check" data-selected={selected.includes(market.id)} aria-hidden="true">{selected.includes(market.id) && <Check aria-hidden="true"/>}</span>
          <span className="tv-picker-identity"><strong>{label(market)}</strong><small>{t(market.group)} · {copy('directoryAssets')}: {market.count.toLocaleString('en-US')} · {t(selected.includes(market.id) ? 'marketVisible' : 'marketHidden')}</small></span>
          {selected.includes(market.id) && <span className="tv-market-position" dir="ltr">#{selected.indexOf(market.id) + 1}</span>}
        </button>)}{!rows.length && <p className="tv-picker-empty">{t('noMatchingMarkets')}</p>}</div>
        {active && <section id="tv-market-editor" className="tv-market-editor" aria-label={`${t('marketOptions')}: ${label(active)}`} data-tv-back-focus={`market-${active.id}`}>
          <div><small>{copy('directoryAssets')}: <bdi>{active.count.toLocaleString('en-US')}</bdi></small><h3>{label(active)}</h3></div>
          <button ref={visibilityButton} className="tv-picker-primary" role="switch" aria-checked={position >= 0} aria-label={`${t('showMarket')}: ${label(active)}`} data-tv-focus-key="market-visible" data-tv-nav-down={active.count ? 'market-instruments' : optionsAfterInstruments} data-tv-nav-up="markets-all" data-tv-nav-right={settings.language === 'ar' ? `market-${active.id}` : undefined} data-tv-nav-left={settings.language === 'ar' ? undefined : `market-${active.id}`} onClick={() => change({ ...settings, marketIds: position >= 0 ? selected.filter(id => id !== active.id) : [...selected, active.id] })}><Check aria-hidden="true"/>{t(position >= 0 ? 'marketVisible' : 'addMarket')}</button>
          <button className="tv-market-customize" disabled={!active.count} onClick={() => customize(active)} aria-label={`${t('customizeInstruments')}: ${label(active)}`} data-tv-focus-key="market-instruments" data-tv-nav-down={optionsAfterInstruments} data-tv-nav-up="market-visible"><ListFilter aria-hidden="true"/><span>{t('customizeInstruments')}<small>{selections[active.id] ? `${selections[active.id].length.toLocaleString('en-US')} ${t('selectedInstruments')}` : t('allInstruments')}</small></span></button>
          {active.status === 'unavailable' && <p className="tv-picker-help">{t('directoryUnavailable')}</p>}
          {position >= 0 && <>
            <div className="tv-picker-control"><span>{t('displayOrder')} <b dir="auto">{position + 1} {copy('of')} {selected.length}</b></span><div className="tv-picker-actions" data-tv-focus-row><button data-tv-focus-key="market-up" data-tv-nav-down="market-speed-inherit" data-tv-nav-up={optionsBeforeOrder} disabled={position === 0} aria-label={`${t('moveMarketUp')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, -1) })}><ArrowUp aria-hidden="true"/>{copy('moveUp')}</button><button data-tv-focus-key="market-down" data-tv-nav-down={speedFocusKeys[1]} data-tv-nav-up={optionsBeforeOrder} disabled={position === selected.length - 1} aria-label={`${t('moveMarketDown')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, 1) })}><ArrowDown aria-hidden="true"/>{copy('moveDown')}</button></div></div>
            <div className="tv-picker-control"><span>{t('stripSpeed')}</span><div className="tv-speed-options" data-tv-focus-grid role="group" aria-label={`${t('stripSpeed')}: ${label(active)}`}>{[undefined, ...TV_STRIP_SPEEDS].map((speed, index) => <button key={speed ?? 'inherit'} data-tv-focus-key={speedFocusKeys[index]} data-tv-nav-down={index >= 2 ? 'markets-done' : speedFocusKeys[index + 2]} data-tv-nav-up={index >= 2 ? speedFocusKeys[index - 2] : index === 1 && position < selected.length - 1 ? 'market-down' : position > 0 ? 'market-up' : position < selected.length - 1 ? 'market-down' : optionsBeforeOrder} aria-pressed={settings.marketSpeeds?.[active.id] === speed} onClick={() => {
              const marketSpeeds = { ...settings.marketSpeeds };
              if (speed === undefined) delete marketSpeeds[active.id]; else marketSpeeds[active.id] = speed;
              change({ ...settings, marketSpeeds });
            }}>{index === 0 ? copy('inheritSpeed') : t((['inheritSpeed', 'slow', 'normal', 'fast'] as const)[index])}</button>)}</div></div>
          </>}
        </section>}
      </div>}
    </div>
    <footer className="tv-picker-footer" data-tv-focus-row><span className="tv-picker-help">{t('settingsSaved')}</span><div className="tv-picker-actions"><button disabled={!markets.length} onClick={() => change({ ...settings, marketIds: undefined })} data-tv-focus-key="markets-reset"><RotateCcw aria-hidden="true"/>{t('resetSelection')}</button><button disabled={!selected.length} onClick={() => change({ ...settings, marketIds: [] })} data-tv-focus-key="markets-clear">{copy('clearSelection')}</button><button ref={doneButton} className="tv-picker-primary" onClick={done} data-tv-initial-focus data-tv-focus-key="markets-done" data-tv-nav-up={active ? `market-${active.id}` : 'markets-all'}><Check aria-hidden="true"/>{sessionText(settings.language, 'done')}</button></div></footer>
  </div>;
}
