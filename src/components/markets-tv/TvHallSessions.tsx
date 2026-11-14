'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
import { DEFAULT_TV_SESSION_IDS } from '@/lib/markets-tv/sessionSelection';
import { sessionTimeline } from '@/lib/markets-tv/sessionTimeline';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { useTvSessionClock } from './TvSessionCountdown';
import { TvCompactCountdown } from './TvCompactCountdown';
import { TvMarketFlag } from './TvMarketFlag';
import { useTvBroadcastPage, useTvPanelCount } from './useTvBroadcastPage';

export function TvHallSessions({ language, now: initial, selected, paused }: { language: TvLanguage; now: number; selected?: string[]; paused: boolean }) {
  const now = useTvSessionClock(initial), [focused, setFocused] = useState(false);
  const ids = selected ?? DEFAULT_TV_SESSION_IDS;
  const sessions = TV_WORLD_SESSIONS.filter(session => ids.includes(session.id));
  const { ref, count } = useTvPanelCount(5, 4.2, 5);
  const pages = Math.max(1, Math.ceil(sessions.length / count));
  const { current, move } = useTvBroadcastPage(pages, !paused && !focused, ids.join(','));
  return <aside className="tv-hall-sessions" ref={ref} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <header><h2>{hallText(language, 'sessions')}</h2><small>{hallText(language, 'scheduled')}</small></header>
    <div className="tv-hall-session-list">{sessions.slice(current * count, (current + 1) * count).map(session => {
      const state = sessionTimeline(session, now);
      return <div className="tv-hall-session" key={session.id} data-open={state.open}>
        <div><TvMarketFlag region={session.region}/><strong>{session.names[language === 'ar' ? 0 : language === 'fr' ? 2 : 1]}</strong></div>
        <small><i/>{hallText(language, state.open ? 'open' : 'closed')}</small>
        <div className="tv-hall-countdown"><span>{hallText(language, state.open ? 'closes' : 'opens')}</span><TvCompactCountdown remaining={state.remaining} language={language}/></div>
      </div>;
    })}</div>
    <footer><button disabled={pages < 2} aria-label={tvText(language, 'previous')} onClick={() => move((current + pages - 1) % pages)}><ChevronLeft/></button><bdi>{current + 1} / {pages}</bdi><button disabled={pages < 2} aria-label={tvText(language, 'next')} onClick={() => move((current + 1) % pages)}><ChevronRight/></button></footer>
  </aside>;
}
