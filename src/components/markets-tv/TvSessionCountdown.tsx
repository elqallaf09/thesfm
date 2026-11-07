'use client';
import { useEffect, useState } from 'react';
import { countdownParts } from '@/lib/markets-tv/sessionTimeline';
import { obsText } from '@/lib/markets-tv/obsidian';
import type { TvLanguage } from '@/lib/markets-tv/types';

/** Only the mounted sessions panel ticks; quote tables keep their slower clock. */
export function useTvSessionClock(initial: number, enabled = true) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [enabled]);
  return now;
}

export function TvSessionCountdown({ remaining, language }: { remaining: number | null; language: TvLanguage }) {
  const parts = countdownParts(remaining);
  return <span className="tv-session-countdown" role="timer" aria-live="off" dir="ltr">
    {parts ? (['days', 'hours', 'minutes', 'seconds'] as const).map(unit => <span key={unit}>
      <bdi>{String(parts[unit]).padStart(2, '0')}</bdi><small>{obsText(language, unit)}</small>
    </span>) : <bdi>—</bdi>}
  </span>;
}
