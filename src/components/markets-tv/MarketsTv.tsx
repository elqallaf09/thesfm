'use client';
import { tvFetch, tvOrigin } from '@/lib/markets-tv/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Maximize, Monitor, Settings2, Smartphone, X, RefreshCw, Globe2, Pause, Play, Newspaper } from 'lucide-react';
import { DEFAULT_TV_SETTINGS, normalizeTvSettings, type TvAlert, type TvDevice, type TvGroup, type TvNews, type TvQuote, type TvSettings, type TvSnapshot, type TvView } from '@/lib/markets-tv/types';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvPrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { TvBrief, TvMarketMap, TvPairPanel, TvQuoteDetail, TvSettingsPanel } from './TvPanels';
import { TvSessions } from './TvSessions';
import { TvQr } from './TvQr';
import { useTvResource } from './useTvResource';
import { useTvRemote } from './useTvRemote';
const SETTINGS_KEY = 'sfm-markets-tv-settings-v1', TOKEN_KEY = 'sfm-markets-tv-device-v1';
type Dialog = 'settings' | 'pair' | 'device' | null;
export function MarketsTv() {
  const [settings, setSettings] = useState<TvSettings>(DEFAULT_TV_SETTINGS), [ready, setReady] = useState(false);
  const [group, setGroup] = useState<TvGroup>('global'), [view, setView] = useState<TvView>('markets');
  const [dialog, setDialog] = useState<Dialog>(null), [detail, setDetail] = useState<TvQuote | null>(null), [story, setStory] = useState<TvNews | null>(null);
  const [token, setToken] = useState(''), [now, setNow] = useState(0), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [online, setOnline] = useState(true), [message, setMessage] = useState(''), [fullscreen, setFullscreen] = useState(false);
  const activity = useRef(0), alertSeen = useRef(new Set<string>()), root = useRef<HTMLDivElement>(null), syncLoaded = useRef('');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const device = useTvResource<{ device: TvDevice; symbols: string[]; alerts: TvAlert[] }>(token ? '/api/tv/device' : null, 60000, token);
  const market = useTvResource<TvSnapshot>(ready && (group !== 'watchlist' || token) ? `/api/tv/snapshot?group=${group}` : null, 60000, group === 'watchlist' ? token : '', revision);
  const news = useTvResource<{ stories: TvNews[] }>(ready ? `/api/tv/news?language=${settings.language}` : null, 180000);
  const modal = Boolean(dialog || detail || story);
  const close = useCallback(() => { setDialog(null); setDetail(null); setStory(null); }, []);
  const interact = useCallback(() => { activity.current = Date.now(); }, []);
  useTvRemote(() => { if (modal) close(); else setDialog('settings'); }, interact, modal);
  useEffect(() => {
    try { setSettings(normalizeTvSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'))); setToken(localStorage.getItem(TOKEN_KEY) || ''); } catch { /* Device storage can be unavailable. */ }
    setReady(true); setNow(Date.now()); setOnline(navigator.onLine);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const network = () => setOnline(navigator.onLine);
    const screen = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('online', network); window.addEventListener('offline', network); document.addEventListener('fullscreenchange', screen);
    return () => { clearInterval(timer); window.removeEventListener('online', network); window.removeEventListener('offline', network); document.removeEventListener('fullscreenchange', screen); };
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Keep in-memory settings usable. */ } } }, [settings, ready]);
  useEffect(() => {
    if (device.error === 'UNAUTHORIZED') {
      setToken(''); syncLoaded.current = ''; alertSeen.current.clear(); setGroup(g => g === 'watchlist' ? 'global' : g);
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* No persistent storage. */ }
    }
    if (token && device.data && syncLoaded.current !== token) { syncLoaded.current = token; setSettings(device.data.device.settings); }
  }, [device.error, device.data, token]);
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
    if (!settings.groups.includes(group)) setGroup(settings.groups[0]);
  }, [settings.groups, group]);
  const choose = useCallback((next: TvGroup) => { setGroup(next); setPage(0); activity.current = Date.now(); }, []);
  useEffect(() => {
    if (!settings.autoRotate || modal || document.hidden || !now || now - activity.current < settings.rotationSeconds * 1000) return;
    const groups = settings.groups.filter(g => g !== 'watchlist' || token);
    if (groups.length) { const index = groups.indexOf(group); setGroup(groups[(index + 1) % groups.length]); setPage(0); activity.current = now; }
  }, [now, settings.autoRotate, settings.rotationSeconds, settings.groups, modal, group, token]);
  useEffect(() => {
    if (!market.data || !device.data) return;
    for (const alert of device.data.alerts) {
      const q = market.data.quotes.find(item => item.symbol === alert.symbol);
      if (alert.alert_type !== 'change_exceeds' && (!alert.currency || alert.currency !== q?.currency)) continue;
      if (!q || !['available','delayed'].includes(quoteStatus(q)) || q.price === null) continue;
      const crossed = alert.alert_type === 'above' ? q.price >= alert.threshold : alert.alert_type === 'below' ? q.price <= alert.threshold
        : alert.alert_type === 'change_exceeds' && q.changePercent !== null ? Math.abs(q.changePercent) >= alert.threshold : false;
      if (!crossed) { alertSeen.current.delete(alert.id); continue; }
      if (alertSeen.current.has(alert.id)) continue;
      alertSeen.current.add(alert.id); setMessage(`${tvText(settings.language, 'alert')}: ${alert.symbol} · ${tvPrice(q.price, q.currency)} ${q.currency}`);
      if (settings.sound) { try {
        const context = new AudioContext(); const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination); gain.gain.value = 0.05; oscillator.frequency.value = 640;
        oscillator.start(); oscillator.stop(context.currentTime + 0.18); oscillator.onended = () => { void context.close(); };
      } catch { /* Sound is optional and may require a user gesture. */ } }
    }
  }, [market.data, device.data, settings.sound, settings.language]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 9000); return () => clearTimeout(timer); }, [message]);
  const linked = useCallback((value: string) => {
    try { localStorage.setItem(TOKEN_KEY, value); } catch { /* Session remains usable in memory. */ }
    syncLoaded.current = value; setToken(value); setDialog(null); setGroup('watchlist');
    setSettings(s => ({ ...s, groups: Array.from(new Set([...s.groups, 'watchlist' as const])) }));
  }, []);
  async function unlink() {
    const response = await tvFetch('/api/tv/device', { method: 'DELETE', headers: { 'x-sfm-tv-token': token } }).catch(() => null);
    if (response && (response.ok || response.status === 401)) {
      setToken(''); alertSeen.current.clear(); setGroup('global'); close(); try { localStorage.removeItem(TOKEN_KEY); } catch { /* No storage. */ }
    } else setMessage(t('error'));
  }
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen(); } catch { setMessage(t('error')); } }
  const quotes = market.data?.quotes || [], pages = Math.max(1, Math.ceil(quotes.length / 6));
  const shown = quotes.slice(Math.min(page, pages - 1) * 6, (Math.min(page, pages - 1) + 1) * 6);
  const displayed = quotes.filter(q => q.price !== null);
  const freshCount = displayed.filter(q => ['available','delayed'].includes(quoteStatus(q, now || Date.now()))).length;
  return <div ref={root} data-tv-root className={`tv-screen tv-${settings.theme}`} dir={settings.language === 'ar' ? 'rtl' : 'ltr'} lang={settings.language} onPointerDown={interact}>
    <header className="tv-header"><div className="tv-brand"><Monitor aria-hidden="true"/><div><strong dir="ltr">THE SFM <span>MARKETS TV</span></strong><small>{token ? t('paired') : t('public')}</small></div></div>
      <div className="tv-clock"><strong dir="ltr">{now ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now) : '—'}</strong><small>{now ? new Intl.DateTimeFormat(`${settings.language}-u-nu-latn`, { weekday: 'long', day: 'numeric', month: 'long' }).format(now) : '—'}</small></div>
      <div className="tv-header-actions"><button onClick={() => setDialog(token ? 'device' : 'pair')}><Smartphone aria-hidden="true"/><span>{t(token ? 'paired' : 'pair')}</span></button><button onClick={() => setDialog('settings')} aria-label={t('settings')}><Settings2 aria-hidden="true"/></button><button onClick={() => void toggleFullscreen()} aria-label={t(fullscreen ? 'exitFullscreen' : 'fullscreen')}><Maximize aria-hidden="true"/></button></div>
    </header>
    <nav className="tv-markets-nav" aria-label={t('markets')}>{settings.groups.map(g => <button key={g} aria-pressed={group === g} onClick={() => choose(g)}>{t(g)}</button>)}</nav>
    <div className="tv-section-heading"><div><span className="tv-eyebrow">{t('subset')}</span><h1>{t(group)}</h1></div><div className="tv-view-actions">{(['markets','map','sessions','brief'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'map' ? <Globe2 aria-hidden="true"/> : v === 'brief' ? <Newspaper aria-hidden="true"/> : <Monitor aria-hidden="true"/>}{t(v)}</button>)}<button aria-label={t(settings.autoRotate ? 'pause' : 'resume')} aria-pressed={settings.autoRotate} onClick={() => setSettings(s => ({ ...s, autoRotate: !s.autoRotate }))}>{settings.autoRotate ? <Pause/> : <Play/>}</button></div></div>
    {!online && <div className="tv-notice" role="status">{t('offline')}</div>}
    {market.error && <div className="tv-notice" role="status">{t('error')} <button onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></div>}
    <main className={`tv-body tv-layout-${settings.layout}`}>
      <div className="tv-main-panel">
        {view === 'sessions' ? <TvSessions language={settings.language} now={now}/> : view === 'map' ? <TvMarketMap language={settings.language} group={group} select={g => { choose(g); setView('markets'); }} now={now || Date.now()}/> : view === 'brief' ? <TvBrief snapshot={market.data} language={settings.language} now={now} select={setDetail}/> : <>
          {group === 'watchlist' && !token ? <div className="tv-empty"><Smartphone/><h2>{t('linkForWatchlist')}</h2><button onClick={() => setDialog('pair')}>{t('pair')}</button></div> : !ready || market.loading ? <div className="tv-loading" role="status"><RefreshCw className="tv-spin"/><span>{t('loading')}</span></div> : !quotes.length ? <div className="tv-empty"><h2>{t(group === 'watchlist' ? 'emptyWatchlist' : 'noPrices')}</h2></div> : <div className="tv-quote-grid">{shown.map(q => <button className="tv-quote" key={q.symbol} onClick={() => setDetail(q)}>
            <div className="tv-quote-top"><strong dir="ltr">{q.symbol}</strong><span>{q.exchange || q.country || ''}</span></div>
            <span className="tv-quote-name">{settings.language === 'ar' ? q.nameAr : q.name}</span>
            <div className="tv-price-line" dir="ltr"><strong>{tvPrice(q.price, q.currency)}</strong><small>{q.currency}</small><span data-trend={q.changePercent === null ? 'flat' : q.changePercent >= 0 ? 'up' : 'down'}>{q.changePercent === null ? '—' : `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}</span></div>
            <div className="tv-quote-meta"><span>{q.source || t('unavailable')}</span><time>{tvTime(q.observedAt, settings.language, true)}</time></div><small className="tv-status" data-status={quoteStatus(q, now)}>{t(quoteStatus(q, now))}</small>
          </button>)}</div>}
          <div className="tv-pagination"><span>{t('coverage')}: <b dir="ltr">{market.data ? `${market.data.available} / ${market.data.total}` : '—'}</b></span><div><button disabled={page === 0} aria-label={t('previous')} onClick={() => setPage(p => Math.max(0,p - 1))}><ArrowLeft/></button><span dir="ltr">{page + 1} / {pages}</span><button disabled={page >= pages - 1} aria-label={t('next')} onClick={() => setPage(p => p + 1)}><ArrowRight/></button></div></div>
        </>}
      </div>
      {settings.layout === 'balanced' && <aside className="tv-news-panel"><div className="tv-panel-title"><span className="tv-accent-square"/><h2>{t('news')}</h2></div><div className="tv-headlines">{!ready || news.loading ? <p>{t('loading')}</p> : news.data?.stories.length ? news.data.stories.slice(0,3).map((item,index) => <button className="tv-story" key={item.id} onClick={() => setStory(item)}><span className="tv-story-index">{String(index+1).padStart(2,'0')}</span><div><h3>{item.title}</h3><small>{item.source} · {tvTime(item.publishedAt,settings.language,true)}</small></div></button>) : <p className="tv-muted">{t('noNews')}</p>}</div>
        <div className="tv-data-health"><h3>{t('provider')}</h3><strong dir="ltr">{freshCount} / {quotes.length}</strong><p>{t('freshCount')}</p></div>
      </aside>}
    </main>
    {settings.ticker && displayed.length > 0 && <div className="tv-ticker" aria-label={t('ticker')}><span className="tv-ticker-label">THE SFM</span><div className="tv-ticker-window"><div className="tv-ticker-track" style={{ animationDuration: `${Math.max(35, displayed.length * 8)}s` }}>
      {[0,1].map(copy => <div key={copy} className="tv-ticker-set" aria-hidden={copy === 1}>{displayed.map(q => <span key={q.symbol} className="tv-ticker-item"><b dir="ltr">{q.symbol}</b><strong dir="ltr">{tvPrice(q.price,q.currency)} {q.currency}</strong><span data-trend={(q.changePercent || 0) >= 0 ? 'up' : 'down'} dir="ltr">{q.changePercent === null ? '—' : `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}</span><small>{q.source} · {tvTime(q.observedAt,settings.language,true)} · {t(quoteStatus(q,now))}</small></span>)}</div>)}
    </div></div></div>}
    <footer className="tv-footer"><span>{t('remoteHelp')}</span><span>{t(online ? 'connected' : 'offline')}</span><button onClick={() => setRevision(v => v + 1)} aria-label={t('refresh')}><RefreshCw size={16}/></button></footer>
    {message && <div className="tv-toast" role="status">{message}</div>}
    {modal && <div className="tv-modal-backdrop"><section data-tv-dialog role="dialog" aria-modal="true" aria-labelledby="tv-dialog-title" className="tv-dialog"><header><h2 id="tv-dialog-title">{detail ? (settings.language === 'ar' ? detail.nameAr : detail.name) : story ? t('news') : t(dialog === 'settings' ? 'settings' : dialog === 'device' ? 'paired' : 'pair')}</h2><button onClick={close} aria-label={t('close')}><X/></button></header>
      {dialog === 'settings' && <TvSettingsPanel settings={settings} change={setSettings}/>}
      {dialog === 'pair' && <TvPairPanel language={settings.language} onLinked={linked}/>}
      {dialog === 'device' && <div className="tv-pair-content"><p>{device.data?.device.name}</p><p>{t('confirmDisconnect')}</p><button onClick={() => void unlink()}>{t('disconnect')}</button><TvQr value={`${tvOrigin()}/tv/pair`} label={t('devices')}/><p>{t('devices')}</p></div>}
      {detail && <TvQuoteDetail quote={detail} language={settings.language} now={now}/>}
      {story && <div className="tv-detail"><div><h3>{story.title}</h3><p>{story.source} · {tvTime(story.publishedAt,settings.language,true)}</p></div><div className="tv-phone-link"><TvQr value={story.url} label={t('openStory')}/><p>{t('openStory')}</p></div></div>}
    </section></div>}
  </div>;
}
