'use client';
import { useState } from 'react';
import { ArrowUp, ArrowDown, Check, Search, RotateCcw, ListFilter, CheckCheck } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { TV_STRIP_SPEEDS, type TvMarket, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { matchesTvSearch, moveTvMarket, selectedTvMarkets } from '@/lib/markets-tv/picker';

export function TvMarketPicker({ markets, settings, change, selections, customize, done, initialMarketId, loading, error, retry }: {
  markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections;
  customize: (market: TvMarket) => void; done: () => void; initialMarketId?: string;
  loading?: boolean; error?: boolean; retry: () => void;
}) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeId, setActiveId] = useState(initialMarketId || '');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const selected = selectedTvMarkets(markets, settings);
  const label = (market: TvMarket) => settings.language === 'ar' ? market.labelAr : settings.language === 'fr' ? market.labelFr : market.labelEn;
  const ordered = selectedOnly ? selected.flatMap(id => markets.find(market => market.id === id) || []) : markets;
  const rows = ordered.filter(market => (region === 'all' || market.group === region)
    && matchesTvSearch(search, market.labelAr, market.labelEn, market.labelFr, market.id));
  const active = rows.find(market => market.id === activeId) || rows[0];
  const position = active ? selected.indexOf(active.id) : -1;
  const groups = [...new Set(markets.map(market => market.group))];
  return <div className="tv-picker tv-market-picker">
    <div className="tv-picker-scroll">
      <div className="tv-picker-intro"><div><h3>{t('marketPickerHeading')}</h3><p>{t('marketPickerHelp')}</p></div><span className="tv-picker-count"><b dir="ltr">{selected.length} / {markets.length}</b>{t('selectedMarkets')}</span></div>
      <div className="tv-picker-filters">
        <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')}/></label>
        <label className="tv-picker-region"><span>{t('marketRegion')}</span><select aria-label={t('marketRegion')} value={region} onChange={event => setRegion(event.target.value)}><option value="all">{t('allMarkets')}</option>{groups.map(group => <option key={group} value={group}>{t(group)}</option>)}</select></label>
      </div>
      <div className="tv-picker-toolbar"><div className="tv-segment" role="group" aria-label={t('marketList')}><button aria-pressed={!selectedOnly} onClick={() => setSelectedOnly(false)}>{t('allMarkets')}</button><button aria-pressed={selectedOnly} onClick={() => setSelectedOnly(true)}>{t('selectedMarkets')} · {selected.length}</button></div>
        <button disabled={!rows.length || rows.every(market => selected.includes(market.id))} onClick={() => change({ ...settings, marketIds: [...new Set([...selected, ...rows.map(market => market.id)])] })}><CheckCheck/>{t('selectResults')}</button>
      </div>
      {loading && !markets.length ? <p className="tv-picker-empty" role="status">{t('loading')}</p> : error && !markets.length ? <div className="tv-picker-empty" role="status"><p>{t('directoryUnavailable')}</p><button onClick={retry}>{t('retry')}</button></div> : <div className="tv-picker-workspace">
        {rows.length > 0 && <label className="tv-picker-mobile-market"><span>{t('marketList')}</span><select value={active?.id || ''} onChange={event => setActiveId(event.target.value)}>{rows.map(market => <option key={market.id} value={market.id}>{label(market)}{selected.includes(market.id) ? ` · #${selected.indexOf(market.id) + 1}` : ''}</option>)}</select></label>}
        <div className="tv-market-list" data-empty={!rows.length} role="group" aria-label={t('marketList')}>{rows.map(market => <button key={market.id} className="tv-market-row" aria-pressed={active?.id === market.id} aria-controls="tv-market-editor" data-tv-focus-key={`market-${market.id}`} onClick={() => setActiveId(market.id)}>
          <span className="tv-market-check" data-selected={selected.includes(market.id)} aria-hidden="true">{selected.includes(market.id) && <Check/>}</span>
          <span className="tv-picker-identity"><strong>{label(market)}</strong><small>{t(market.group)} · {market.count.toLocaleString('en-US')} · {t(selected.includes(market.id) ? 'marketVisible' : 'marketHidden')}</small></span>
          {selected.includes(market.id) && <span className="tv-market-position" dir="ltr">#{selected.indexOf(market.id) + 1}</span>}
        </button>)}{!rows.length && <p className="tv-picker-empty">{t('noMatchingMarkets')}</p>}</div>
        {active && <section id="tv-market-editor" className="tv-market-editor" aria-label={`${t('marketOptions')}: ${label(active)}`}>
          <div><small>{t('marketOptions')}</small><h3>{label(active)}</h3></div>
          <button className="tv-picker-primary" role="switch" aria-checked={position >= 0} aria-label={`${t('showMarket')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: position >= 0 ? selected.filter(id => id !== active.id) : [...selected, active.id] })}><Check/>{t(position >= 0 ? 'marketVisible' : 'addMarket')}</button>
          <button className="tv-market-customize" disabled={!active.count} onClick={() => customize(active)} aria-label={`${t('customizeInstruments')}: ${label(active)}`}><ListFilter/><span>{t('customizeInstruments')}<small>{selections[active.id] ? `${selections[active.id].length.toLocaleString('en-US')} ${t('selectedInstruments')}` : t('allInstruments')}</small></span></button>
          {active.status === 'unavailable' && <p className="tv-picker-help">{t('directoryUnavailable')}</p>}
          {position >= 0 && <>
            <div className="tv-picker-control"><span>{t('displayOrder')} <b dir="ltr">{position + 1} / {selected.length}</b></span><div className="tv-picker-actions"><button disabled={position === 0} aria-label={`${t('moveMarketUp')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, -1) })}><ArrowUp/>{t('moveMarketUp')}</button><button disabled={position === selected.length - 1} aria-label={`${t('moveMarketDown')}: ${label(active)}`} onClick={() => change({ ...settings, marketIds: moveTvMarket(selected, active.id, 1) })}><ArrowDown/>{t('moveMarketDown')}</button></div></div>
            <div className="tv-picker-control"><span>{t('stripSpeed')}</span><div className="tv-speed-options" role="group" aria-label={`${t('stripSpeed')}: ${label(active)}`}>{[undefined, ...TV_STRIP_SPEEDS].map((speed, index) => <button key={speed ?? 'inherit'} aria-pressed={settings.marketSpeeds?.[active.id] === speed} onClick={() => {
              const marketSpeeds = { ...settings.marketSpeeds };
              if (speed === undefined) delete marketSpeeds[active.id]; else marketSpeeds[active.id] = speed;
              change({ ...settings, marketSpeeds });
            }}>{t((['inheritSpeed', 'slow', 'normal', 'fast'] as const)[index])}</button>)}</div></div>
          </>}
        </section>}
      </div>}
    </div>
    <footer className="tv-picker-footer"><span className="tv-picker-help">{t('settingsSaved')}</span><div className="tv-picker-actions"><button disabled={!markets.length} onClick={() => change({ ...settings, marketIds: undefined })}><RotateCcw/>{t('resetSelection')}</button><button disabled={!selected.length} onClick={() => change({ ...settings, marketIds: [] })}>{t('clearSelection')}</button><button className="tv-picker-primary" onClick={done}><Check/>{t('done')}</button></div></footer>
  </div>;
}
