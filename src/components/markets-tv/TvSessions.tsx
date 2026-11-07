'use client';
import { lazy, Suspense, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';
import { sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvPagination } from '@/lib/markets-tv/pagination';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvSession } from '@/lib/markets-tv/sessionTypes';
import { TvSessionCountdown, useTvSessionClock } from './TvSessionCountdown';
const WorldNow=lazy(()=>import('./TvWorldSessionsNow'));
export function TvSessionsNow({language,now,selected}:{language:TvLanguage;now:number;selected?:string[]}){
 return selected?<Suspense fallback={<p>{tvText(language,'loading')}</p>}><WorldNow language={language} now={now} selected={selected}/></Suspense>:<TvSessionsNowPanel language={language} now={now} sessions={TV_SESSIONS}/>;
}
export function TvSessionsNowPanel({language,now:initial,sessions}:{language:TvLanguage;now:number;sessions:readonly TvSession[]}) {
 const now=useTvSessionClock(initial),[page,setPage]=useState(0);
 const {current,pages,count}=tvPagination(sessions.length,5,page);
 return <section className="tv-now-panel"><h2><Clock3 aria-hidden="true"/>{obsText(language,'sessionsNow')} <bdi>{sessions.length}</bdi></h2>
  {sessions.slice(current*count,(current+1)*count).map(session=>{const state=sessionTimeline(session,now);return <div className="tv-now-row" key={session.id} data-open={state.open}>
   <span><i aria-hidden="true"/>{session.names[language==='ar'?0:language==='fr'?2:1]}</span><small>{obsText(language,state.open?'closesIn':'opensIn')}</small><TvSessionCountdown remaining={state.remaining} language={language}/>
  </div>;})}
  {pages>1&&<nav className="tv-now-pages"><button onClick={()=>setPage((current+pages-1)%pages)} aria-label={tvText(language,'previous')}><ChevronLeft aria-hidden="true"/></button><bdi>{current+1}/{pages}</bdi><button onClick={()=>setPage((current+1)%pages)} aria-label={tvText(language,'next')}><ChevronRight aria-hidden="true"/></button></nav>}
  {!sessions.length&&<p>{tvText(language,'sessions')}</p>}<p>{obsText(language,'scheduleNote')}</p>
 </section>;
}
