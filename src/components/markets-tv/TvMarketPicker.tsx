'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Check, Search, RotateCcw, ListFilter, CheckCheck } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { TV_STRIP_SPEEDS, type TvMarket, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { matchesTvSearch, moveTvMarket, selectedTvMarkets } from '@/lib/markets-tv/picker';
import { sessionText } from '@/lib/markets-tv/sessionCopy';
import './market-picker-fit.css';

export function TvMarketPicker({ markets, settings, change, selections, customize, done, initialMarketId, loading, error, retry }: {
  markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections;
  customize: (market: TvMarket) => void; done: () => void; initialMarketId?: string;
  loading?: boolean; error?: boolean; retry: () => void;
}) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeId, setActiveId] = useState(initialMarketId || '');
  const doneButton = useRef<HTMLButtonElement>(null);
  const visibilityButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { doneButton.current?.focus({ preventScroll: true }); }, []);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const selected = selectedTvMarkets(markets, settings);
  const label = (market: TvMarket) => settings.language === 'ar' ? market.labelAr : settings.language === 'fr' ? market.labelFr : market.labelEn;
  const ordered = selectedOnly ? selected.flatMap(id => markets.find(market => market.id === id) || []) : markets;
  const rows = ordered.filter(market => (region === 'all' || market.group === region)
    && matchesTvSearch(search, market.labelAr, market.labelEn, market.labelFr, market.id));
  const active = rows.find(market => market.id === activeId) || rows[0];
  const position = active ? selected.indexOf(active.id) : -1;
  const groups = [...new Set(markets.map(market => market.group))];
  return <div className="tv-picker tv-market-picker tv-market-picker-fit">
    <div className="tv-picker-scroll">
      <div className="tv-market-picker-top" data-tv-focus-row>
        <label className="tv-market-search"><Search aria-hidden="true"/><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')} data-tv-focus-key="markets-search"/></label>
        <div className="tv-segment" role="group" aria-label={t('marketList')}><button aria-pressed={!selectedOnly} onClick={() => setSelectedOnly(false)} data-tv-focus-key="markets-show-all">{t('allMarkets')}</button><button aria-pressed={selectedOnly} onClick={() => setSelectedOnly(true)} data-tv-focus-key="markets-show-selected">{t('selectedMarkets')} · <bdi>{selected.length}/{markets.length}</bdi></button></div>
        <button disabled={!rows.length || rows.every(market => selected.includes(market.id))} onClick={() => change({ ...settings, marketIds: [...new Set([...selected, ...rows.map(market => market.id)])] })} data-tv-focus-key="markets-select-results"><CheckCheck/>{t('selectResults')}</button>
      </div>
      <div className="tv-market-region-options" role="group" aria-label={t('marketRegion')} data-tv-focus-row>
        <button aria-pressed={region === 'all'} onClick={() => setRegion('all')} data-tv-focus-key="markets-region-all">{sessionText(settings.language, 'allRegions')}</button>
        {groups.map(group => <button key={group} aria-pressed={region === group} onClick={() => setRegion(group)} data-tv-focus-key={`markets-region-${group}`}>{t(group)}</button>)}
      </div>
      {loading && !markets.length ? <p className="tv-picker-empty" role="status">{t('loading')}</p> : error && !markets.length ? <div className="tv-picker-empty" role="status"><p>{t('directoryUnavailable')}</p><button onClick={retry}>{t('retry')}</button></div> : <div className="tv-picker-workspace">
        {rows.length > 0 && <label className="tv-picker-mobile-market"><span>{t('marketList')}</span><select value={active?.id || ''} onChange={event => setActiveId(event.target.value)}>{rows.map(market => <option key={market.id} value={market.id}>{label(market)}{selected.includes(market.id) ? ` · #${selected.indexOf(market.id) + 1}` : ''}</option>)}</select></label>}
        <div className="tv-market-list" data-empty={!rows.length} data-many={rows.length > 24} data-tv-focus-grid data-tv-grid-exit-left={settings.language === 'ar' ? 'markets-visibility' : undefined} data-tv-grid-exit-right={settings.language === 'ar' ? undefined : 'markets-visibility'} role="group" aria-label={t('marketList')}>{rows.map(market => <button key={market.id} className="tv-market-row" aria-pressed={active?.id === market.id} aria-controls="tv-market-editor" title={label(market)} data-tv-focus-key={`market-${market.id}`} onFocus={() => setActiveId(market.id)} onClick={() => { setActiveId(market.id); visibilityButton.current?.focus({ preventScroll: true }); }}>
          <span className="tv-market-check" data-selected={selected.includes(market.id)} aria-hidden="true">{selected.includes(market.id) && <Check/>}</span>
          <span className="tv-picker-identity"><strong>{label(market)}</strong><small>{t(market.group)} · {market.count.toLocaleString('en-US')} · {t(selected.includes(market.id) ? 'marketVisible' : 'marketHidden')}</small></span>
          {selected.includes(market.id) && <span className="tv-market-position" dir="ltr">#{selected.indexOf(market.id) + 1}</span>}
        </button>)}{!rows.length && <p className="tv-picker-empty">{t('noMatchingMarkets')}</p>}</div>
        {active && <section id="tv-market-editor" className="tv-market-editor" aria-label={`${t('marketOptions')}: ${label(active)}`} data-tv-back-focus={`market-${active.id}`}>
          <div><small>{t('marketOptions')} · <bdi>{active.count.toLocaleString('en-US')}</bdi></small><h3>{label(active)}</h3></div>
          <button ref={visibilityButton} className="tv-picker-primary" role="switch" aria-checked={position >= 0} aria-label={`${t('showMarket')}: ${label(active)}`} data-tv-focus-key="markets-visibility" data-tv-nav-down="markets-instruments" data-tv-nav-right={settings.language === 'ar' ? `market-${active.id}` : undefined} data-tv-nav-left={settings.language === 'ar' ? undefined : `market-${active.id}`} onClick={() => change({ ...settings, marketIds: position >= 0 ? selected.filter(id => id !== active.id) : [...selected, active.id] })}><Check/>{t(position >= 0 ? 'marketVisible' : 'addMarket')}</button>
          <button className="tv-market-customize" disabled={!active.count} onClick={() => customize(active)} aria-label={`${t('customizeInstruments')}: ${label(active)}`} data-tv-focus-key="markets-instruments" data-tv-nav-down={position >= 0 ? position > 0 ? 'markets-order-up' : 'markets-order-down' : 'markets-done'}><ListFilter/><span>{t('customizeInstruments')}<small>{selections[active.id] ? `${selections[active.id].length.toLocaleString('en-US')} ${t('selectedInstruments')}` : t('allInstruments')}</small></span></button>
          {active.status === 'unavailable' && <p className="tv-picker-help">{t('directoryUnavailable')}</p>}
          {position >= 0 && <>
            <div className="tv-picker-control"><span>{t('displayOrder')} <b dir="ltr">{position + 1} / {selected.length}</b></span><div className="tv-picker-actions" data-tv-focus-row><button data-tv-focus-key="markets-order-up" data-tv-nav-down="markets-speed-default" disabled={position === 0} aria-label={`${t('moveMarketUp')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, -1) })}><ArrowUp/>{t('moveMarketUp')}</button><button data-tv-focus-key="markets-order-down" data-tv-nav-down="markets-speed-default" disabled={position === selected.length - 1} aria-label={`${t('moveMarketDown')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, 1) })}><ArrowDown/>{t('moveMarketDown')}</button></div></div>
            <div className="tv-picker-control"><span>{t('stripSpeed')}</span><div className="tv-speed-options" data-tv-focus-grid role="group" aria-label={`${t('stripSpeed')}: ${label(active)}`}>{[undefined, ...TV_STRIP_SPEEDS].map((speed, index) => <button key={speed ?? 'inherit'} data-tv-focus-key={`markets-speed-${speed ?? 'default'}`} data-tv-nav-down={index >= 2 ? 'markets-done' : undefined} aria-pressed={settings.marketSpeeds?.[active.id] === speed} onClick={() => {
              const marketSpeeds = { ...settings.marketSpeeds };
              if (speed === undefined) delete marketSpeeds[active.id]; else marketSpeeds[active.id] = speed;
              change({ ...settings, marketSpeeds });
            }}>{t((['inheritSpeed', 'slow', 'normal', 'fast'] as const)[index])}</button>)}</div></div>
          </>}
        </section>}
      </div>}
    </div>
    <footer className="tv-picker-footer" data-tv-focus-row><span className="tv-picker-help">{t('settingsSaved')}</span><div className="tv-picker-actions"><button disabled={!markets.length} onClick={() => change({ ...settings, marketIds: undefined })} data-tv-focus-key="markets-reset"><RotateCcw/>{t('resetSelection')}</button><button disabled={!selected.length} onClick={() => change({ ...settings, marketIds: [] })} data-tv-focus-key="markets-clear">{t('clearSelection')}</button><button ref={doneButton} className="tv-picker-primary" onClick={done} data-tv-initial-focus data-tv-focus-key="markets-done" data-tv-nav-up={active ? `market-${active.id}` : 'markets-show-all'}><Check/>{sessionText(settings.language, 'done')}</button></div></footer>
  </div>;
}
