'use client';
import '@/app/tv/broadcast.css';
import './trading-hall.css';
import { hallText } from '@/lib/markets-tv/hallText';
const TvTradingHall = lazy(() => import('./TvTradingHall').then(module => ({ default: module.TvTradingHall })));
const TvAllStocks = lazy(() => import('./TvAllStocks').then(module => ({ default: module.TvAllStocks })));
import { tvFetch, tvOrigin } from '@/lib/markets-tv/client';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Monitor, Smartphone, X, RefreshCw, Globe2, Pause, Play, Newspaper } from 'lucide-react';
import { normalizeTvSelections, TV_SELECTIONS_KEY, type TvSelections } from '@/lib/markets-tv/selections';
const TvMarketStrips = lazy(() => import('./TvMarketStrips').then(module => ({ default: module.TvMarketStrips })));
import { DEFAULT_TV_SETTINGS, normalizeTvSettings, type TvMarket, type TvAlert, type TvDevice, type TvDisplayMode, type TvGroup, type TvNews, type TvQuote, type TvScene, type TvSettings, type TvSnapshot, type TvView } from '@/lib/markets-tv/types';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvQuotePrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { TvQr } from './TvQr';
import { useTvResource, useTvScenePrefetch } from './useTvResource';
import { useTvRemote } from './useTvRemote';
import { normalizeTvChannels, TV_CHANNELS_KEY, type TvChannel } from '@/lib/markets-tv/channels';
import { useTvControls } from './useTvControls';
import { TV_SCENE_ORDER, tvSceneHasPrice, tvSceneIssue, tvSceneQuoteUnit, tvScenePath, tvSceneText } from '@/lib/markets-tv/scene-display';
const TvSceneDashboard = lazy(() => import('./TvSceneDashboard').then(module => ({ default: module.TvSceneDashboard })));
const TvReceiverScreen = lazy(() => import('./TvReceiverScreen'));
import { TvReceiverNav } from './TvReceiverNav';
import { TV_RECEIVER_CHANNELS, isTvReceiverChannel, nextTvReceiverChannel, receiverText, type TvReceiverChannel } from '@/lib/markets-tv/receiver';
import { TV_SESSION_IDS } from '@/lib/markets-tv/sessionSelection';
import { TvDataNotice } from './TvDataNotice';
import { TvHeader } from './TvHeader';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { TvHeadlines } from './TvSceneSidebar';
const TvInvestments = lazy(() => import('./TvInvestments'));
const TvBrief = lazy(() => import('./TvPanels').then(module => ({ default: module.TvBrief })));
const TvMarketMap = lazy(() => import('./TvPanels').then(module => ({ default: module.TvMarketMap })));
const TvPairPanel = lazy(() => import('./TvPanels').then(module => ({ default: module.TvPairPanel })));
const TvQuoteDetail = lazy(() => import('./TvPanels').then(module => ({ default: module.TvQuoteDetail })));
const TvSettingsPanel = lazy(() => import('./TvPanels').then(module => ({ default: module.TvSettingsPanel })));
const TvSessions = lazy(() => import('./TvWorldSessions'));
const TvMarketPicker = lazy(() => import('./TvMarketPicker').then(module => ({ default: module.TvMarketPicker })));
const TvInstrumentPicker = lazy(() => import('./TvInstrumentPicker').then(module => ({ default: module.TvInstrumentPicker })));
const TvChannels = lazy(() => import('./TvChannels').then(module => ({ default: module.TvChannels })));
const SETTINGS_KEY = 'sfm-markets-tv-settings-v1', TOKEN_KEY = 'sfm-markets-tv-device-v1';
const EMPTY_NEWS: TvNews[] = [];
const EMPTY_MARKETS: TvMarket[] = [];
type Dialog = 'settings' | 'pair' | 'device' | 'worldStocks' | 'markets' | 'instruments' | 'channels' | 'sessions' | null;
export function MarketsTv({ initialStripsOnly = false, initialAllStocks = false }: { initialStripsOnly?: boolean; initialAllStocks?: boolean }) {
  const [selections, setSelections] = useState<TvSelections>({});
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [instrumentMarket, setInstrumentMarket] = useState<TvMarket | null>(null);
  const [stripsPaused, setStripsPaused] = useState(false);
  const [routeStrips, setRouteStrips] = useState(initialStripsOnly);
  const [settings, setSettings] = useState<TvSettings>(() => initialAllStocks ? { ...DEFAULT_TV_SETTINGS, displayMode: 'browse' } : DEFAULT_TV_SETTINGS), [ready, setReady] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [pageSize, setPageSize] = useState(6);
  useEffect(() => {
    const shortScreen = window.matchMedia('(min-width: 761px) and (max-height: 650px)');
    const fit = () => { setPageSize(shortScreen.matches ? 3 : 6); setPage(0); };
    fit();
    shortScreen.addListener(fit);
    return () => shortScreen.removeListener(fit);
  }, []);
  const [group, setGroup] = useState<TvGroup>('global'), [view, setView] = useState<TvView>('markets');
  const [dialog, setDialog] = useState<Dialog>(null), [detail, setDetail] = useState<TvQuote | null>(null), [story, setStory] = useState<TvNews | null>(null);
  const [token, setToken] = useState(''), [now, setNow] = useState(0), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [online, setOnline] = useState(true), [message, setMessage] = useState(''), [fullscreen, setFullscreen] = useState(false);
  const activity = useRef(0), alertSeen = useRef(new Set<string>()), root = useRef<HTMLDivElement>(null), syncLoaded = useRef('');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(settings.language, key);
  const stripsOnly = routeStrips || settings.displayMode === 'strips';
  const viewing = !stripsOnly && settings.displayMode !== 'browse';
  const allStocks = !stripsOnly && !viewing && view === 'markets';
  const hall = !stripsOnly && viewing && view === 'markets' && (settings.scene || 'overview') === 'overview';
  const scene = settings.scene || 'overview';
  const receiverScreen = isTvReceiverChannel(view) && view !== 'sessions' && view !== 'investments';
  const receiverActive = viewing && settings.broadcastChannel === view;
  const pagePlaying=(view==='sessions'||view==='investments'||receiverScreen)?settings.sessionAutoRotate!==false:settings.autoRotate;
  // The market brief always summarizes the global benchmark sample, even
  // after visiting an unpaired/empty watchlist or a rate-limited scene.
  const resourceScene = view === 'brief' ? 'overview' : scene;
  const scenes = TV_SCENE_ORDER.filter(value => value !== 'watchlist' || token);
  const nextScene = scenes[(scenes.indexOf(scene) + 1) % scenes.length];
  const previousScene = scenes[scenes.indexOf(scene) > 0 ? scenes.indexOf(scene) - 1 : scenes.length - 1];
  const modal = Boolean(dialog || detail || story);
  const device = useTvResource<{ device: TvDevice; symbols: string[]; alerts: TvAlert[] }>(token ? '/api/tv/device' : null, 60000, token);
  const catalog = useTvResource<{ markets: TvMarket[] }>(ready && (!viewing || dialog === 'markets' || dialog === 'instruments') ? '/api/tv/catalog' : null, 300000, '', revision);
  const market = useTvResource<TvSnapshot>(ready && !stripsOnly && !viewing && !allStocks && !receiverScreen && view !== 'investments' && view !== 'sessions' && (group !== 'watchlist' || token) ? `/api/tv/snapshot?group=${group}&page=${page}&pageSize=${pageSize}${selectedMarket ? `&market=${selectedMarket}` : ""}` : null, 60000, group === 'watchlist' ? token : '', revision);
  const sceneMarket = useTvResource<TvSnapshot>(ready && viewing && !allStocks && !receiverScreen && view !== 'investments' && view !== 'sessions' && (resourceScene !== 'watchlist' || token) ? tvScenePath(resourceScene) : null, resourceScene === 'assets' ? 15000 : 30000, resourceScene === 'watchlist' ? token : '', revision);
  useTvScenePrefetch(ready && viewing && view === 'markets' && settings.autoRotate && !modal && online && nextScene !== 'watchlist' ? tvScenePath(nextScene) : null, 30000);
  const news = useTvResource<{ stories: TvNews[] }>(ready && !stripsOnly && !receiverScreen && view !== 'investments' && view !== 'sessions' ? `/api/tv/news?language=${settings.language}` : null, 180000);
  const controls = useTvControls(root, (stripsOnly || viewing) && Boolean(settings.autoHideControls), modal);
  const close = useCallback(() => { setDialog(null); setDetail(null); setStory(null); }, []);
  const interact = useCallback(() => { activity.current = Date.now(); }, []);
  const openPair = useCallback(() => setDialog('pair'), []);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const toggleTicker = useCallback(() => setStripsPaused(value => !value), []);
  const chooseBroadcast = useCallback((channel: TvReceiverChannel) => {
    const next: TvSettings = { ...settings, displayMode: 'viewing', broadcastChannel: channel,
      sessionIds: channel === 'sessions' && !settings.sessionIds ? [...TV_SESSION_IDS] : settings.sessionIds };
    // Save during selection so closing/reloading immediately retains the channel.
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* In-memory selection remains usable. */ }
    setView(channel); setRouteStrips(false); setDialog(null); setDetail(null); setStory(null);
    setSettings(next); activity.current = Date.now();
  }, [settings]);
  useTvRemote(() => { if (modal) close(); else setDialog('settings'); }, interact, modal, action => {
    const play = action === 'play' || action === 'toggle' && (stripsOnly ? stripsPaused : !pagePlaying);
    if((view==='sessions'||view==='investments'||receiverScreen)&&!stripsOnly){setSettings(value=>({...value,sessionAutoRotate:action==='play'||action==='toggle'&&value.sessionAutoRotate===false}));return;}
    setStripsPaused(!play);
    if (!stripsOnly) setSettings(value => view==='sessions'?{...value,sessionAutoRotate:play}:{...value,autoRotate:play});
  }, command => chooseBroadcast(command.kind === 'channelNumber' ? TV_RECEIVER_CHANNELS[command.number - 1] : nextTvReceiverChannel(view, command.step)));
  useEffect(() => {
    try { const saved = normalizeTvSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); setSettings(initialAllStocks ? { ...saved, displayMode: 'browse', broadcastChannel: undefined } : saved); if (saved.broadcastChannel && !initialStripsOnly && !initialAllStocks) setView(saved.broadcastChannel); setToken(localStorage.getItem(TOKEN_KEY) || ''); } catch { /* Device storage can be unavailable. */ }
    try { setSelections(normalizeTvSelections(JSON.parse(localStorage.getItem(TV_SELECTIONS_KEY) || '{}'))); } catch { /* Keep defaults if device storage is corrupt. */ }
    try { setChannels(normalizeTvChannels(JSON.parse(localStorage.getItem(TV_CHANNELS_KEY) || '[]'))); } catch { /* Stored channels may be unavailable. */ }
    activity.current = Date.now(); setReady(true); setNow(Date.now()); setOnline(navigator.onLine);
    const freshness = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = setInterval(freshness, 15000);
    document.addEventListener('visibilitychange', freshness);
    const network = () => setOnline(navigator.onLine);
    const screen = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('online', network); window.addEventListener('offline', network); document.addEventListener('fullscreenchange', screen);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', freshness); window.removeEventListener('online', network); window.removeEventListener('offline', network); document.removeEventListener('fullscreenchange', screen); };
  }, [initialStripsOnly, initialAllStocks]);
  useEffect(() => { if (ready) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Keep in-memory settings usable. */ } } }, [settings, ready]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(TV_SELECTIONS_KEY, JSON.stringify(selections)); } catch { setMessage(tvText(settings.language, 'selectionStorageUnavailable')); }
  }, [selections, ready, settings.language]);
  useEffect(() => {
    if (device.error === 'UNAUTHORIZED') {
      setToken(''); syncLoaded.current = ''; alertSeen.current.clear(); setGroup(g => g === 'watchlist' ? 'global' : g);
      setSettings(value => ({ ...value, scene: value.scene === 'watchlist' ? 'overview' : value.scene }));
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* No persistent storage. */ }
    }
    if (token && device.data && syncLoaded.current !== token) { syncLoaded.current = token; const synced = normalizeTvSettings(device.data.device.settings); setSettings(initialAllStocks ? { ...synced, displayMode: 'browse', broadcastChannel: undefined } : synced); if (synced.broadcastChannel && !initialAllStocks) setView(synced.broadcastChannel); }
  }, [device.error, device.data, token, initialAllStocks]);
  useEffect(() => {
    if (!token || !ready || syncLoaded.current !== token) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void tvFetch('/api/tv/device', { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-sfm-tv-token': token }, body: JSON.stringify({ settings }), signal: controller.signal })
        .then(response => { if (!response.ok) setMessage(tvText(settings.language, 'error')); }).catch(() => undefined);
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [settings, token, ready]);
  useEffect(() => {
    if (!settings.groups.includes(group) && !(settings.groups.includes('world') && selectedMarket)) { setGroup(settings.groups[0]); setSelectedMarket(''); setPage(0); }
  }, [settings.groups, group, selectedMarket]);
  const choose = useCallback((next: TvGroup, market = '') => { setGroup(next); setSelectedMarket(market); setPage(0); activity.current = Date.now(); }, []);
  const chooseScene = useCallback((next: TvScene) => { setView('markets'); setSettings(value => ({ ...value, scene: next, broadcastChannel: undefined })); activity.current = Date.now(); }, []);
  function changeDisplayMode(displayMode: TvDisplayMode) {
    const next: TvSettings = { ...settings, displayMode, scene: displayMode === 'viewing' ? 'overview' : settings.scene, broadcastChannel: undefined };
    setView('markets');
    setRouteStrips(false); setSettings(next); activity.current = Date.now();
    // Persist before a real /tv ↔ /tv/strips navigation unmounts this screen.
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* In-memory mode remains usable. */ }
  }
  function changeSettings(next: TvSettings) {
    if (next.displayMode !== settings.displayMode) { setRouteStrips(false); if (receiverScreen) setView('markets'); }
    setSettings(next); activity.current = Date.now();
  }
  useEffect(() => {
    if (stripsOnly || allStocks || view !== 'markets' || !settings.autoRotate || modal) return;
    const timer = setInterval(() => {
      const instant = Date.now();
      if (document.hidden || instant - activity.current < settings.rotationSeconds * 1000) return;
      if (viewing) {
        if (!sceneMarket.data && sceneMarket.loading) return;
        if (document.activeElement?.closest('.tv-scene-body, .tv-scene-summaries, .tv-quote-marquee, .tv-hall-content')) return;
        setSettings(value => ({ ...value, scene: nextScene })); activity.current = instant; return;
      }
      const groups = settings.groups.filter(g => g !== 'watchlist' || token);
      if (groups.length) { const index = groups.indexOf(group); setGroup(groups[(index + 1) % groups.length]); setSelectedMarket(''); setPage(0); activity.current = instant; }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings.autoRotate, settings.rotationSeconds, settings.groups, modal, group, token, stripsOnly, allStocks, viewing, view, sceneMarket.data, sceneMarket.loading, nextScene]);
  const activeSnapshot = viewing ? sceneMarket.data : market.data;
  useEffect(() => {
    if (!activeSnapshot || !device.data) return;
    for (const alert of device.data.alerts) {
      const q = [...activeSnapshot.quotes, ...(activeSnapshot.summary || [])].find(item => item.symbol === alert.symbol);
      if (q?.exchange?.startsWith('TD_')) continue;
      if (alert.alert_type !== 'change_exceeds' && (!alert.currency || alert.currency !== q?.currency)) continue;
      if (!q || !['available','delayed'].includes(quoteStatus(q)) || q.price === null) continue;
      const crossed = alert.alert_type === 'above' ? q.price >= alert.threshold : alert.alert_type === 'below' ? q.price <= alert.threshold
        : alert.alert_type === 'change_exceeds' && q.changePercent !== null ? Math.abs(q.changePercent) >= alert.threshold : false;
      if (!crossed) { alertSeen.current.delete(alert.id); continue; }
      if (alertSeen.current.has(alert.id)) continue;
      alertSeen.current.add(alert.id); setMessage(`${tvText(settings.language, 'alert')}: ${alert.symbol} · ${tvQuotePrice(q)} ${tvSceneQuoteUnit(q, settings.language)}`);
      if (settings.sound) { try {
        const context = new AudioContext(); const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination); gain.gain.value = 0.05; oscillator.frequency.value = 640;
        oscillator.start(); oscillator.stop(context.currentTime + 0.18); oscillator.onended = () => { void context.close(); };
      } catch { /* Sound is optional and may require a user gesture. */ } }
    }
  }, [activeSnapshot, device.data, settings.sound, settings.language]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 9000); return () => clearTimeout(timer); }, [message]);
  const linked = useCallback((value: string) => {
    try { localStorage.setItem(TOKEN_KEY, value); } catch { /* Session remains usable in memory. */ }
    syncLoaded.current = value; setToken(value); setDialog(null); setGroup('watchlist');
    setSettings(s => ({ ...s, scene: 'watchlist', groups: Array.from(new Set([...s.groups, 'watchlist' as const])) }));
  }, []);
  async function unlink() {
    const response = await tvFetch('/api/tv/device', { method: 'DELETE', headers: { 'x-sfm-tv-token': token } }).catch(() => null);
    if (response && (response.ok || response.status === 401)) {
      setToken(''); alertSeen.current.clear(); setGroup('global'); setSettings(value => ({ ...value, scene: 'overview' })); close(); try { localStorage.removeItem(TOKEN_KEY); } catch { /* No storage. */ }
    } else setMessage(t('error'));
  }
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen(); } catch { setMessage(t('error')); } }
  const quotes = market.data?.quotes || [], pages = Math.max(1, Math.ceil((market.data?.directoryTotal ?? quotes.length) / pageSize));
  const shown = quotes.slice(0, pageSize);
  // Freshness is independent of the clock and updates at most every 15 seconds.
  const stripNow = now;
  const strips = <Suspense fallback={<div className="tv-loading" role="status">{t('loading')}</div>}><TvMarketStrips browse={!stripsOnly} selections={selections} marketIds={settings.marketIds} speed={settings.stripSpeed} marketSpeeds={settings.marketSpeeds} pricedOnly={settings.pricedOnly} revision={revision} paused={stripsPaused || (!stripsOnly && modal)} markets={catalog.data?.markets || EMPTY_MARKETS} watchlistCount={device.data?.symbols.length || 0} activeMarket={selectedMarket} onQuote={setDetail} groups={settings.groups} language={settings.language} token={token} activeGroup={group} onSelect={choose} now={stripNow} /></Suspense>;
  return <div ref={root} data-tv-root data-tv-view={view} data-accent={settings.accent || 'champagne'} className={`tv-screen tv-${settings.theme}${hall || allStocks ? ' tv-hall-screen' : ''}${viewing && scene === 'overview' && view === 'markets' ? ' tv-overview-screen' : ''}${stripsOnly ? ' tv-strips-only' : viewing ? ' tv-viewing' : ' tv-browsing'} tv-density-${settings.stripDensity || 'comfortable'}`} dir={settings.language === 'ar' ? 'rtl' : 'ltr'} lang={settings.language} onPointerDown={interact}>
    <TvHeader language={settings.language} mode={stripsOnly ? 'strips' : viewing ? 'viewing' : 'browse'} ready={ready} paired={Boolean(token)} fullscreen={fullscreen} hidden={controls.hidden} paused={stripsPaused} wake={controls.wake} changeMode={changeDisplayMode} pair={() => setDialog(token ? 'device' : 'pair')} settings={() => setDialog('settings')} customize={() => setDialog('markets')} channels={() => setDialog('channels')} toggleFullscreen={() => void toggleFullscreen()} togglePause={toggleTicker} refresh={refresh}/>
    {stripsOnly ? <>

      {!online && <div className="tv-notice" role="status">{t('offline')}</div>}
      {catalog.error && <div className="tv-notice" role="status">{t('error')} <button onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></div>}
      <main className="tv-strips-main">{!ready || (catalog.loading && !catalog.data) ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/><span>{t('loading')}</span></div> : strips}</main>
    </> : allStocks ? <>
      {!online && <div className="tv-hall-error" role="status">{t('offline')}</div>}
      <Suspense fallback={<main className="tv-feature-view" role="status">{t('loading')}</main>}><TvAllStocks language={settings.language} now={now} markets={catalog.data?.markets || EMPTY_MARKETS} ready={ready} revision={revision} news={news.data?.stories || EMPTY_NEWS} paused={stripsPaused || modal} ticker={settings.ticker} speed={settings.stripSpeed || 56} onQuote={setDetail} onStory={setStory} onRefresh={refresh} onTickerPause={toggleTicker}/></Suspense>
      <footer className="tv-viewing-footer"><span>{t('remoteHelp')}</span><button onClick={() => chooseBroadcast('sessions')}>{t('sessions')}</button><button onClick={() => chooseBroadcast('investments')}>{t('investments')}</button><button onClick={() => setDialog('channels')}>{t('channels')}</button><button onClick={refresh}>{t('refresh')}</button></footer>
    </> : viewing ? <>

      <div className="tv-viewing-nav">{receiverActive ? <TvReceiverNav language={settings.language} active={settings.broadcastChannel} choose={chooseBroadcast}/> : <><nav className="tv-scene-tabs" aria-label={s('scenes')}>{TV_SCENE_ORDER.map(value => <button key={value} aria-pressed={view === 'markets' && scene === value} onClick={() => chooseScene(value)} data-tv-focus-key={`scene:${value}`}>{value === 'overview' ? hallText(settings.language, 'hall') : s(value)}</button>)}{(['sessions','brief','investments'] as const).map(value=><button key={value} aria-pressed={view===value} onClick={()=>setView(value)}>{t(value)}</button>)}</nav>
        <div className="tv-scene-playback"><span>{s(pagePlaying ? 'automatic' : 'manual')}</span>
          <button onClick={() => chooseScene(previousScene)} aria-label={s('previousScene')} data-tv-focus-key="scene-previous">{settings.language === 'ar' ? <ArrowRight aria-hidden="true"/> : <ArrowLeft aria-hidden="true"/>}</button>
          <button aria-label={t(pagePlaying ? 'pause' : 'resume')} aria-pressed={pagePlaying} onClick={() => { setSettings(value => view==='sessions'||view==='investments'?{...value,sessionAutoRotate:!pagePlaying}:{ ...value, autoRotate: !value.autoRotate }); interact(); }} data-tv-focus-key="scene-playback">{pagePlaying ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}</button>
          <button onClick={() => chooseScene(nextScene)} aria-label={s('nextScene')} data-tv-focus-key="scene-next">{settings.language === 'ar' ? <ArrowLeft aria-hidden="true"/> : <ArrowRight aria-hidden="true"/>}</button>
        </div></>}
      </div>
      {!online && <div className="tv-scene-notice" role="status">{t('offline')}</div>}
      {receiverScreen ? <Suspense fallback={<main className="tv-feature-view" role="status">{t('loading')}</main>}><TvReceiverScreen key={view} channel={view} language={settings.language} now={now} revision={revision} playing={settings.sessionAutoRotate!==false&&!modal} togglePlay={()=>setSettings(value=>({...value,sessionAutoRotate:value.sessionAutoRotate===false}))} onQuote={setDetail} onStory={setStory} onRefresh={refresh}/></Suspense> : view === 'investments' ? <main className="tv-feature-view"><Suspense fallback={<p>{t('loading')}</p>}><TvInvestments autoRotate={settings.sessionAutoRotate!==false} onAutoRotateChange={enabled=>setSettings(value=>({...value,sessionAutoRotate:enabled}))} token={token} language={settings.language} revision={revision} now={now} onPair={openPair} onRefresh={refresh}/></Suspense></main> : view === 'sessions' ? <main className="tv-feature-view"><Suspense fallback={<p>{t('loading')}</p>}><TvSessions autoRotate={settings.sessionAutoRotate!==false} onAutoRotateChange={enabled=>setSettings(value=>({...value,sessionAutoRotate:enabled}))} language={settings.language} now={now} selected={settings.sessionIds} onSelectionChange={ids=>setSettings(value=>({...value,sessionIds:ids}))}/></Suspense></main> : view === 'brief' ? <main className="tv-feature-view"><Suspense fallback={<p>{t('loading')}</p>}><TvBrief snapshot={sceneMarket.data} loading={sceneMarket.loading} error={sceneMarket.error} onRefresh={refresh} language={settings.language} now={now} select={setDetail}/></Suspense></main> : <Suspense fallback={<main className="tv-feature-view" role="status">{t('loading')}</main>}>{hall ? <TvTradingHall snapshot={sceneMarket.data} loading={!ready || sceneMarket.loading} error={sceneMarket.error} language={settings.language} now={stripNow} news={news.data?.stories || EMPTY_NEWS} selected={settings.sessionIds} paused={stripsPaused || modal} ticker={settings.ticker} speed={settings.stripSpeed || 56} onQuote={setDetail} onStory={setStory} onRefresh={refresh} onAllStocks={() => changeDisplayMode('browse')} onTickerPause={toggleTicker}/> : <TvSceneDashboard sessionIds={settings.sessionIds} overview={scene === 'overview'} snapshot={sceneMarket.data} loading={!ready || sceneMarket.loading} error={sceneMarket.error} language={settings.language} now={stripNow} news={news.data?.stories || EMPTY_NEWS} linked={Boolean(token)} watchlist={scene === 'watchlist'} ticker={settings.ticker} tickerPaused={stripsPaused} speed={settings.stripSpeed || 56} onQuote={setDetail} onStory={setStory} onPair={openPair} onRefresh={refresh} onTickerPause={toggleTicker}/>}</Suspense>}
      <footer className="tv-viewing-footer"><span>{t('remoteHelp')}</span><button onClick={() => setDialog('sessions')}>{t('sessions')}</button><button onClick={() => setDialog('channels')}>{t('channels')}</button><span>{t(online ? 'connected' : 'offline')}</span><button onClick={() => setRevision(value => value + 1)} aria-label={s('update')}><RefreshCw aria-hidden="true"/></button></footer>
    </> : <>

    {(view === 'markets' || view === 'brief') && <nav className="tv-markets-nav" aria-label={t('markets')}>{settings.groups.map(g => <button key={g} aria-pressed={group === g} onClick={() => choose(g)}>{t(g)}</button>)}</nav>}
    <div className="tv-section-heading"><div>{view === 'markets' ? <span className="tv-eyebrow">{t('directory')}: {market.data?.directoryTotal?.toLocaleString('en-US') ?? '—'}</span> : view === 'brief' && <span className="tv-eyebrow">{t(group)}</span>}
      <h1>{isTvReceiverChannel(view) ? receiverText(settings.language, view) : t(view === 'markets' ? group : view)}</h1></div>
      {view === 'markets' && catalog.data && !['global','crypto','forex','commodities','watchlist'].includes(group) && <label className="tv-exchange-select">{t('markets')}<select value={selectedMarket} onChange={event => { setSelectedMarket(event.target.value); setPage(0); }}><option value="">{t('allMarkets')}</option>{catalog.data.markets.filter(m => group === 'world' ? !['global','crypto','forex','commodities'].includes(m.group) : m.group === group).map(m => <option key={m.id} value={m.id}>{settings.language === 'ar' ? m.labelAr : settings.language === 'fr' ? m.labelFr : m.labelEn} ({m.count.toLocaleString('en-US')})</option>)}</select></label>}
      <div className="tv-view-actions"><a className="tv-world-stocks-link" href={ready ? `${tvOrigin()}/world-stocks` : "/world-stocks"} onClick={event => { if (tvOrigin() !== window.location.origin) { event.preventDefault(); setDialog("worldStocks"); } }} aria-label={t('worldStocks')}><Globe2 aria-hidden="true"/></a>{(['markets','map','sessions','brief','investments'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'map' ? <Globe2 aria-hidden="true"/> : v === 'brief' ? <Newspaper aria-hidden="true"/> : <Monitor aria-hidden="true"/>}{t(v)}</button>)}<button aria-label={t(settings.autoRotate ? 'pause' : 'resume')} aria-pressed={settings.autoRotate} onClick={() => setSettings(s => ({ ...s, autoRotate: !s.autoRotate }))}>{settings.autoRotate ? <Pause/> : <Play/>}</button></div></div>
    {!online && <div className="tv-notice" role="status">{t('offline')}</div>}
    {market.error && <div className="tv-notice" role="status">{t('error')} <button onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></div>}
    <main className={`tv-body tv-layout-${view === 'markets' ? settings.layout : 'feature'}`}>
      <div className="tv-main-panel">
        <Suspense fallback={<p role="status">{t('loading')}</p>}>
        {view === 'investments' ? <TvInvestments autoRotate={settings.sessionAutoRotate!==false} onAutoRotateChange={enabled=>setSettings(value=>({...value,sessionAutoRotate:enabled}))} token={token} language={settings.language} revision={revision} now={now} onPair={openPair} onRefresh={refresh}/> : view === 'sessions' ? <TvSessions autoRotate={settings.sessionAutoRotate!==false} onAutoRotateChange={enabled=>setSettings(value=>({...value,sessionAutoRotate:enabled}))} language={settings.language} now={now} selected={settings.sessionIds} onSelectionChange={ids=>setSettings(value=>({...value,sessionIds:ids}))}/> : view === 'map' ? <TvMarketMap language={settings.language} group={group} select={g => { choose(g); setView('markets'); }} now={now || Date.now()}/> : view === 'brief' ? <TvBrief snapshot={market.data} loading={market.loading} error={market.error} onRefresh={refresh} language={settings.language} now={now} select={setDetail}/> : <>
          {(group !== 'watchlist' || token) && <TvDataNotice quotes={quotes} language={settings.language} retryAt={market.data?.retryAt} now={now} loading={market.loading} refresh={refresh}/>}
          {group === 'watchlist' && !token ? <div className="tv-empty"><Smartphone/><h2>{t('linkForWatchlist')}</h2><button onClick={() => setDialog('pair')}>{t('pair')}</button></div> : !ready || (market.loading && !market.data) ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/><span>{t('loading')}</span></div> : !quotes.length ? <div className="tv-empty"><h2>{t(group === 'watchlist' ? 'emptyWatchlist' : 'noPrices')}</h2></div> : <div className="tv-quote-grid">{shown.map(q => <button className="tv-quote" data-priced={tvSceneHasPrice(q)} key={`${q.exchange || group}:${q.symbol}`} onClick={() => setDetail(q)}>
            <div className="tv-quote-top"><strong dir="ltr">{q.symbol}</strong><span>{q.exchange || q.country || ''}</span></div>
            <span className="tv-quote-name">{settings.language === 'ar' ? q.nameAr : q.name}</span>
            {tvSceneHasPrice(q) ? <><div className="tv-price-line" dir="ltr"><strong>{tvQuotePrice(q)}</strong><small>{tvSceneQuoteUnit(q, settings.language)}</small><span data-trend={q.changePercent === null ? 'flat' : q.changePercent >= 0 ? 'up' : 'down'}>{q.changePercent === null ? '—' : `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}</span></div>
              <TvQuoteEvidence quote={q} language={settings.language} now={now}/></>
              : <small className="tv-status" data-status="unavailable">{s(tvSceneIssue(q.issue))}</small>}
          </button>)}</div>}
          <div className="tv-pagination"><span>{t('coverage')}: <b dir="ltr">{market.data ? `${market.data.available} / ${market.data.total}` : '—'}</b></span><div><button disabled={page === 0} aria-label={t('previous')} onClick={() => setPage(p => Math.max(0,p - 1))}><ArrowLeft/></button><span dir="ltr">{page + 1} / {pages}</span><button disabled={page >= pages - 1} aria-label={t('next')} onClick={() => setPage(p => p + 1)}><ArrowRight/></button></div></div>
        </>}
        </Suspense>
      </div>
      {view === 'markets' && settings.layout === 'balanced' && <aside className="tv-news-panel"><TvHeadlines news={news.data?.stories || EMPTY_NEWS} language={settings.language} now={now} onStory={setStory}/></aside>}
    </main>
    {view === 'markets' && settings.ticker && strips}
    <footer className="tv-footer"><span>{t('remoteHelp')}</span><span>{t(online ? 'connected' : 'offline')}</span><button onClick={() => setRevision(v => v + 1)} aria-label={t('refresh')}><RefreshCw size={16}/></button></footer>
    </>}
    {message && <div className="tv-toast" role="status">{message}</div>}
    {modal && <div className="tv-modal-backdrop"><section data-tv-dialog role="dialog" aria-modal="true" aria-labelledby="tv-dialog-title" className={`tv-dialog${dialog === 'sessions' ? ' tv-sessions-dialog' : dialog === 'markets' || dialog === 'instruments' ? ' tv-picker-dialog' : ''}`}><header><h2 id="tv-dialog-title">{detail ? (settings.language === 'ar' ? detail.nameAr : detail.name) : story ? t('news') : t(dialog === 'sessions' ? 'sessions' : dialog === 'channels' ? 'channels' : dialog === 'worldStocks' ? 'worldStocks' : dialog === 'instruments' ? 'customizeInstruments' : dialog === 'markets' ? 'customizeMarkets' : dialog === 'settings' ? 'settings' : dialog === 'device' ? 'paired' : 'pair')}</h2><button onClick={close} aria-label={t('close')}><X/></button></header>
      <Suspense fallback={<p role="status">{t('loading')}</p>}>
      {dialog === 'channels' && <TvChannels view={view} chooseBroadcast={chooseBroadcast} channels={channels} change={setChannels} settings={{ ...settings, displayMode: stripsOnly ? 'strips' : viewing ? 'viewing' : 'browse' }} selections={selections} apply={channel => {
        setSettings(normalizeTvSettings({ ...channel.settings, displayMode: channel.settings.displayMode || (stripsOnly ? 'strips' : viewing ? 'viewing' : 'browse') })); setSelections(normalizeTvSelections(channel.selections)); setView(channel.view || (isTvReceiverChannel(channel.settings.broadcastChannel) ? channel.settings.broadcastChannel : 'markets')); if (channel.settings.displayMode) setRouteStrips(false);
        choose(channel.settings.groups[0], channel.settings.marketIds?.[0] || '');
        setMessage(`${tvText(channel.settings.language, 'channelApplied')}: ${channel.name}`); close();
      }}/>}
      {dialog === 'markets' && <TvMarketPicker markets={catalog.data?.markets || EMPTY_MARKETS} settings={settings} change={setSettings} selections={selections} done={close} initialMarketId={instrumentMarket?.id} loading={catalog.loading} error={Boolean(catalog.error)} retry={refresh} customize={market => { setInstrumentMarket(market); setDialog('instruments'); }}/>}
      {dialog === 'settings' && <TvSettingsPanel settings={settings} change={changeSettings} stripsOnly={stripsOnly} displayMode={stripsOnly ? 'strips' : viewing ? 'viewing' : 'browse'} changeDisplayMode={changeDisplayMode} customize={() => setDialog('markets')} channels={() => setDialog('channels')}/>}
      {dialog === 'instruments' && instrumentMarket && <TvInstrumentPicker key={instrumentMarket.id} market={instrumentMarket} language={settings.language} selected={selections[instrumentMarket.id]} done={close} back={() => setDialog('markets')} change={symbols => setSelections(current => { const next = { ...current }; if (symbols === undefined) delete next[instrumentMarket.id]; else next[instrumentMarket.id] = symbols; return normalizeTvSelections(next); })}/>}
      {dialog === 'pair' && <TvPairPanel language={settings.language} onLinked={linked}/>}
      {dialog === 'device' && <div className="tv-pair-content"><p>{device.data?.device.name}</p><p>{t('confirmDisconnect')}</p><button onClick={() => void unlink()}>{t('disconnect')}</button><TvQr value={`${tvOrigin()}/tv/pair`} label={t('devices')}/><p>{t('devices')}</p></div>}
      {dialog === 'worldStocks' && <TvQr value={`${tvOrigin()}/world-stocks`} label={t('worldStocks')}/>}
      {dialog === 'sessions' && <TvSessions autoRotate={settings.sessionAutoRotate!==false} onAutoRotateChange={enabled=>setSettings(value=>({...value,sessionAutoRotate:enabled}))} language={settings.language} now={now} selected={settings.sessionIds} onSelectionChange={ids=>setSettings(value=>({...value,sessionIds:ids}))}/>}
      {detail && <TvQuoteDetail quote={detail} language={settings.language} now={now}/>}
      {story && <div className="tv-detail"><div><h3>{story.title}</h3><p>{story.source} · {tvTime(story.publishedAt,settings.language,true)}</p></div><div className="tv-phone-link"><TvQr value={story.url} label={t('openStory')}/><p>{t('openStory')}</p></div></div>}
      </Suspense>
    </section></div>}
  </div>;
}
