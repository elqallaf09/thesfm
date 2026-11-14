'use client';
/* eslint-disable @next/next/no-img-element -- Also rendered from offline APK assets. */
import { tvFetch, tvOrigin } from '@/lib/markets-tv/client';
import { tvPairErrorText, tvPairHttpError, validTvPair, type TvPairError } from '@/lib/markets-tv/pairing';
import { useEffect, useRef, useState } from 'react';
import { TV_GROUPS, TV_STRIP_SPEEDS, DEFAULT_TV_STRIP_SPEED, type TvDisplayMode, type TvGroup, type TvLanguage, type TvQuote, type TvSettings } from '@/lib/markets-tv/types';
import { tvQuotePrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { TV_MAP_POINTS } from '@/lib/markets-tv/catalog';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { TvQr } from './TvQr';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { useTvResource } from './useTvResource';
import { TV_SCENE_ORDER, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvAnalysisAssetType, tvAnalysisHref } from '@/lib/markets-tv/analysisLink';

export function TvSettingsPanel({ settings, change, stripsOnly = false, displayMode = 'viewing', changeDisplayMode, customize, channels }: { settings: TvSettings; change: (value: TvSettings) => void; stripsOnly?: boolean; displayMode?: TvDisplayMode; changeDisplayMode?: (mode: TvDisplayMode) => void; customize: () => void; channels: () => void }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const toggle = (key: 'autoRotate' | 'ticker' | 'sound') => change({ ...settings, [key]: !settings[key] });
  return <div className="tv-settings">
    <label className="tv-setting-row tv-language-setting"><span>{t('language')}</span><select value={settings.language} onChange={event => change({ ...settings, language: event.target.value as TvLanguage })}><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option></select></label>
    {changeDisplayMode && <div className="tv-setting-row"><span>{tvSceneText(settings.language, 'displayMode')}</span><div className="tv-segment">{(['viewing', 'browse', 'strips'] as const).map(mode => <button key={mode} aria-pressed={displayMode === mode} onClick={() => changeDisplayMode(mode)}>{tvSceneText(settings.language, mode)}</button>)}</div></div>}
    {displayMode === 'viewing' && <div className="tv-setting-row"><span>{tvSceneText(settings.language, 'chooseScene')}</span><div className="tv-segment">{TV_SCENE_ORDER.map(scene => <button key={scene} aria-pressed={(settings.scene || 'overview') === scene} onClick={() => change({ ...settings, scene })}>{tvSceneText(settings.language, scene)}</button>)}</div></div>}
    <div className="tv-setting-row"><span>{displayMode === 'viewing' ? tvSceneText(settings.language, 'browseCustomization') : t('displayInstruments')}</span><button onClick={customize}>{t('customizeMarkets')}</button></div>
    <div className="tv-setting-row"><span>{t('channels')}</span><button onClick={channels}>{t('channels')}</button></div>
    <div className="tv-setting-row"><span>{obsText(settings.language,'tweaks')}</span><div className="tv-segment tv-accent-options">{(['champagne','blue','green','purple'] as const).map(accent=><button key={accent} data-accent={accent} aria-pressed={(settings.accent||'champagne')===accent} onClick={()=>change({...settings,accent})}>{obsText(settings.language,accent)}</button>)}</div></div>
    <div className="tv-setting-row"><span>{t('theme')}</span><div className="tv-segment">{(['dark','light'] as const).map(theme => <button key={theme} aria-pressed={settings.theme === theme} onClick={() => change({ ...settings, theme })}>{t(theme)}</button>)}</div></div>
    {!stripsOnly && <>
    {displayMode === 'browse' && <div className="tv-setting-row"><span>{t('layout')}</span><div className="tv-segment">{(['balanced','quotes'] as const).map(layout => <button key={layout} aria-pressed={settings.layout === layout} onClick={() => change({ ...settings, layout })}>{t(layout)}</button>)}</div></div>}
    {(['autoRotate','ticker','sound'] as const).map(key => <div className="tv-setting-row" key={key}><span>{t(key)}</span><button role="switch" aria-checked={settings[key]} onClick={() => toggle(key)}>{t(settings[key] ? 'enabled' : 'disabled')}</button></div>)}
    <div className="tv-setting-row"><span>{t('rotationSeconds')}</span><div className="tv-segment">{[20,30,60,120].map(seconds => <button key={seconds} aria-pressed={settings.rotationSeconds === seconds} onClick={() => change({ ...settings, rotationSeconds: seconds })}>{seconds}</button>)}</div></div>
    </>}
    {displayMode !== 'viewing' && <><div className="tv-setting-row"><span>{t('stripDensity')}</span><div className="tv-segment">{(['comfortable','balanced','compact'] as const).map(density => <button key={density} aria-pressed={(settings.stripDensity || 'balanced') === density} onClick={() => change({ ...settings, stripDensity: density })}>{t(density === 'balanced' ? 'balancedDensity' : density)}</button>)}</div></div>
    <p className="tv-muted tv-setting-help">{t('pricedOnlyHelp')}</p></>}
    {displayMode !== 'browse' && <div className="tv-setting-row"><span>{t('autoHideControls')}</span><button role="switch" aria-label={t('autoHideControls')} aria-checked={Boolean(settings.autoHideControls)} onClick={() => change({ ...settings, autoHideControls: !settings.autoHideControls })}>{t(settings.autoHideControls ? 'enabled' : 'disabled')}</button></div>}
    <div className="tv-setting-row"><span>{t('stripSpeed')}</span><div className="tv-segment">{TV_STRIP_SPEEDS.map((speed,i) => <button key={speed} aria-pressed={(settings.stripSpeed || DEFAULT_TV_STRIP_SPEED) === speed} onClick={() => change({ ...settings, stripSpeed: speed })}>{t((['slow','normal','fast'] as const)[i])}</button>)}</div></div>
    <p className="tv-muted tv-setting-help">{t('refreshCadence')}</p>
    {displayMode !== 'viewing' && <><h3>{t('visibleMarkets')}</h3><div className="tv-group-options">{TV_GROUPS.map(group => <button key={group} aria-pressed={settings.groups.includes(group)} onClick={() => {
      const groups = settings.groups.includes(group) ? settings.groups.filter(g => g !== group) : [...settings.groups, group];
      if (groups.length) change({ ...settings, groups });
    }}>{t(group)}</button>)}</div></>}
    {!stripsOnly && <p className="tv-muted">{t('alertScope')}</p>}
  </div>;
}
export function TvPairPanel({ language, onLinked }: { language: TvLanguage; onLinked: (token: string) => void }) {
  const [pair, setPair] = useState<{ code: string; secret: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<TvPairError|null>(null), [expired, setExpired] = useState(false), [busy, setBusy] = useState(false);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const creation = useRef<AbortController | null>(null);
  useEffect(() => () => creation.current?.abort(), []);
  async function create() {
    creation.current?.abort();
    const controller = new AbortController(); creation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError(null); setExpired(false); setPair(null);
    try {
      const response = await tvFetch('/api/tv/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'The SFM TV' }), signal: controller.signal });
      if (!response.ok) { if (creation.current === controller) setError(tvPairHttpError(response.status)); return; }
      const payload = await response.json();
      if (!validTvPair(payload)) { setError('invalid'); return; }
      if (!controller.signal.aborted) setPair(payload);
    } catch { if (creation.current === controller) setError('network'); } finally { clearTimeout(timeout); if (creation.current === controller) { creation.current = null; setBusy(false); } }
  }
  useEffect(() => {
    if (!pair) return; let stopped = false; let timer: ReturnType<typeof setTimeout>; let pending = false;
    let controller: AbortController | null = null;
    async function poll() {
      if (stopped || pending) return;
      if (Date.now() >= Date.parse(pair!.expiresAt)) { setExpired(true); return; }
      if (document.hidden) { timer = setTimeout(() => void poll(), 5000); return; }
      pending = true; controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await tvFetch('/api/tv/pair', { headers: { 'x-sfm-tv-token': pair!.secret }, cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (stopped) return;
        if (response.ok && payload.state === 'active' && typeof payload.token === 'string' && /^[a-f0-9]{64}$/.test(payload.token)) { onLinked(payload.token); return; }
        if ([401,403,410].includes(response.status)) { setExpired(true); return; }
      } catch { /* Recover on the next bounded poll until the code expires. */ }
      finally { clearTimeout(timeout); pending = false; }
      if (!stopped) timer = setTimeout(() => void poll(), 5000);
    }
    timer = setTimeout(() => void poll(), 5000);
    return () => { stopped = true; controller?.abort(); clearTimeout(timer); };
  }, [pair, onLinked]);
  const link = pair && typeof window !== 'undefined' ? `${tvOrigin()}/tv/pair#${pair.code}` : '';
  return <div className="tv-pair-content">
    <p>{t('pairScope')}</p>
    {pair && !expired ? <><TvQr value={link} label={t('scan')} /><p>{t('scan')}</p><strong className="tv-pair-code" dir="ltr">{pair.code.match(/.{1,4}/g)?.join(' — ')}</strong><p>{t('waiting')}</p><p dir="ltr" className="tv-muted">{typeof window !== 'undefined' ? `${tvOrigin()}/tv/pair` : '/tv/pair'}</p></> : <>
      <p role={error?'alert':undefined}>{error?tvPairErrorText(language,error):t(expired?'pairExpired':'scan')}</p><button disabled={busy} onClick={() => void create()}>{t(busy ? 'loading' : 'newCode')}</button>
    </>}
  </div>;
}
export function TvQuoteDetail({ quote, language, now }: { quote: TvQuote; language: TvLanguage; now: number }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const scoped = quote.exchange?.startsWith('TD_');
  const pair = quote.exchange === 'BINANCE' || quote.exchange === 'FOREX';
  const url = tvAnalysisHref(quote);
  const phoneUrl = `${typeof window !== 'undefined' ? tvOrigin() : 'https://www.the-sfm.com'}${url}`;
  const assetType = tvAnalysisAssetType(quote);
  const analysis = useTvResource<{ result: AnalysisResult }>(scoped || pair ? null : `/api/intelligence/latest?symbol=${encodeURIComponent(quote.symbol)}&assetType=${assetType}&locale=${language}`, 300000);
  const result = analysis.data?.result;
  const valid = result && result.status === 'COMPLETE' && result.confidenceCalculation.minimumEvidenceMet && !result.staleData && Date.parse(result.expiresAt) > now;
  return <div className="tv-detail">
    <div><span dir="ltr" className="tv-symbol">{quote.symbol}</span><h3>{language === 'ar' ? quote.nameAr : quote.name}</h3>
      <div className="tv-detail-price" dir="ltr">{tvQuotePrice(quote)} <small>{tvSceneQuoteUnit(quote, language)}</small></div>
      <TvQuoteEvidence quote={quote} language={language} now={now}/>
      <h3>{t('ai')}</h3>{analysis.loading ? <p>{t('loading')}</p> : valid ? <>
        <p className="tv-recommendation">{t(result.recommendation)}</p><p>{t('confidence')}: {result.confidence} / 100 · {t('risk')}: {t(result.risk)}</p>
        <p>{t('source')}: The SFM AI Analyst · {result.confidenceCalculation.methodologyVersion}</p><p>{t('analysisTime')}: {tvTime(result.generatedAt, language, true)}</p>
      </> : <p>{t(result ? 'analysisExpired' : 'noAnalysis')}</p>}
      <p className="tv-muted">{t('disclaimer')}</p>
    </div>
    <div className="tv-phone-link"><a href={phoneUrl} aria-label={t('openPhone')}><TvQr value={phoneUrl} label={t('openPhone')} /></a><p>{t('openPhone')}</p></div>
  </div>;
}
export function TvMarketMap({ language, group, select, now }: { language: TvLanguage; group: TvGroup; select: (group: TvGroup) => void; now: number }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <section className="tv-map-panel"><div className="tv-map" role="group" aria-label={t('map')}>
    <img className="tv-map-image" src={typeof window !== 'undefined' && tvOrigin() !== window.location.origin ? './markets-tv/world-dotted-map.png' : '/markets-tv/world-dotted-map.png'} alt="" aria-hidden="true"/>
    {TV_MAP_POINTS.map(point => <button key={point.group} className="tv-map-point" aria-pressed={group === point.group} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => select(point.group)}>
      <strong>{t(point.group)}</strong><span>{new Intl.DateTimeFormat(`${language}-u-nu-latn`, { timeZone: point.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)}</span>
    </button>)}
  </div><p className="tv-muted">{t('localTime')}</p></section>;
}
export { TvBrief } from './TvBrief';
