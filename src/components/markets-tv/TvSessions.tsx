'use client';
import { lazy, Suspense } from 'react';
import { Clock3 } from 'lucide-react';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';
import { sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import type { TvSession } from '@/lib/markets-tv/sessionTypes';
import { useTvSessionClock } from './TvSessionCountdown';
import { TvCompactCountdown } from './TvCompactCountdown';
import { useTvBroadcastPage, useTvPanelCount } from './useTvBroadcastPage';
import { TvBroadcastPager } from './TvBroadcastPager';
const WorldNow=lazy(()=>import('./TvWorldSessionsNow'));
export function TvSessionsNow({language,now,selected}:{language:TvLanguage;now:number;selected?:string[]}){
 return selected?<Suspense fallback={<p>{tvText(language,'loading')}</p>}><WorldNow language={language} now={now} selected={selected}/></Suspense>:<TvSessionsNowPanel language={language} now={now} sessions={TV_SESSIONS}/>;
}
export function TvSessionsNowPanel({language,now:initial,sessions}:{language:TvLanguage;now:number;sessions:readonly TvSession[]}){
 const now=useTvSessionClock(initial),{ref,count}=useTvPanelCount(3,2.7,3.3),pages=Math.max(1,Math.ceil(sessions.length/count));
 const {current,move}=useTvBroadcastPage(pages,true,sessions.map(s=>s.id).join(','));
 return <section ref={ref} className="tv-now-panel"><header className="tv-broadcast-heading"><h2><Clock3 aria-hidden="true"/>{obsText(language,'sessionsNow')} <bdi>{sessions.length}</bdi></h2><TvBroadcastPager page={current} pages={pages} language={language} move={move}/></header>
 <div className="tv-now-items">{sessions.slice(current*count,(current+1)*count).map(session=>{const state=sessionTimeline(session,now);return <div className="tv-now-row" key={session.id} data-open={state.open}><span><i aria-hidden="true"/>{session.names[language==='ar'?0:language==='fr'?2:1]}</span><div className="tv-now-count"><small>{obsText(language,state.open?'closesIn':'opensIn')}</small><TvCompactCountdown remaining={state.remaining} language={language}/></div></div>;})}</div>
 </section>;
}
