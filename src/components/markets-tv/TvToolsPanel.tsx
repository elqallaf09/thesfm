'use client';

import { ArrowLeft, ArrowRight, Maximize, Pause, Play, RefreshCw } from 'lucide-react';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { tvMenuText } from './TvSideMenu';
import './menu-controls.css';

type Props = {
  language: TvLanguage; fullscreen: boolean; online: boolean; tickerPaused: boolean; playing: boolean;
  tickerControls: boolean; rotation: 'markets' | 'pages' | 'allocation' | null;
  onFullscreen: () => void; onRefresh: () => void; onTicker: () => void; onPlayback: () => void;
  onPrevious: () => void; onNext: () => void;
};

export function TvToolsPanel({ language, fullscreen, online, tickerPaused, playing, tickerControls, rotation, onFullscreen, onRefresh, onTicker, onPlayback, onPrevious, onNext }: Props) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(language, key);
  const Previous = language === 'ar' ? ArrowRight : ArrowLeft;
  const Next = language === 'ar' ? ArrowLeft : ArrowRight;
  const rotationLabel = rotation === 'allocation' ? t(playing ? 'pauseAllocationPages' : 'resumeAllocationPages')
    : rotation === 'pages' ? t(playing ? 'pausePages' : 'resumePages') : `${t(playing ? 'pause' : 'resume')} · ${t('autoRotate')}`;
  return <div id="tv-tools-dialog" className="tv-tools-panel">
    <div className="tv-tools-grid" data-tv-focus-grid>
      <button data-tv-focus-key="fullscreen" onClick={onFullscreen}><Maximize aria-hidden="true"/><span>{t(fullscreen ? 'exitFullscreen' : 'fullscreen')}</span></button>
      <button data-tv-focus-key="refresh" onClick={onRefresh}><RefreshCw aria-hidden="true"/><span>{t('refresh')}</span></button>
      {tickerControls && <button data-tv-focus-key="ticker-playback" aria-pressed={tickerPaused} onClick={onTicker}>{tickerPaused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}<span>{t(tickerPaused ? 'resumeStrips' : 'pauseStrips')}</span></button>}
      {rotation && <button data-tv-focus-key="scene-playback" aria-pressed={playing} onClick={onPlayback}>{playing ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}<span>{rotationLabel}</span></button>}
      {rotation === 'markets' && <>
        <button data-tv-focus-key="scene-previous" onClick={onPrevious}><Previous aria-hidden="true"/><span>{s('previousScene')}</span></button>
        <button data-tv-focus-key="scene-next" onClick={onNext}><Next aria-hidden="true"/><span>{s('nextScene')}</span></button>
      </>}
    </div>
    <p className="tv-muted">{t('remoteHelp')}</p>
    <p className="tv-muted" role="status">{t(online ? 'connected' : 'offline')}</p>
  </div>;
}

export function TvSignOutPanel({ language, deviceName, busy, error, onConfirm, onCancel }: {
  language: TvLanguage; deviceName?: string; busy: boolean; error: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <div className="tv-pair-content tv-sign-out">
    {deviceName && <p><bdi>{deviceName}</bdi></p>}
    <p>{t('confirmDisconnect')}</p>
    {error && <p role="alert">{t('error')}</p>}
    <div className="tv-sign-out-actions" data-tv-focus-row>
      <button data-tv-focus-key="sign-out-cancel" data-tv-initial-focus disabled={busy} onClick={onCancel}>{t('cancel')}</button>
      <button data-tv-focus-key="sign-out-confirm" disabled={busy} onClick={onConfirm}>{busy ? t('loading') : tvMenuText(language, 'signOut')}</button>
    </div>
  </div>;
}
