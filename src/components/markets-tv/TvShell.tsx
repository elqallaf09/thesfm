'use client';
/* eslint-disable @next/next/no-img-element -- Shared with offline packaged TV clients without the Next image runtime. */
import { memo, useEffect, useState, type ReactNode } from 'react';
import { Maximize, Minimize, Monitor, Globe2, Rows3, Settings2, Smartphone, RefreshCw } from 'lucide-react';
import { tvText, tvTime } from '@/lib/markets-tv/i18n';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';
import type { TvDisplayMode, TvLanguage } from '@/lib/markets-tv/types';

/** Ticks on its own so the rest of the screen does not rerender every second. */
function useTick(ms: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

const clockFormats = new Map<string, Intl.DateTimeFormat>();
function clockFormat(key: string, locale: string, options: Intl.DateTimeFormatOptions) {
  if (!clockFormats.has(key)) clockFormats.set(key, new Intl.DateTimeFormat(locale, options));
  return clockFormats.get(key)!;
}

export const TvClock = memo(function TvClock({ language, seconds = false }: { language: TvLanguage; seconds?: boolean }) {
  const now = useTick(seconds ? 1000 : 10_000);
  const time = now ? clockFormat(`time:${seconds}`, 'en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...(seconds ? { second: '2-digit' } : {}) }).format(now) : '—';
  const date = now ? clockFormat(`date:${language}`, `${language}-u-nu-latn`, { timeZone: 'Asia/Kuwait', weekday: 'long', day: 'numeric', month: 'long' }).format(now) : '';
  return <div className="tv-topbar-clock" role="timer" aria-live="off">
    <strong dir="ltr">{time}</strong>
    <small>{tvSceneText(language, 'kuwaitTime')}{date && <> · <bdi>{date}</bdi></>}</small>
  </div>;
});

const MODES: { mode: TvDisplayMode; key: 'modeViewing' | 'modeBrowse' | 'modeStrips'; icon: typeof Monitor }[] = [
  { mode: 'viewing', key: 'modeViewing', icon: Monitor },
  { mode: 'browse', key: 'modeBrowse', icon: Globe2 },
  { mode: 'strips', key: 'modeStrips', icon: Rows3 },
];

type TopBarProps = {
  language: TvLanguage; mode: TvDisplayMode; logo: string; linked: boolean; fullscreen: boolean;
  controlsHidden: boolean; seconds?: boolean; extra?: ReactNode;
  onMode: (mode: TvDisplayMode) => void; onPair: () => void; onSettings: () => void; onFullscreen: () => void; onWake: () => void;
};

/** One frame for viewing, browse and strips: same brand, clock and actions. */
export function TvTopBar({ language, mode, logo, linked, fullscreen, controlsHidden, seconds, extra, onMode, onPair, onSettings, onFullscreen, onWake }: TopBarProps) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <header className="tv-topbar" data-controls-hidden={controlsHidden}>
    <div className="tv-topbar-brand">
      <img src={logo} alt="THE SFM" width="48" height="48"/>
      <div><strong dir="ltr">THE SFM</strong><span dir="ltr">MARKETS TV</span></div>
    </div>
    <TvClock language={language} seconds={seconds}/>
    <div className="tv-topbar-actions" hidden={controlsHidden}>
      <div className="tv-mode-switch" role="group" aria-label={tvSceneText(language, 'displayMode')}>
        {MODES.map(({ mode: value, key, icon: Icon }) => <button key={value} aria-pressed={mode === value} onClick={() => onMode(value)} data-tv-focus-key={`mode:${value}`}>
          <Icon aria-hidden="true"/><span>{tvSceneText(language, key)}</span>
        </button>)}
      </div>
      {extra}
      <button onClick={onPair} aria-label={t(linked ? 'paired' : 'pair')} data-tv-focus-key="pair" data-linked={linked}><Smartphone aria-hidden="true"/><span>{t(linked ? 'paired' : 'pair')}</span></button>
      <button onClick={onSettings} aria-label={t('settings')} data-tv-focus-key="settings"><Settings2 aria-hidden="true"/><span>{t('settings')}</span></button>
      <button onClick={onFullscreen} aria-label={t(fullscreen ? 'exitFullscreen' : 'fullscreen')} data-tv-focus-key="fullscreen">{fullscreen ? <Minimize aria-hidden="true"/> : <Maximize aria-hidden="true"/>}</button>
    </div>
    {controlsHidden && <button className="tv-topbar-wake" onClick={onWake} aria-label={t('showControls')}><Settings2 aria-hidden="true"/></button>}
  </header>;
}

type StatusBarProps = {
  language: TvLanguage; online: boolean; updatedAt?: string | null;
  onSessions?: () => void; onChannels: () => void; onRefresh: () => void;
};

export function TvStatusBar({ language, online, updatedAt, onSessions, onChannels, onRefresh }: StatusBarProps) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <footer className="tv-statusbar">
    <span className="tv-statusbar-help">{t('remoteHelp')}</span>
    <div className="tv-statusbar-actions">
      {onSessions && <button onClick={onSessions}>{t('sessions')}</button>}
      <button onClick={onChannels}>{t('channels')}</button>
    </div>
    <span className="tv-statusbar-state">
      <i data-online={online} aria-hidden="true"/>{t(online ? 'connected' : 'offline')}
      {updatedAt && <> · {tvSceneText(language, 'lastUpdate')} <bdi dir="ltr">{tvTime(updatedAt, language)}</bdi></>}
    </span>
    <button className="tv-statusbar-refresh" onClick={onRefresh} aria-label={tvSceneText(language, 'update')}><RefreshCw aria-hidden="true"/></button>
  </footer>;
}

/** Local time and published regular hours. Deliberately makes no open/closed
 * claim: holidays and exceptional closures need an exchange calendar feed. */
export const TvMarketClocks = memo(function TvMarketClocks({ language }: { language: TvLanguage }) {
  const now = useTick(30_000);
  const index = language === 'ar' ? 0 : language === 'fr' ? 2 : 1;
  return <section className="tv-scene-clocks" aria-labelledby="tv-scene-clocks-title">
    <h2 id="tv-scene-clocks-title">{tvSceneText(language, 'marketClocks')}</h2>
    <ul>{TV_SESSIONS.map(session => <li key={session.id}>
      <span>{session.names[index]}</span>
      <strong dir="ltr">{now ? clockFormat(`zone:${session.zone}`, 'en-GB', { timeZone: session.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now) : '—'}</strong>
      <small><bdi dir="ltr">{session.hours}</bdi> · {tvText(language, session.days)}</small>
    </li>)}</ul>
  </section>;
});
