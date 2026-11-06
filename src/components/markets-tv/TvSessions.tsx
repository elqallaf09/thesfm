'use client';
import { useEffect, useRef, useState } from 'react';
import { Clock3, QrCode } from 'lucide-react';
import { TV_HOURS_VERIFIED, TV_SESSIONS } from '@/lib/markets-tv/sessions';
import { durationClock, sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TvQr } from './TvQr';
const nameIndex = (language: TvLanguage) => language === 'ar' ? 0 : language === 'fr' ? 2 : 1;
export function TvSessionsNow({language,now}:{language:TvLanguage;now:number}) {
  return <section className="tv-now-panel"><h2><Clock3 aria-hidden="true"/>{obsText(language,'sessionsNow')}</h2>
    {TV_SESSIONS.map(session=> {const state=sessionTimeline(session,now);return <div className="tv-now-row" key={session.id} data-open={state.open}>
      <span><i aria-hidden="true"/>{session.names[nameIndex(language)]}</span><small>{obsText(language,state.open?'closesIn':'opensIn')} <bdi>{durationClock(state.remaining)}</bdi></small>
    </div>;})}<p>{obsText(language,'scheduleNote')}</p></section>;
}
export function TvSessions({ language, now }: { language: TvLanguage; now: number }) {
  const [source,setSource]=useState<string|null>(null);
  const qr=useRef<HTMLDivElement>(null);
  useEffect(()=>{qr.current?.scrollIntoView({block:'nearest'});},[source]);
  const t=(key:Parameters<typeof tvText>[1])=>tvText(language,key);
  const nowPercent=sessionTimeline(TV_SESSIONS[0],now).nowPercent;
  return <section className="tv-sessions tv-unified-sessions" aria-label={t('sessions')}>
    <div className="tv-sessions-intro"><span><Clock3 aria-hidden="true"/>{t('regularSessions')}</span><small>{obsText(language,'kuwait')}</small></div>
    <div className="tv-session-board">
      <div className="tv-timeline-axis" dir="ltr">{[0,3,6,9,12,15,18,21,24].map(hour=><span key={hour} style={{left:`${hour/24*100}%`}}>{String(hour).padStart(2,'0')}</span>)}</div>
      <div className="tv-timeline-now-area" dir="ltr" aria-hidden="true"><div className="tv-timeline-now" style={{left:`${nowPercent}%`}}><span>{obsText(language,'now')}</span></div></div>
      {TV_SESSIONS.map(session=>{const state=sessionTimeline(session,now); return <article className="tv-session" key={session.id} data-market={session.id} data-open={state.open}>
        <header><span className="tv-session-code" dir="ltr">{session.region}</span><div><h2>{session.names[nameIndex(language)]}</h2><small><time dir="ltr">{now?new Intl.DateTimeFormat('en-GB',{timeZone:session.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now):'—'}</time> · {t('localTime')}</small></div></header>
        <div className="tv-timeline-row" dir="ltr" aria-label={obsText(language,'kuwait')}>
          {state.bars.map(bar=><div className="tv-timeline-bar" key={bar.start} style={{left:`${bar.left}%`,width:`${bar.width}%`}}><span>{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(bar.start)}–{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(bar.end)}</span></div>)}
        </div>
        <div className="tv-timeline-state"><strong>{state.open?obsText(language,'scheduledOpen'):obsText(language,'opensIn')}</strong><bdi>{durationClock(state.remaining)}</bdi></div>
        <button className="tv-session-source-button" onClick={()=>setSource(source===session.url?null:session.url)} aria-label={`${session.names[nameIndex(language)]} · ${t('officialSchedule')}`} aria-expanded={source===session.url} data-tv-focus-key={`session:${session.id}`}><QrCode aria-hidden="true"/></button>
      </article>;})}
    </div>
    {source && <div ref={qr} className="tv-session-qr"><TvQr size={160} value={source} label={t('officialSchedule')}/><p>{t('scanSchedule')}</p></div>}
    <div className="tv-sessions-note"><p>{obsText(language,'scheduleNote')}</p><small>{t('hoursVerified')}: <bdi>{TV_HOURS_VERIFIED}</bdi></small></div>
  </section>;
}
