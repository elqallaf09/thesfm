'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, SlidersHorizontal } from 'lucide-react';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
import { TV_HOURS_VERIFIED } from '@/lib/markets-tv/sessions';
import { DEFAULT_TV_SESSION_IDS, normalizeTvSessionIds } from '@/lib/markets-tv/sessionSelection';
import { sessionHoursAt, sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { sessionNameIndex, sessionText } from '@/lib/markets-tv/sessionCopy';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvPagination } from '@/lib/markets-tv/pagination';
import { tvSessionPageSize } from '@/lib/markets-tv/broadcast';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TvQr } from './TvQr';
import { TvSessionPicker } from './TvSessionPicker';
import { TvSessionCountdown, useTvSessionClock } from './TvSessionCountdown';
import { TvCompactCountdown } from './TvCompactCountdown';
import { useTvBroadcastPage } from './useTvBroadcastPage';
import '@/app/tv/world-sessions.css';
export type TvWorldSessionsProps={language:TvLanguage;now:number;selected?:string[];onSelectionChange?:(ids:string[])=>void;autoRotate?:boolean;onAutoRotateChange?:(enabled:boolean)=>void};
const targetClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const clocks=new Map(TV_WORLD_SESSIONS.map(s=>[s.zone,new Intl.DateTimeFormat('en-GB',{timeZone:s.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})]));
export default function TvWorldSessions({language,now:initial,selected,onSelectionChange,autoRotate=true,onAutoRotateChange}:TvWorldSessionsProps){
 const root=useRef<HTMLElement>(null),focusAfter=useRef<string|null>(null);
 const [local,setLocal]=useState(DEFAULT_TV_SESSION_IDS),[editing,setEditing]=useState(false),[source,setSource]=useState<string|null>(null),[localPlaying,setLocalPlaying]=useState(true),[roomy,setRoomy]=useState(false);
 const now=useTvSessionClock(initial,!editing);
 const ids=useMemo(()=>normalizeTvSessionIds(selected??local)??DEFAULT_TV_SESSION_IDS,[selected,local]);
 const chosen=useMemo(()=>new Set(ids),[ids]);
 const sessions=TV_WORLD_SESSIONS.filter(s=>chosen.has(s.id));
 const size=tvSessionPageSize(sessions.length),pages=tvPagination(sessions.length,size,0).pages;
 const playing=onAutoRotateChange?autoRotate:localPlaying;
 const {current,move}=useTvBroadcastPage(pages,playing&&!editing&&!source,ids.join(','));
 const t=(key:Parameters<typeof sessionText>[1])=>sessionText(language,key);
 useEffect(()=>{const element=root.current;if(!element)return;const fit=()=>setRoomy(element.clientHeight>=620);fit();const observer=new ResizeObserver(fit);observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(focusAfter.current){root.current?.querySelector<HTMLButtonElement>(`[data-tv-focus-key="${focusAfter.current}"]`)?.focus();focusAfter.current=null;}},[editing,source]);
 const change=(value:string[])=>{setLocal(value);onSelectionChange?.(value);move(0);};
 const reference=TV_WORLD_SESSIONS.find(s=>s.id===source);
 const referenceState=reference?sessionTimeline(reference,now):null;
 const target=referenceState?.open?referenceState.closesAt:referenceState?.nextOpen;
 return <section ref={root} className="tv-sessions tv-world-sessions" data-roomy={roomy} data-playing={playing} aria-label={t('title')}>
  {editing?<TvSessionPicker sessions={TV_WORLD_SESSIONS} selected={ids} language={language} onChange={change} onDone={()=>{focusAfter.current='sessions-choose';setEditing(false);}}/>:reference&&referenceState?<div className="tv-world-source tv-session-qr"><div><h2>{reference.names[sessionNameIndex(language)]}</h2><p>{t('hours')} · {t(reference.days)}</p><p dir="ltr">{sessionHoursAt(reference,target??now)}</p><p>{t(referenceState.open?'close':'next')} · {t('kuwait')} <bdi>{target?targetClock.format(target):'—'}</bdi></p><TvSessionCountdown remaining={referenceState.remaining} language={language}/><p>{reference.source}</p><button onClick={()=>{focusAfter.current=`session:${reference.id}`;setSource(null);}} data-tv-focus-key="session-source-back">{t('back')}</button></div><TvQr size={220} value={reference.url} label={t('source')}/></div>:<>
  <header className="tv-world-heading"><div><h2><Clock3 aria-hidden="true"/>{t('title')}</h2><p>{t('selected')}: <bdi>{ids.length}/{TV_WORLD_SESSIONS.length}</bdi> · {t('arbitrary')}</p><small>{t('legend')}</small></div><button onClick={()=>{focusAfter.current='sessions-done';setEditing(true);}} data-tv-focus-key="sessions-choose"><SlidersHorizontal aria-hidden="true"/>{t('choose')}</button></header>
  {sessions.length?<div className="tv-world-grid" style={{'--tv-session-rows':Math.ceil(Math.min(size,sessions.length)/4)} as CSSProperties}>{sessions.slice(current*size,(current+1)*size).map(session=>{
   const state=sessionTimeline(session,now),next=state.open?state.closesAt:state.nextOpen,name=session.names[sessionNameIndex(language)];
   return <article className="tv-session tv-session-compact" key={session.id} data-market={session.id} data-open={state.open}>
    <header><button onClick={()=>{focusAfter.current='session-source-back';setSource(session.id);}} aria-label={`${name} · ${t('details')}`} data-tv-focus-key={`session:${session.id}`}><span className="tv-session-code" dir="ltr">{session.region}</span><h2>{name}</h2><i className="tv-world-dot" aria-label={t(state.open?'open':'closed')}/></button></header>
    <div className="tv-world-data"><span className="tv-world-local"><time dir="ltr">{now?clocks.get(session.zone)!.format(now):'—'}</time></span><span className="tv-world-count"><small>{t(state.open?'untilClose':'untilOpen')}</small><TvCompactCountdown remaining={state.remaining} language={language}/></span></div>
    {roomy&&<div className="tv-world-periods" dir="ltr">{sessionHoursAt(session,next??now).split(' · ').map(period=><bdi key={period}>{period}</bdi>)}</div>}
   </article>;
  })}</div>:<div className="tv-world-empty"><Clock3 aria-hidden="true"/><p>{t('empty')}</p><button onClick={()=>setEditing(true)}>{t('choose')}</button></div>}
  <nav className="tv-world-pages" aria-label={t('title')}><button disabled={pages<2} onClick={()=>move((current+pages-1)%pages)} aria-label={tvText(language,'previous')} data-tv-focus-key="sessions-previous"><ChevronLeft aria-hidden="true"/></button><bdi>{current+1} / {pages}</bdi><button disabled={pages<2} onClick={()=>move((current+1)%pages)} aria-label={tvText(language,'next')} data-tv-focus-key="sessions-next"><ChevronRight aria-hidden="true"/></button><button onClick={()=>{setLocalPlaying(!playing);onAutoRotateChange?.(!playing);}} aria-label={tvText(language,playing?'pause':'resume')} aria-pressed={playing} data-tv-focus-key="sessions-playback">{playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</button><small>{t('auto')}</small></nav>
  </>}
  <div className="tv-sessions-note"><p>{t('note')}</p><small>{tvText(language,'hoursVerified')}: <bdi>{TV_HOURS_VERIFIED}</bdi></small></div>
 </section>;
}
