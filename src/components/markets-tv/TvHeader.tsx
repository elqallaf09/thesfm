'use client';
/* eslint-disable @next/next/no-img-element -- Shared with offline packaged TV clients. */
import { memo, useEffect, useMemo, useState } from 'react';
import { Globe2, Maximize, Monitor, Pause, Play, RefreshCw, Rows3, Settings2, SlidersHorizontal, Smartphone } from 'lucide-react';
import { hallText } from '@/lib/markets-tv/hallText';
import { TV_WELCOME_EVENT, welcomeText } from '@/lib/markets-tv/welcome';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TV_DISPLAY_PATHS } from '@/lib/markets-tv/display-navigation';
import type { TvDisplayMode, TvLanguage } from '@/lib/markets-tv/types';

// Clock updates stay inside this leaf; quote cards never subscribe to its timer.
export const TvClock = memo(function TvClock({ language }: { language: TvLanguage }) {
  const [instant, setInstant] = useState(0);
  const formats = useMemo(() => ({
    clock: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    date: new Intl.DateTimeFormat(`${language}-u-nu-latn`, { timeZone: 'Asia/Kuwait', weekday: 'short', day: 'numeric', month: 'short' }),
  }), [language]);
  useEffect(() => {
    const update = () => { if (!document.hidden) setInstant(Date.now()); };
    update();
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div className="tv-unified-clock"><strong dir="ltr">{instant ? formats.clock.format(instant) : '—'}</strong>
    <small>{tvSceneText(language, 'kuwaitTime')}<span>{instant ? formats.date.format(instant) : '—'}</span></small></div>;
});

type Props = {
  language: TvLanguage; mode: TvDisplayMode; ready: boolean; paired: boolean; fullscreen: boolean;
  hidden: boolean; paused: boolean; wake: () => void; changeMode: (mode: TvDisplayMode) => void;
  pair: () => void; settings: () => void; customize: () => void; channels: () => void;
  toggleFullscreen: () => void; togglePause: () => void; refresh: () => void;
};
export function TvHeader({ language, mode, ready, paired, fullscreen, hidden, paused, wake, changeMode, pair, settings, customize, channels, toggleFullscreen, togglePause, refresh }: Props) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <header className="tv-unified-header" data-controls-hidden={hidden}>
    <div className="tv-unified-brand"><button className="tv-intro-replay" aria-label={welcomeText(language).replay} title={welcomeText(language).replay} onClick={() => window.dispatchEvent(new Event(TV_WELCOME_EVENT))}><img src={ready && tvOrigin() !== window.location.origin ? './markets-tv/sfm-logo.png' : '/brand/sfm-original-logo.png'} alt="THE SFM" width="48" height="48"/></button><div><strong dir="ltr">THE SFM</strong><span dir="ltr">MARKETS TV</span></div></div>
    <TvClock language={language}/>
    <div className="tv-header-actions" hidden={hidden}>
      <nav className="tv-mode-switch" aria-label={t('dashboard')}>
        {(['viewing', 'browse', 'strips'] as const).map(value => {
          const label = value === 'strips' ? t('stripsOnly') : hallText(language, value === 'browse' ? 'allStocks' : 'hall');
          return <a key={value} className={`tv-display-link tv-mode-${value}`} href={TV_DISPLAY_PATHS[value]} aria-label={label} aria-current={mode === value ? 'page' : undefined} data-tv-focus-key={value} onClick={event => {
            if (tvOrigin() === window.location.origin && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
            event.preventDefault();
            changeMode(value);
          }}>{value === 'viewing' ? <Monitor aria-hidden="true"/> : value === 'browse' ? <Globe2 aria-hidden="true"/> : <Rows3 aria-hidden="true"/>}<span>{label}</span></a>;
        })}
      </nav>
      <button onClick={channels} aria-label={t('channels')} data-tv-focus-key="channels"><Rows3 aria-hidden="true"/></button>
      <button className="tv-customize-button" onClick={customize} aria-label={t('customizeMarkets')} data-tv-focus-key="customize"><SlidersHorizontal aria-hidden="true"/></button>
      <button onClick={pair} aria-label={t(paired ? 'paired' : 'pair')} data-tv-focus-key="pair"><Smartphone aria-hidden="true"/></button>
      <button className="tv-tweaks-button" onClick={settings} aria-label={t('settings')} data-tv-focus-key="settings"><Settings2 aria-hidden="true"/><span>{obsText(language,'tweaks')}</span></button>
      <button onClick={toggleFullscreen} aria-label={t(fullscreen ? 'exitFullscreen' : 'fullscreen')} data-tv-focus-key="fullscreen"><Maximize aria-hidden="true"/></button>
      {mode === 'strips' && <><button onClick={togglePause} aria-label={t(paused ? 'resumeStrips' : 'pauseStrips')} aria-pressed={paused}>{paused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}</button><button onClick={refresh} aria-label={t('refresh')}><RefreshCw aria-hidden="true"/></button></>}
    </div>
    {hidden && <button onClick={wake} aria-label={t('showControls')}><Settings2 aria-hidden="true"/></button>}
  </header>;
}
