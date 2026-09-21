'use client';
import { useState } from 'react';
import { TV_HOURS_VERIFIED, TV_SESSIONS } from '@/lib/markets-tv/sessions';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { TvQr } from './TvQr';
export function TvSessions({ language, now }: { language: TvLanguage; now: number }) {
  const [source, setSource] = useState<string | null>(null);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <section className="tv-sessions" aria-label={t('sessions')}>
    {TV_SESSIONS.map(session => <article className="tv-session" key={session.id}>
      <header><h2>{session.names[language === 'ar' ? 0 : language === 'fr' ? 2 : 1]}</h2><time dir="ltr">{now ? new Intl.DateTimeFormat('en-GB', { timeZone: session.zone, hour: '2-digit', minute: '2-digit' }).format(now) : '—'}</time></header>
      <p dir="ltr">{session.hours}</p><small>{t(session.days)} · {t('localTime')}</small>
      <small>{session.source} · {t('hoursVerified')}: {TV_HOURS_VERIFIED}</small>
      <button onClick={() => setSource(source === session.url ? null : session.url)} aria-expanded={source === session.url}>{t('officialSchedule')}</button>
      {source === session.url && <TvQr value={session.url} label={t('officialSchedule')}/>}
    </article>)}
    <p className="tv-sessions-note">{t('hoursNote')}</p>
  </section>;
}
