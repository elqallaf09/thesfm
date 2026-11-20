'use client';
import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { hallText } from '@/lib/markets-tv/hallText';

/** Keep the one-second countdown out of the quote table's render path. */
export function TvStockRotation({ language, playing, blocked, status, cycle, seconds, onToggle, onNext }: {
  language: TvLanguage; playing: boolean; blocked: boolean; status: string;
  cycle: string; seconds: number; onToggle: () => void; onNext: () => void;
}) {
  const [available, setAvailable] = useState(true);
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const update = () => setAvailable(!document.hidden && navigator.onLine !== false);
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const running = playing && !blocked && available;
  useEffect(() => {
    setRemaining(seconds);
    if (!running) return;
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      // Recheck at the boundary as visibility/network events can arrive late.
      if (document.hidden || navigator.onLine === false) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) { clearInterval(timer); onNext(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, cycle, seconds, onNext]);
  const label = running ? hallText(language, 'stocksNextIn').replace('{seconds}', String(remaining))
    : !playing ? hallText(language, 'stocksPaused')
      : !available ? hallText(language, 'stocksWaiting') : status;
  return <div className="tv-stock-rotation" data-running={running}>
    <button type="button" data-tv-focus-key="stocks-playback" aria-pressed={playing}
      aria-label={hallText(language, playing ? 'pauseStocks' : 'resumeStocks')} onClick={onToggle}>
      {playing ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}
      <span>{hallText(language, playing ? 'pauseStocks' : 'resumeStocks')}</span>
    </button>
    <div className="tv-stock-timing">
      <span className="tv-stock-countdown" aria-live="off">{label}</span>
      <div className="tv-stock-progress" aria-hidden="true"><span style={{ transform: `scaleX(${running ? remaining / seconds : 0})` }}/></div>
    </div>
  </div>;
}
