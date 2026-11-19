'use client';

import { ArrowLeft, ArrowRight, Coins, Globe2, Landmark, Maximize, Newspaper, Pause, Play, RefreshCw, RotateCcw, Smartphone } from 'lucide-react';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvScene } from '@/lib/markets-tv/types';
import { welcomeText } from '@/lib/markets-tv/welcome';
import { tvMenuText } from './TvSideMenu';
import './menu-controls.css';

type Props = {
  language: TvLanguage; fullscreen: boolean; online: boolean; tickerPaused: boolean; playing: boolean; sceneControls: boolean;
  onScene: (scene: TvScene) => void; onFeature: (view: 'brief' | 'map') => void;
  onFullscreen: () => void; onRefresh: () => void; onTicker: () => void; onPlayback: () => void;
  onPrevious: () => void; onNext: () => void; onReplay: () => void; onWorldStocks: () => void;
};

export function TvToolsPanel({ language, fullscreen, online, tickerPaused, playing, sceneControls, onScene, onFeature, onFullscreen, onRefresh, onTicker, onPlayback, onPrevious, onNext, onReplay, onWorldStocks }: Props) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(language, key);
  const Previous = language === 'ar' ? ArrowRight : ArrowLeft;
  const Next = language === 'ar' ? ArrowLeft : ArrowRight;
  return <div id="tv-tools-dialog" className="tv-tools-panel">
    <div className="tv-tools-grid" data-tv-focus-grid>
      <button data-tv-focus-key="gulf" onClick={() => onScene('gulf')}><Landmark aria-hidden="true"/><span>{s('gulf')}</span></button>
      <button data-tv-focus-key="assets" onClick={() => onScene('assets')}><Coins aria-hidden="true"/><span>{s('assets')}</span></button>
      <button data-tv-focus-key="brief" onClick={() => onFeature('brief')}><Newspaper aria-hidden="true"/><span>{t('brief')}</span></button>
      <button data-tv-focus-key="map" onClick={() => onFeature('map')}><Globe2 aria-hidden="true"/><span>{t('map')}</span></button>
      <button data-tv-focus-key="fullscreen" onClick={onFullscreen}><Maximize aria-hidden="true"/><span>{t(fullscreen ? 'exitFullscreen' : 'fullscreen')}</span></button>
      <button data-tv-focus-key="refresh" onClick={onRefresh}><RefreshCw aria-hidden="true"/><span>{t('refresh')}</span></button>
      <button data-tv-focus-key="ticker-playback" aria-pressed={tickerPaused} onClick={onTicker}>{tickerPaused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}<span>{t(tickerPaused ? 'resumeStrips' : 'pauseStrips')}</span></button>
      <button data-tv-focus-key="scene-playback" aria-pressed={playing} onClick={onPlayback}>{playing ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}<span>{t(playing ? 'pause' : 'resume')} · {t('autoRotate')}</span></button>
      {sceneControls && <>
        <button data-tv-focus-key="scene-previous" onClick={onPrevious}><Previous aria-hidden="true"/><span>{s('previousScene')}</span></button>
        <button data-tv-focus-key="scene-next" onClick={onNext}><Next aria-hidden="true"/><span>{s('nextScene')}</span></button>
      </>}
      <button data-tv-focus-key="replay-intro" onClick={onReplay}><RotateCcw aria-hidden="true"/><span>{welcomeText(language).replay}</span></button>
      <button data-tv-focus-key="world-stocks-phone" onClick={onWorldStocks}><Smartphone aria-hidden="true"/><span>{t('worldStocks')} · {t('openPhone')}</span></button>
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
