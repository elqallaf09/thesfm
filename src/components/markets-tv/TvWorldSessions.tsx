'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, QrCode, SlidersHorizontal } from 'lucide-react';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
import { TV_HOURS_VERIFIED } from '@/lib/markets-tv/sessions';
import { DEFAULT_TV_SESSION_IDS, normalizeTvSessionIds } from '@/lib/markets-tv/sessionSelection';
import { sessionHoursAt, sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { sessionNameIndex, sessionText } from '@/lib/markets-tv/sessionCopy';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvPagination } from '@/lib/markets-tv/pagination';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TvQr } from './TvQr';
import { TvSessionPicker } from './TvSessionPicker';
import { TvSessionCountdown, useTvSessionClock } from './TvSessionCountdown';
import '@/app/tv/world-sessions.css';
export type TvWorldSessionsProps={language:TvLanguage;now:number;selected?:string[];onSelectionChange?:(ids:string[])=>void};
const targetClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const clocks=new Map(TV_WORLD_SESSIONS.map(s=>[s.zone,new Intl.DateTimeFormat('en-GB',{timeZone:s.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})]));
export default function TvWorldSessions({language,now:initial,selected,onSelectionChange}:TvWorldSessionsProps){
 const root=useRef<HTMLElement>(null),focusAfter=useRef<string|null>(null);
 const [local,setLocal]=useState(DEFAULT_TV_SESSION_IDS),[editing,setEditing]=useState(false),[source,setSource]=useState<string|null>(null),[page,setPage]=useState(0),[pageSize,setPageSize]=useState(4);
 const now=useTvSessionClock(initial,!editing&&!source);
 const ids=useMemo(()=>normalizeTvSessionIds(selected??local)??DEFAULT_TV_SESSION_IDS,[selected,local]);
 const chosen=useMemo(()=>new Set(ids),[ids]);
 const sessions=TV_WORLD_SESSIONS.filter(s=>chosen.has(s.id));
 const {current,pages,count}=tvPagination(sessions.length,pageSize,page);
 const t=(key:Parameters<typeof sessionText>[1])=>sessionText(language,key);
 useEffect(()=>{const fit=()=>{const columns=innerWidth<761?1:innerWidth<1150||innerHeight<650?2:3;setPageSize(columns*(innerWidth<761||innerHeight>=900?2:1));};fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);},[]);
 useEffect(()=>{if(focusAfter.current){root.current?.querySelector<HTMLButtonElement>(`[data-tv-focus-key="${focusAfter.current}"]`)?.focus();focusAfter.current=null;}},[editing,source]);
 const change=(value:string[])=>{setLocal(value);onSelectionChange?.(value);setPage(0);};
 const reference=TV_WORLD_SESSIONS.find(s=>s.id===source);
 return <section ref={root} className="tv-sessions tv-world-sessions" aria-label={t('title')}>
  {editing?<TvSessionPicker sessions={TV_WORLD_SESSIONS} selected={ids} language={language} onChange={change} onDone={()=>{focusAfter.current='sessions-choose';setEditing(false);}}/>:reference?<div className="tv-world-source tv-session-qr"><div><h2>{reference.names[sessionNameIndex(language)]}</h2><p>{reference.source}</p><p>{t('source')}</p><button onClick={()=>{focusAfter.current=`session:${reference.id}`;setSource(null);}} data-tv-focus-key="session-source-back">{t('back')}</button></div><TvQr size={220} value={reference.url} label={t('source')}/></div>:<>
  <header className="tv-world-heading"><div><h2><Clock3 aria-hidden="true"/>{t('title')}</h2><p>{t('selected')}: <bdi>{ids.length}/{TV_WORLD_SESSIONS.length}</bdi> · {t('kuwait')} <bdi>UTC+3</bdi></p></div><button onClick={()=>{focusAfter.current='sessions-done';setEditing(true);}} data-tv-focus-key="sessions-choose"><SlidersHorizontal aria-hidden="true"/>{t('choose')}</button></header>
  {sessions.length?<div className="tv-world-grid">{sessions.slice(current*count,(current+1)*count).map(session=>{
   const state=sessionTimeline(session,now),target=state.open?state.closesAt:state.nextOpen;
   return <article className="tv-session" key={session.id} data-market={session.id} data-open={state.open}>
    <header><span className="tv-session-code" dir="ltr">{session.region}</span><div><h2>{session.names[sessionNameIndex(language)]}</h2><span className="tv-world-status" data-open={state.open}><i aria-hidden="true"/>{t(state.open?'open':'closed')}</span></div><div className="tv-world-local"><time dir="ltr">{now?clocks.get(session.zone)!.format(now):'—'}</time><small>{t('local')}</small></div></header>
    <div className="tv-world-periods"><small>{t('hours')} · {t(session.days)}</small><div dir="ltr">{sessionHoursAt(session,target??now).split(' · ').map(period=><bdi key={period}>{period}</bdi>)}</div></div>
    <div className="tv-timeline-state"><strong>{obsText(language,state.open?'closesIn':'opensIn')}</strong><TvSessionCountdown remaining={state.remaining} language={language}/></div>
    <footer><div><small>{t(state.open?'close':'next')} · {t('kuwait')}</small><time className="tv-session-target" dir="ltr" dateTime={target?new Date(target).toISOString():undefined}>{target?targetClock.format(target):'—'}</time></div><button onClick={()=>{focusAfter.current='session-source-back';setSource(session.id);}} aria-label={`${session.names[sessionNameIndex(language)]} · ${t('source')}`} data-tv-focus-key={`session:${session.id}`}><QrCode aria-hidden="true"/></button></footer>
   </article>;
  })}</div>:<div className="tv-world-empty"><Clock3 aria-hidden="true"/><p>{t('empty')}</p><button onClick={()=>setEditing(true)}>{t('choose')}</button></div>}
  <nav className="tv-world-pages" aria-label={t('title')}><button disabled={pages<2} onClick={()=>setPage((current+pages-1)%pages)} aria-label={tvText(language,'previous')} data-tv-focus-key="sessions-previous"><ChevronLeft aria-hidden="true"/></button><bdi>{current+1} / {pages}</bdi><button disabled={pages<2} onClick={()=>setPage((current+1)%pages)} aria-label={tvText(language,'next')} data-tv-focus-key="sessions-next"><ChevronRight aria-hidden="true"/></button></nav>
  </>}
  <div className="tv-sessions-note"><p>{t('note')}</p><small>{tvText(language,'hoursVerified')}: <bdi>{TV_HOURS_VERIFIED}</bdi></small></div>
 </section>;
}
