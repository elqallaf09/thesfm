'use client';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Globe2, Maximize, Monitor, Pause, Play, RefreshCw, Rows3, Settings2, SlidersHorizontal, Smartphone, Tv, MoreHorizontal, X } from 'lucide-react';
import { hallText } from '@/lib/markets-tv/hallText';
import { TV_WELCOME_EVENT, welcomeText } from '@/lib/markets-tv/welcome';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvOrigin } from '@/lib/markets-tv/client';
import { TvBrandMark } from './TvBrandMark';
import { TV_DISPLAY_PATHS } from '@/lib/markets-tv/display-navigation';
import type { TvDisplayMode, TvLanguage } from '@/lib/markets-tv/types';
import './header-labels.css';

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
  language: TvLanguage; mode: TvDisplayMode; ready: boolean; paired: boolean; fullscreen: boolean; online: boolean;
  hidden: boolean; paused: boolean; wake: () => void; changeMode: (mode: TvDisplayMode) => void;
  pair: () => void; settings: () => void; customize: () => void; channels: () => void;
  sessions?: () => void;
  toggleFullscreen: () => void; togglePause: () => void; refresh: () => void;
};
const HEADER_COPY = {
  ar: { more: 'المزيد', controls: 'أدوات الشاشة' },
  en: { more: 'More', controls: 'Screen controls' },
  fr: { more: 'Plus', controls: 'Commandes de l’écran' },
} satisfies Record<TvLanguage, { more: string; controls: string }>;

export function TvHeader({ language, mode, ready, paired, fullscreen, online, hidden, paused, wake, changeMode, pair, settings, customize, channels, sessions, toggleFullscreen, togglePause, refresh }: Props) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const copy = HEADER_COPY[language];
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const moreDialog = useRef<HTMLElement>(null);
  const controlsHidden = hidden && !moreOpen;
  useEffect(() => {
    if (moreOpen) moreDialog.current?.querySelector<HTMLButtonElement>('[data-tv-initial-focus]')?.focus({ preventScroll: true });
  }, [moreOpen]);
  function closeMore() {
    setMoreOpen(false);
    wake();
    moreButton.current?.focus({ preventScroll: true });
  }
  function openGlobalDialog(open: () => void) {
    // The global dialog must remember a persistent header target, not a button
    // in this popup which disappears in the same React update.
    closeMore();
    open();
  }
  return <header className="tv-unified-header tv-labelled-header" data-controls-hidden={controlsHidden} data-tv-focus-row>
    <div className="tv-unified-brand"><button className="tv-intro-replay" aria-label={welcomeText(language).replay} title={welcomeText(language).replay} onClick={() => window.dispatchEvent(new Event(TV_WELCOME_EVENT))}><TvBrandMark packaged={ready && tvOrigin() !== window.location.origin}/></button><div><strong dir="ltr">THE SFM</strong><span dir="ltr">MARKETS TV</span></div></div>
    <TvClock language={language}/>
    <div className="tv-header-actions" hidden={controlsHidden}>
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
      <button onClick={channels} aria-label={t('channels')} data-tv-focus-key="channels"><Tv aria-hidden="true"/><span>{t('channels')}</span></button>
      <button className="tv-customize-button" onClick={customize} aria-label={t('customizeMarkets')} data-tv-focus-key="customize"><SlidersHorizontal aria-hidden="true"/><span>{t('customizeMarkets')}</span></button>
      <button ref={moreButton} className="tv-header-more" onClick={() => { wake(); setMoreOpen(true); }} aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls={moreOpen ? 'tv-header-more-dialog' : undefined} data-tv-focus-key="more"><MoreHorizontal aria-hidden="true"/><span>{copy.more}</span></button>
    </div>
    {controlsHidden && <button className="tv-header-wake" onClick={wake} aria-label={t('showControls')}><Settings2 aria-hidden="true"/><span>{t('showControls')}</span></button>}
    {moreOpen && <div className="tv-header-more-backdrop" onClick={event => { if (event.target === event.currentTarget) closeMore(); }}>
      <section ref={moreDialog} id="tv-header-more-dialog" className="tv-header-more-dialog" role="dialog" aria-modal="true" aria-labelledby="tv-header-more-title" data-tv-focus-scope>
        <header><h2 id="tv-header-more-title">{copy.controls}</h2><button className="tv-header-more-close" onClick={closeMore} data-tv-focus-key="more-close" data-tv-back><X aria-hidden="true"/><span>{t('close')}</span></button></header>
        <div className="tv-header-more-actions" data-tv-focus-grid>
          <button onClick={() => openGlobalDialog(pair)} aria-label={t(paired ? 'paired' : 'pair')} data-tv-focus-key="pair" data-tv-initial-focus><Smartphone aria-hidden="true"/><span>{t(paired ? 'paired' : 'pair')}</span></button>
          <button className="tv-tweaks-button" onClick={() => openGlobalDialog(settings)} aria-label={t('settings')} data-tv-focus-key="settings"><Settings2 aria-hidden="true"/><span>{t('settings')}</span></button>
          <button onClick={toggleFullscreen} aria-label={t(fullscreen ? 'exitFullscreen' : 'fullscreen')} data-tv-focus-key="fullscreen"><Maximize aria-hidden="true"/><span>{t(fullscreen ? 'exitFullscreen' : 'fullscreen')}</span></button>
          {mode !== 'strips' && sessions && <button onClick={() => openGlobalDialog(sessions)} aria-label={t('sessions')} data-tv-focus-key="sessions"><Clock3 aria-hidden="true"/><span>{t('sessions')}</span></button>}
          {mode === 'strips' && <button onClick={togglePause} aria-label={t(paused ? 'resumeStrips' : 'pauseStrips')} aria-pressed={paused} data-tv-focus-key="ticker-playback">{paused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}<span>{t(paused ? 'resumeStrips' : 'pauseStrips')}</span></button>}
          <button onClick={refresh} aria-label={t('refresh')} data-tv-focus-key="refresh"><RefreshCw aria-hidden="true"/><span>{t('refresh')}</span></button>
        </div>
        <p className="tv-muted">{t('remoteHelp')}</p>
        <p className="tv-muted" role="status">{t(online ? 'connected' : 'offline')}</p>
      </section>
    </div>}
  </header>;
}
