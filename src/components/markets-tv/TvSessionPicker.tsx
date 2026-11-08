'use client';
import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { TvMarketFlag } from './TvMarketFlag';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvSession, TvSessionRegion } from '@/lib/markets-tv/sessionTypes';
import { sessionNameIndex, sessionText } from '@/lib/markets-tv/sessionCopy';
const regions:TvSessionRegion[]=['gulf','arab','europe','americas','asia','africa','oceania'];
const clean=(text:string)=>text.normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f]/g,'').replace(/[أإآ]/g,'ا').toLocaleLowerCase();
export function TvSessionPicker({sessions,selected,language,onChange,onDone}:{sessions:readonly TvSession[];selected:string[];language:TvLanguage;onChange:(ids:string[])=>void;onDone:()=>void}){
 const [search,setSearch]=useState(''),[area,setArea]=useState<TvSessionRegion|'all'>('all');
 const t=(key:Parameters<typeof sessionText>[1])=>sessionText(language,key);
 const countries=useMemo(()=>new Intl.DisplayNames([language],{type:'region'}),[language]);
 const query=clean(search.trim());
 const matches=sessions.filter(s=>(area==='all'||s.area===area)&&clean([...s.names,s.region,s.id,countries.of(s.region)||''].join(' ')).includes(query));
 const chosen=new Set(selected);
 return <div className="tv-session-picker">
  <div className="tv-session-picker-heading"><h2>{t('choose')}</h2><button onClick={onDone} data-tv-focus-key="sessions-done">{t('done')} <bdi>{selected.length}/{sessions.length}</bdi></button></div>
  <label className="tv-session-search"><Search aria-hidden="true"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search')} aria-label={t('search')}/></label>
  <div className="tv-session-regions" role="group" aria-label={t('allRegions')}>{(['all',...regions] as const).map(id=><button key={id} aria-pressed={area===id} onClick={()=>setArea(id)}>{t(id==='all'?'allRegions':id)}</button>)}</div>
  <div className="tv-session-picker-actions"><button onClick={()=>onChange(sessions.map(s=>s.id))}>{t('all')}</button><button onClick={()=>onChange([])}>{t('clear')}</button><button onClick={()=>onChange([...new Set([...selected,...matches.map(s=>s.id)])])}>{t('selectRegion')}</button></div>
  <div className="tv-session-options">{matches.map(s=><button role="checkbox" aria-checked={chosen.has(s.id)} key={s.id} onClick={()=>onChange(chosen.has(s.id)?selected.filter(id=>id!==s.id):[...selected,s.id])} data-tv-focus-key={`choose-session:${s.id}`}><TvMarketFlag region={s.region}/><span className="tv-session-check" aria-hidden="true">{chosen.has(s.id)&&<Check/>}</span><span><strong>{s.names[sessionNameIndex(language)]}</strong><small>{countries.of(s.region)} · <bdi>{s.id}</bdi></small></span></button>)}{!matches.length&&<p>{t('noResults')}</p>}</div>
  <small className="tv-session-saved">{t('saved')}</small>
 </div>;
}
