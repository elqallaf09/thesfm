'use client';
import { tvFetch, tvOrigin } from '@/lib/markets-tv/client';
import { useEffect, useState } from 'react';
import { TV_GROUPS, type TvGroup, type TvLanguage, type TvQuote, type TvSettings, type TvSnapshot } from '@/lib/markets-tv/types';
import { tvPrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { quoteStatus, tvMovers } from '@/lib/markets-tv/quotes';
import { TV_MAP_POINTS } from '@/lib/markets-tv/catalog';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { TvQr } from './TvQr';
import { useTvResource } from './useTvResource';

export function TvSettingsPanel({ settings, change, stripsOnly = false }: { settings: TvSettings; change: (value: TvSettings) => void; stripsOnly?: boolean }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(settings.language, key);
  const toggle = (key: 'autoRotate' | 'ticker' | 'sound') => change({ ...settings, [key]: !settings[key] });
  return <div className="tv-settings">
    <div className="tv-setting-row"><span>{t('language')}</span><div className="tv-segment">{(['ar','en','fr'] as const).map((lang,i) => <button key={lang} aria-pressed={settings.language === lang} onClick={() => change({ ...settings, language: lang })}>{['العربية','English','Français'][i]}</button>)}</div></div>
    <div className="tv-setting-row"><span>{t('theme')}</span><div className="tv-segment">{(['dark','light'] as const).map(theme => <button key={theme} aria-pressed={settings.theme === theme} onClick={() => change({ ...settings, theme })}>{t(theme)}</button>)}</div></div>
    {!stripsOnly && <>
    <div className="tv-setting-row"><span>{t('layout')}</span><div className="tv-segment">{(['balanced','quotes'] as const).map(layout => <button key={layout} aria-pressed={settings.layout === layout} onClick={() => change({ ...settings, layout })}>{t(layout)}</button>)}</div></div>
    {(['autoRotate','ticker','sound'] as const).map(key => <div className="tv-setting-row" key={key}><span>{t(key)}</span><button role="switch" aria-checked={settings[key]} onClick={() => toggle(key)}>{t(settings[key] ? 'enabled' : 'disabled')}</button></div>)}
    <div className="tv-setting-row"><span>{t('rotationSeconds')}</span><div className="tv-segment">{[20,30,60,120].map(seconds => <button key={seconds} aria-pressed={settings.rotationSeconds === seconds} onClick={() => change({ ...settings, rotationSeconds: seconds })}>{seconds}</button>)}</div></div>
    </>}
    <div className="tv-setting-row"><span>{t('stripDensity')}</span><div className="tv-segment">{(['comfortable','compact'] as const).map(density => <button key={density} aria-pressed={(settings.stripDensity || 'comfortable') === density} onClick={() => change({ ...settings, stripDensity: density })}>{t(density)}</button>)}</div></div>
    <div className="tv-setting-row"><span>{t('stripSpeed')}</span><div className="tv-segment">{([20,32,44] as const).map((speed,i) => <button key={speed} aria-pressed={(settings.stripSpeed || 32) === speed} onClick={() => change({ ...settings, stripSpeed: speed })}>{t((['slow','normal','fast'] as const)[i])}</button>)}</div></div>
    <h3>{t('visibleMarkets')}</h3><div className="tv-group-options">{TV_GROUPS.map(group => <button key={group} aria-pressed={settings.groups.includes(group)} onClick={() => {
      const groups = settings.groups.includes(group) ? settings.groups.filter(g => g !== group) : [...settings.groups, group];
      if (groups.length) change({ ...settings, groups });
    }}>{t(group)}</button>)}</div>
    {!stripsOnly && <p className="tv-muted">{t('alertScope')}</p>}
  </div>;
}
export function TvPairPanel({ language, onLinked }: { language: TvLanguage; onLinked: (token: string) => void }) {
  const [pair, setPair] = useState<{ code: string; secret: string; expiresAt: string } | null>(null);
  const [error, setError] = useState(false), [expired, setExpired] = useState(false), [busy, setBusy] = useState(false);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  async function create() {
    setBusy(true); setError(false); setExpired(false); setPair(null);
    try {
      const response = await tvFetch('/api/tv/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'The SFM TV' }) });
      if (!response.ok) throw new Error(); setPair(await response.json());
    } catch { setError(true); } finally { setBusy(false); }
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
        if (response.ok && payload.state === 'active' && typeof payload.token === 'string') { onLinked(payload.token); return; }
        if (response.status === 410) { setExpired(true); return; }
      } catch { /* Recover on the next bounded poll until the code expires. */ }
      finally { clearTimeout(timeout); pending = false; }
      if (!stopped) timer = setTimeout(() => void poll(), 5000);
    }
    timer = setTimeout(() => void poll(), 5000);
    return () => { stopped = true; controller?.abort(); clearTimeout(timer); };
  }, [pair, onLinked]);
  const link = pair && typeof window !== 'undefined' ? `${tvOrigin()}/tv/pair#${pair.code}` : '';
  return <div className="tv-pair-content">
    {pair && !expired ? <><TvQr value={link} label={t('scan')} /><p>{t('scan')}</p><strong className="tv-pair-code" dir="ltr">{pair.code.match(/.{1,4}/g)?.join(' — ')}</strong><p>{t('waiting')}</p><p dir="ltr" className="tv-muted">{typeof window !== 'undefined' ? `${tvOrigin()}/tv/pair` : '/tv/pair'}</p></> : <>
      <p>{t(error ? 'pairUnavailable' : expired ? 'pairExpired' : 'scan')}</p><button disabled={busy} onClick={() => void create()}>{t(busy ? 'loading' : 'newCode')}</button>
    </>}
  </div>;
}
export function TvQuoteDetail({ quote, language, now }: { quote: TvQuote; language: TvLanguage; now: number }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const scoped = quote.exchange?.startsWith('TD_');
  const pair = quote.exchange === 'BINANCE' || quote.exchange === 'FOREX';
  const url = scoped ? `/world-stocks/${encodeURIComponent(quote.symbol)}?region=${encodeURIComponent(quote.exchange!)}` : `/ai-analyst/analyze/${encodeURIComponent(quote.symbol)}`;
  const assetType = quote.exchange === 'FOREX' || quote.symbol.includes('=X') ? 'FOREX' : quote.exchange === 'BINANCE' ? 'CRYPTO' : /-(USD|USDT)$/.test(quote.symbol) ? 'CRYPTO' : /[=]F$/.test(quote.symbol) ? 'COMMODITY' : quote.symbol.startsWith('^') ? 'INDEX' : 'STOCK';
  const analysis = useTvResource<{ result: AnalysisResult }>(scoped || pair ? null : `/api/intelligence/latest?symbol=${encodeURIComponent(quote.symbol)}&assetType=${assetType}&locale=${language}`, 300000);
  const result = analysis.data?.result;
  const valid = result && result.status === 'COMPLETE' && result.confidenceCalculation.minimumEvidenceMet && !result.staleData && Date.parse(result.expiresAt) > now;
  return <div className="tv-detail">
    <div><span dir="ltr" className="tv-symbol">{quote.symbol}</span><h3>{language === 'ar' ? quote.nameAr : quote.name}</h3>
      <div className="tv-detail-price" dir="ltr">{tvPrice(quote.price, quote.currency)} <small>{quote.currency}</small></div>
      <p>{quote.source || '—'} · {tvTime(quote.observedAt, language, true)} · {t(quoteStatus(quote, now))}</p>
      <h3>{t('ai')}</h3>{analysis.loading ? <p>{t('loading')}</p> : valid ? <>
        <p className="tv-recommendation">{t(result.recommendation)}</p><p>{t('confidence')}: {result.confidence} / 100 · {t('risk')}: {t(result.risk)}</p>
        <p>{t('source')}: The SFM AI Analyst · {result.confidenceCalculation.methodologyVersion}</p><p>{t('analysisTime')}: {tvTime(result.generatedAt, language, true)}</p>
      </> : <p>{t(result ? 'analysisExpired' : 'noAnalysis')}</p>}
      <p className="tv-muted">{t('disclaimer')}</p>
    </div>
    <div className="tv-phone-link"><TvQr value={`${typeof window !== 'undefined' ? tvOrigin() : 'https://www.the-sfm.com'}${url}`} label={t('openPhone')} /><p>{t('openPhone')}</p></div>
  </div>;
}
export function TvMarketMap({ language, group, select, now }: { language: TvLanguage; group: TvGroup; select: (group: TvGroup) => void; now: number }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  return <section className="tv-map-panel"><div className="tv-map" role="group" aria-label={t('map')}>
    {TV_MAP_POINTS.map(point => <button key={point.group} className="tv-map-point" aria-pressed={group === point.group} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => select(point.group)}>
      <strong>{t(point.group)}</strong><span>{new Intl.DateTimeFormat(`${language}-u-nu-latn`, { timeZone: point.zone, hour: '2-digit', minute: '2-digit' }).format(now)}</span>
    </button>)}
  </div><p className="tv-muted">{t('localTime')}</p></section>;
}
export function TvBrief({ snapshot, language, now, select }: { snapshot: TvSnapshot | null; language: TvLanguage; now: number; select: (quote: TvQuote) => void }) {
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const movers = tvMovers(snapshot?.quotes || [], now);
  return <div className="tv-brief"><div className="tv-brief-lead"><span>{t('coverage')}</span><strong>{snapshot?.available ?? '—'} <small>/ {snapshot?.total ?? '—'}</small></strong><p>{t('subset')}</p></div>
    {(['gainers','losers'] as const).map(kind => <section key={kind}><h3>{t(kind)}</h3>{movers[kind].length ? movers[kind].map(q => <button className="tv-mover" key={q.symbol} onClick={() => select(q)}><span dir="ltr">{q.symbol}</span><strong dir="ltr" data-trend={kind === 'gainers' ? 'up' : 'down'}>{q.changePercent! > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%</strong><small>{q.source} · {tvTime(q.observedAt, language, true)}</small></button>) : <p className="tv-muted">{t('nothingRanked')}</p>}</section>)}<p className="tv-muted">{t('sample')}</p>
  </div>;
}
