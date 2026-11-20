'use client';
import { tvFetch, tvOrigin } from '@/lib/markets-tv/client';
import { tvPairErrorText, tvPairHttpError, validTvPair, type TvPairError } from '@/lib/markets-tv/pairing';
import { useEffect, useRef, useState } from 'react';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { tvQuotePrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { TvQr } from './TvQr';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { useTvResource } from './useTvResource';
import { tvSceneHasPrice, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { tvQuoteMovement } from '@/lib/markets-tv/quote-presentation';
import { tvAnalysisAssetType, tvAnalysisHref } from '@/lib/markets-tv/analysisLink';

export { TvSettingsPanel } from './TvSettingsPanel';

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
  const move = tvQuoteMovement(tvSceneHasPrice(quote) ? quote.changePercent : null);
  const basis = quote.changeBasis === 'session' ? 'session' : quote.changeBasis === '24h' ? 'day' : quote.changeBasis === 'reference' ? 'referenceBasis' : 'unknownBasis';
  const valid = result && result.status === 'COMPLETE' && result.confidenceCalculation?.minimumEvidenceMet && !result.staleData && Date.parse(result.expiresAt) > now;
  return <div className="tv-detail">
    <div className="tv-detail-facts"><bdi className="tv-symbol">{quote.displaySymbol || quote.symbol}</bdi>
      <div className="tv-detail-values"><div className="tv-detail-price" dir="ltr">{tvQuotePrice(quote)} <small>{tvSceneQuoteUnit(quote, language)}</small></div>
        {move.trend !== 'unknown' && <span className="tv-detail-change" data-trend={move.trend}><bdi dir="ltr">{move.value}</bdi> {tvSceneText(language, basis)}</span>}</div>
      <TvQuoteEvidence quote={quote} language={language} now={now}/>
      <h3>{t('ai')}</h3>{analysis.loading ? <p role="status">{t('loadingSavedAnalysis')}</p> : valid ? <>
        <p className="tv-recommendation">{t(result.recommendation)}</p><p>{t('confidence')}: {result.confidence} / 100 · {t('risk')}: {t(result.risk)}</p>
        <p>{t('source')}: The SFM AI Analyst · {result.confidenceCalculation.methodologyVersion}</p><p>{t('analysisTime')}: {tvTime(result.generatedAt, language, true)}</p>
      </> : <p role="status">{t(analysis.error && analysis.errorStatus !== 404 ? 'analysisUnavailable' : result ? 'analysisExpired' : 'noAnalysis')}</p>}
      <p className="tv-muted">{t('disclaimer')}</p>
    </div>
    <div className="tv-phone-link"><a href={phoneUrl} aria-label={t('openPhone')}><TvQr value={phoneUrl} label={t('openPhone')} /></a><p>{t('openPhone')}</p></div>
  </div>;
}
export { TvBrief } from './TvBrief';
