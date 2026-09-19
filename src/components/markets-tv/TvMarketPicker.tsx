'use client';
import { useState } from 'react';
import { Check, Search, RotateCcw, ListFilter } from 'lucide-react';
import type { TvSelections } from '@/lib/markets-tv/selections';
import type { TvMarket, TvSettings } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
export function TvMarketPicker({ markets, settings, change, selections, customize }: { markets: TvMarket[]; settings: TvSettings; change: (value: TvSettings) => void; selections: TvSelections; customize: (market: TvMarket) => void }) {
  const [search, setSearch] = useState('');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language,key);
  const selected = settings.marketIds ?? markets.filter(m => settings.groups.includes('world') || settings.groups.includes(m.group)).map(m => m.id);
  const label = (m: TvMarket) => settings.language === 'ar' ? m.labelAr : settings.language === 'fr' ? m.labelFr : m.labelEn;
  const rows = markets.filter(m => `${m.labelAr} ${m.labelEn} ${m.labelFr} ${m.id}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="tv-market-picker">
    <label className="tv-market-search"><Search aria-hidden="true"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchMarkets')} aria-label={t('searchMarkets')}/></label>
    <div className="tv-market-presets"><button onClick={() => change({ ...settings, marketIds: markets.map(m => m.id) })}>{t('allMarkets')}</button>{(['gulf','us','europe','asia','crypto','forex'] as const).map(group => <button key={group} onClick={() => change({ ...settings, marketIds: markets.filter(m => m.group === group).map(m => m.id) })}>{t(group)}</button>)}<button onClick={() => change({ ...settings, marketIds: undefined })}><RotateCcw/>{t('resetSelection')}</button><button onClick={() => change({ ...settings, marketIds: [] })}>{t('clearSelection')}</button></div>
    <p className="tv-picker-count">{t('selectedMarkets')}: <b dir="ltr">{selected.length} / {markets.length}</b></p>
    <div className="tv-market-options">{rows.map(m => <div className="tv-market-option" key={m.id}><button className="tv-market-toggle" aria-pressed={selected.includes(m.id)} onClick={() => change({ ...settings, marketIds: selected.includes(m.id) ? selected.filter(id => id !== m.id) : [...selected, m.id] })}><span className="tv-market-check">{selected.includes(m.id) && <Check aria-hidden="true"/>}</span><span><strong>{label(m)}</strong><small>{t(m.group)} · {m.count.toLocaleString('en-US')} {m.status === 'unavailable' ? `· ${t('directoryUnavailable')}` : ''}</small></span></button><button className="tv-market-customize" disabled={!m.count} onClick={() => customize(m)} aria-label={`${t('customizeInstruments')}: ${label(m)}`}><ListFilter aria-hidden="true"/><span>{t('customizeInstruments')} · {selections[m.id] ? selections[m.id].length.toLocaleString('en-US') : t('allInstruments')}</span></button></div>)}</div>
    {!rows.length && <p>{t('noMatchingMarkets')}</p>}
    <p className="tv-muted">{t('settingsSaved')}</p>
  </div>;
}
