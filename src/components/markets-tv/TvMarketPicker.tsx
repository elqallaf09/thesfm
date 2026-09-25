'use client';
import { useState } from 'react';
import { ArrowUp, ArrowDown, Check, Search, RotateCcw, ListFilter } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import { TV_STRIP_SPEEDS, type TvMarket, type TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
export function TvMarketPicker({ markets, settings, change, selections, customize }: { markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections; customize: (market: TvMarket) => void }) {
  const [search, setSearch] = useState('');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language,key);
  const selected = settings.marketIds ?? markets.filter(m => settings.groups.includes('world') || settings.groups.includes(m.group)).map(m => m.id);
  const label = (m: TvMarket) => settings.language === 'ar' ? m.labelAr : settings.language === 'fr' ? m.labelFr : m.labelEn;
  const rows = markets.filter(m => `${m.labelAr} ${m.labelEn} ${m.labelFr} ${m.id}`.toLowerCase().includes(search.toLowerCase()));
  function move(id: string, direction: number) {
    const order = [...selected], index = order.indexOf(id), destination = index + direction;
    if (index < 0 || destination < 0 || destination >= order.length) return;
    [order[index], order[destination]] = [order[destination], order[index]];
    change({ ...settings, marketIds: order });
  }
  return <div className="tv-market-picker">
    <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')}/></label>
    <div className="tv-market-presets"><button onClick={() => change({ ...settings, marketIds: markets.map(m => m.id) })}>{t('allMarkets')}</button>{(['gulf','us','europe','asia','crypto','forex'] as const).map(group => <button key={group} onClick={() => change({ ...settings, marketIds: markets.filter(m => m.group === group).map(m => m.id) })}>{t(group)}</button>)}<button onClick={() => change({ ...settings, marketIds: undefined })}><RotateCcw/>{t('resetSelection')}</button><button onClick={() => change({ ...settings, marketIds: [] })}>{t('clearSelection')}</button></div>
    <p className="tv-picker-count">{t('selectedMarkets')}: <b dir="ltr">{selected.length} / {markets.length}</b></p>
    <div className="tv-market-options">{rows.map(m => <div className="tv-market-option" key={m.id}><button className="tv-market-toggle" aria-pressed={selected.includes(m.id)} onClick={() => change({ ...settings, marketIds: selected.includes(m.id) ? selected.filter(id => id !== m.id) : [...selected, m.id] })}><span className="tv-market-check">{selected.includes(m.id) && <Check aria-hidden="true"/>}</span><span><strong>{label(m)}</strong><small>{t(m.group)} · {m.count.toLocaleString('en-US')} {m.status === 'unavailable' ? `· ${t('directoryUnavailable')}` : ''}</small></span></button><button className="tv-market-customize" disabled={!m.count} onClick={() => customize(m)} aria-label={`${t('customizeInstruments')}: ${label(m)}`}><ListFilter aria-hidden="true"/><span>{t('customizeInstruments')} · {selections[m.id] ? selections[m.id].length.toLocaleString('en-US') : t('allInstruments')}</span></button>
      {selected.includes(m.id) && <div className="tv-market-controls"><span dir="ltr">#{selected.indexOf(m.id) + 1}</span><button disabled={selected.indexOf(m.id) === 0} aria-label={`${t('moveMarketUp')}: ${label(m)}`} onClick={() => move(m.id, -1)}><ArrowUp/></button><button disabled={selected.indexOf(m.id) === selected.length - 1} aria-label={`${t('moveMarketDown')}: ${label(m)}`} onClick={() => move(m.id, 1)}><ArrowDown/></button>
        <label>{t('stripSpeed')}<select aria-label={`${t('stripSpeed')}: ${label(m)}`} value={settings.marketSpeeds?.[m.id] ?? ''} onChange={event => {
          const marketSpeeds = { ...settings.marketSpeeds };
          if (event.target.value) marketSpeeds[m.id] = Number(event.target.value); else delete marketSpeeds[m.id];
          change({ ...settings, marketSpeeds });
        }}><option value="">{t('inheritSpeed')}</option>{TV_STRIP_SPEEDS.map((speed, i) => <option key={speed} value={speed}>{t((['slow', 'normal', 'fast'] as const)[i])}</option>)}</select></label>
      </div>}
    </div>)}</div>
    {!rows.length && <p>{t('noMatchingMarkets')}</p>}
    <p className="tv-muted">{t('settingsSaved')}</p>
  </div>;
}
