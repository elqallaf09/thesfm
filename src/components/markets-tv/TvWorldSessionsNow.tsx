'use client';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
import { TvSessionsNowPanel } from './TvSessions';
import '@/app/tv/world-sessions.css';
export default function TvWorldSessionsNow({language,now,selected}:{language:TvLanguage;now:number;selected:string[]}){
 const chosen=new Set(selected);
 return <TvSessionsNowPanel language={language} now={now} sessions={TV_WORLD_SESSIONS.filter(s=>chosen.has(s.id))}/>;
}
