'use client';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3, QrCode } from 'lucide-react';
import { TV_HOURS_VERIFIED, TV_SESSIONS } from '@/lib/markets-tv/sessions';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TvQr } from './TvQr';
export function TvSessions({ language, now }: { language: TvLanguage; now: number }) {
  const [source, setSource] = useState<string | null>(null);
  const qr = useRef<HTMLDivElement>(null);
  useEffect(() => { qr.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [source]);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <section className="tv-sessions" aria-label={t('sessions')}>
    <div className="tv-sessions-intro"><span><Clock3 aria-hidden="true"/>{t('regularSessions')}</span><small>{t('localTime')}</small></div>
    {TV_SESSIONS.map(session => {
      const periods = session.hours.split(' · ');
      return <article className="tv-session" key={session.id} data-market={session.id}>
        <header><div className="tv-session-identity"><span className="tv-session-code" dir="ltr">{session.region}</span><div><h2>{session.names[language === 'ar' ? 0 : language === 'fr' ? 2 : 1]}</h2><small dir="auto">{session.source}</small></div></div>
          <div className="tv-session-clock"><time dir="ltr">{now ? new Intl.DateTimeFormat('en-GB', { timeZone: session.zone, hour: '2-digit', minute: '2-digit' }).format(now) : '—'}</time><small>{t('localTime')}</small></div>
        </header>
        <div className="tv-session-hours" dir="ltr">{periods.map(period => <strong key={period}>{period}</strong>)}</div>
        <div className="tv-session-timeline" dir="ltr" aria-hidden="true"><div className="tv-session-track">{periods.map(period => {
          const [start, end] = period.split('–').map(time => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; });
          return <span key={period} style={{ left: `${start / 14.4}%`, width: `${(end - start) / 14.4}%` }}/>;
        })}</div><div className="tv-session-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
        <footer><small><CalendarDays aria-hidden="true"/>{t(session.days)}</small><button onClick={() => setSource(source === session.url ? null : session.url)} aria-expanded={source === session.url} aria-controls={`tv-session-source-${session.id}`} data-tv-focus-key={`session:${session.id}`}><QrCode aria-hidden="true"/>{t('officialSchedule')}</button></footer>
        {source === session.url && <div ref={qr} id={`tv-session-source-${session.id}`} className="tv-session-qr"><TvQr size={180} value={session.url} label={`${session.source} · ${t('officialSchedule')}`}/><p>{t('scanSchedule')}</p></div>}
      </article>;
    })}
    <div className="tv-sessions-note"><p>{t('hoursNote')}</p><small>{t('hoursVerified')}: <bdi>{TV_HOURS_VERIFIED}</bdi></small></div>
  </section>;
}
