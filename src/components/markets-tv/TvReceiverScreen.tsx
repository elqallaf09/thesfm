'use client';
import './receiver.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from 'lucide-react';
import type { TvLanguage, TvMarket, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import type { TvReceiverChannel } from '@/lib/markets-tv/receiver';
import { TvReceiverNews } from './TvReceiverNews';
import { receiverText } from '@/lib/markets-tv/receiver';
import { TV_BROADCAST_PAGE_MS } from '@/lib/markets-tv/broadcast';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import { useTvResource } from './useTvResource';
import { TvStripQuote } from './TvStripQuote';

type Channel = Exclude<TvReceiverChannel, 'sessions' | 'investments'>;
type Props = { channel: Channel; language: TvLanguage; now: number; revision: number; playing: boolean;
  togglePlay: () => void; onQuote: (quote: TvQuote) => void; onStory: (story: TvNews) => void; onRefresh: () => void };
const EMPTY_MARKETS: TvMarket[] = [];
const KUWAIT: TvMarket = { id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait', labelFr: 'Bourse du Koweït', count: 0, status: 'unknown' };

export default function TvReceiverScreen({ channel, language, now, revision, playing, togglePlay, onQuote, onStory, onRefresh }: Props) {
  const newsOnly = channel !== 'allStocks' && channel !== 'kuwait';
  const catalog = useTvResource<{ markets: TvMarket[] }>(channel === 'allStocks' ? '/api/tv/catalog' : null, 300000, '', revision);
  const sourceMarkets = catalog.data?.markets || EMPTY_MARKETS;
  const markets = useMemo(() => sourceMarkets.filter(m => ['world','us','gulf','europe','asia'].includes(m.group)
    && !/XTAE|ISRAEL/i.test(m.id)), [sourceMarkets]);
  const [selected, setSelected] = useState(''), [marketIndex, setMarketIndex] = useState(0);
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState(6);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 761px) and (max-height: 650px)');
    const fit = () => { setPageSize(query.matches ? 4 : 6); setCursors({}); };
    fit(); query.addListener(fit); return () => query.removeListener(fit);
  }, []);
  const market = channel === 'kuwait' ? KUWAIT : markets.find(m => m.id === selected) || markets[marketIndex % Math.max(1, markets.length)];
  const page = market ? cursors[market.id] || 0 : 0;
  const snapshot = useTvResource<TvSnapshot>(!newsOnly && market
    ? `/api/tv/snapshot?group=${market.group}&market=${market.id}&page=${page}&pageSize=${pageSize}` : null, 30000, '', revision);
  const pages = Math.max(1, Math.ceil((snapshot.data?.directoryTotal ?? market?.count ?? 0) / pageSize));
  const sourceCooling = tvStripSourceCooling(snapshot.data?.quotes || [], snapshot.data?.retryAt, now);
  const step = useCallback((direction: number) => {
    if (!market) return;
    setCursors(current => ({ ...current, [market.id]: ((current[market.id] || 0) + direction + pages) % pages }));
    // In the all-markets broadcast each exchange gets airtime every cycle;
    // remember its batch instead of waiting hours to finish one large exchange.
    if (channel === 'allStocks' && !selected) setMarketIndex(value => (value + direction + markets.length) % Math.max(1, markets.length));
  }, [market, pages, channel, selected, markets.length]);
  useEffect(() => {
    if (!playing || snapshot.error || sourceCooling || newsOnly || !market || (pages < 2 && (selected || markets.length < 2))) return;
    const timer = setInterval(() => { if (!document.hidden) step(1); }, TV_BROADCAST_PAGE_MS);
    return () => clearInterval(timer);
  }, [playing, snapshot.error, sourceCooling, newsOnly, market, pages, selected, markets.length, step]);
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const label = market ? language === 'ar' ? market.labelAr : language === 'fr' ? market.labelFr : market.labelEn : '—';
  const quotes = snapshot.data?.quotes || [];
  return <main className={`tv-receiver-screen tv-receiver-${channel}${newsOnly ? ' tv-receiver-news-only' : ''}`}>
    <header className="tv-receiver-heading"><div><h1>{receiverText(language, channel)}</h1><p>{receiverText(language, channel === 'allStocks' ? 'allHelp' : channel === 'kuwait' ? 'kuwaitHelp' : channel === 'shariaNews' ? 'shariaHelp' : 'newsHelp')}</p></div>
      <div className="tv-receiver-actions">
        {channel === 'allStocks' && <label>{receiverText(language, 'market')}<select value={selected} onChange={event => { setSelected(event.target.value); setCursors({}); }}>
          <option value="">{t('allMarkets')}</option>{markets.map(m => <option key={m.id} value={m.id}>{language === 'ar' ? m.labelAr : language === 'fr' ? m.labelFr : m.labelEn}</option>)}
        </select></label>}
        <button aria-label={t(playing ? 'pause' : 'resume')} aria-pressed={playing} onClick={togglePlay}>{playing ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}</button>
        <button aria-label={t('refresh')} onClick={onRefresh}><RefreshCw aria-hidden="true"/></button>
      </div>
    </header>
    {newsOnly ? <TvReceiverNews language={language} channel={channel} now={now} revision={revision} onStory={onStory} onRefresh={onRefresh} playing={playing}/> : <div className="tv-receiver-content">
      <section className="tv-receiver-market" aria-busy={snapshot.loading || catalog.loading}>
        <header><h2>{label}</h2><span>{t('coverage')}: <bdi>{snapshot.data ? `${snapshot.data.available} / ${snapshot.data.total}` : '—'}</bdi></span>
          <div><button aria-label={t('previous')} onClick={() => step(-1)} disabled={!market}><ChevronLeft aria-hidden="true"/></button><bdi>{page + 1} / {pages}</bdi><button aria-label={t('next')} onClick={() => step(1)} disabled={!market}><ChevronRight aria-hidden="true"/></button></div>
        </header>
        {(snapshot.error || catalog.error) && <p className="tv-receiver-notice" role="status">{t('error')} <button onClick={onRefresh}>{t('retry')}</button></p>}
        {quotes.length ? <div className="tv-receiver-quotes">{quotes.slice(0, pageSize).map(quote => <TvStripQuote key={`${quote.exchange}:${quote.symbol}`} quote={quote} group={market?.group || 'world'} language={language} now={now} duplicate={false} onQuote={onQuote}/>)}</div>
          : <div className="tv-receiver-empty" role="status">{t(snapshot.loading || catalog.loading ? 'loading' : 'noPrices')}</div>}
      </section>
      {channel === 'kuwait' && <TvReceiverNews language={language} channel={channel} now={now} revision={revision} onStory={onStory} onRefresh={onRefresh} playing={playing}/>}
    </div>}
  </main>;
}
