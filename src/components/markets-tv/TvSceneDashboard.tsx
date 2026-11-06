'use client';

import { memo, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, LayoutGrid, List, RefreshCw } from 'lucide-react';
import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneChange, tvSceneHasPrice, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence as QuoteEvidence } from './TvQuoteEvidence';
import { TvOverview, TvPriceError } from './TvOverview';
import { TvWholeTicker as SceneTicker } from './TvWholeTicker';
import { TvSceneSidebar } from './TvSceneSidebar';

type SceneSnapshot = TvSnapshot & { summary?: TvQuote[]; selectionTotal?: number };
type Props = {
  overview?: boolean; snapshot: SceneSnapshot | null; loading: boolean; error: string | null; language: TvLanguage;
  now: number; news: TvNews[]; linked: boolean; watchlist: boolean;
  ticker: boolean; tickerPaused: boolean; speed: number;
  onQuote: (quote: TvQuote) => void; onStory: (story: TvNews) => void;
  onPair: () => void; onRefresh: () => void; onTickerPause: () => void;
};

function quoteKey(quote: TvQuote) { return `${quote.exchange || ''}:${quote.symbol}:${quote.currency || ''}`; }

function QuoteChange({ quote, language }: { quote: TvQuote; language: TvLanguage }) {
  const change = tvSceneHasPrice(quote) ? quote.changePercent : null;
  const basis = quote.changeBasis === '24h' ? 'day' : quote.changeBasis === 'session' ? 'session'
    : quote.changeBasis === 'reference' ? 'referenceBasis' : 'unknownBasis';
  return <span className="tv-scene-change" data-trend={change === null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'}>
    <span dir="ltr">{change !== null && change > 0 ? <ArrowUp aria-hidden="true"/> : change !== null && change < 0 ? <ArrowDown aria-hidden="true"/> : null}{change === null ? '—' : tvSceneChange(quote)}</span>
    {change !== null && <small>{tvSceneText(language, basis)}</small>}
  </span>;
}

function SummaryQuote({ quote, language, now, select }: { quote: TvQuote; language: TvLanguage; now: number; select: (quote: TvQuote) => void }) {
  const priced = tvSceneHasPrice(quote);
  return <button className="tv-scene-summary" data-priced={priced} onClick={() => select(quote)} data-tv-focus-key={`summary:${quoteKey(quote)}`}>
    <span className="tv-scene-summary-name"><span>{language === 'ar' ? quote.nameAr : quote.name}</span><i className="tv-scene-quote-dot" data-status={priced ? quoteStatus(quote, now) : 'unavailable'} aria-hidden="true"/></span>
    {priced ? <><span className="tv-scene-summary-value" dir="ltr">{tvQuotePrice(quote)}<small>{tvSceneQuoteUnit(quote, language)}</small></span>
      <QuoteChange quote={quote} language={language}/></> : <span className="tv-scene-summary-placeholder" dir="ltr"><strong>—</strong><span className="tv-scene-summary-code">{quote.displaySymbol || quote.symbol}</span></span>}
    <QuoteEvidence quote={quote} language={language} now={now}/>
  </button>;
}

export const TvSceneDashboard = memo(function TvSceneDashboard({ overview = false, snapshot, loading, error, language, now, news, linked, watchlist, ticker, tickerPaused, speed, onQuote, onStory, onPair, onRefresh, onTickerPause }: Props) {
  const [view, setView] = useState<'list' | 'heatmap'>('list');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(language, key);
  const { summaries, rows, all, tickerQuotes } = useMemo(() => {
    const summaries = snapshot?.summary?.slice(0, overview ? 6 : 4) ?? snapshot?.quotes.slice(0, overview ? 6 : 4) ?? [];
    const snapshotRows = snapshot?.summary ? snapshot.quotes.slice(0, 6) : snapshot?.quotes.slice(4, 10) ?? [];
    const rows = watchlist && !snapshotRows.length ? summaries : snapshotRows;
    const all = Array.from(new Map([...summaries, ...rows].map(quote => [quoteKey(quote), quote])).values());
    return {
      summaries, rows, all,
      tickerQuotes: all.filter(tvSceneHasPrice),
    };
  }, [snapshot, watchlist, overview]);
  const emptyWatchlist = watchlist && Boolean(snapshot) && all.length === 0;
  const rowsPriced = rows.some(tvSceneHasPrice);
  const heatmap = rows.filter(quote => tvSceneHasPrice(quote) && quote.changePercent !== null
    && ['available', 'delayed', 'closed'].includes(quoteStatus(quote, now)));

  if (watchlist && !linked) return <main className="tv-viewing-empty"><h1>{t('linkForWatchlist')}</h1><button onClick={onPair}>{t('pair')}</button></main>;

  return <>
    {error && <div className="tv-scene-notice" role="status"><span>{snapshot ? s('retainedDuringRetry') : t('error')}</span><button onClick={onRefresh}><RefreshCw aria-hidden="true"/>{t('retry')}</button></div>}
    {overview ? <TvOverview quotes={all} language={language} now={now} news={news} loading={loading} onQuote={onQuote} onStory={onStory} onRefresh={onRefresh}/> : <>
    <section className="tv-scene-summaries" aria-label={t('markets')} aria-busy={loading && !snapshot}>
      {summaries.map(quote => <SummaryQuote key={quoteKey(quote)} quote={quote} language={language} now={now} select={onQuote}/>)}
      {!summaries.length && (loading ? Array.from({ length: 4 }, (_, index) => <div key={index} className="tv-scene-summary tv-scene-skeleton" aria-hidden="true"><span/><span/><span/></div>)
        : <p className="tv-scene-summary-empty">{s('noSummaries')}</p>)}
    </section>
    <main className="tv-scene-body" aria-busy={loading && !snapshot}>
      <section className="tv-scene-quotes" aria-labelledby="tv-scene-quotes-title">
        <div className="tv-scene-panel-heading"><div><h2 id="tv-scene-quotes-title">{s(view === 'list' ? 'quoteList' : 'heatmap')}</h2><p>{s('marketSample')}</p></div>
          <div className="tv-scene-view-buttons" role="group" aria-label={t('layout')}>
            <button onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label={s('quoteList')} data-tv-focus-key="scene-list"><List aria-hidden="true"/></button>
            <button onClick={() => setView('heatmap')} aria-pressed={view === 'heatmap'} aria-label={s('heatmap')} data-tv-focus-key="scene-heatmap"><LayoutGrid aria-hidden="true"/></button>
          </div>
        </div>
        {loading && !snapshot ? <div className="tv-scene-loading" role="status"><RefreshCw className="tv-spin" aria-hidden="true"/><span>{t('loading')}</span></div> : view === 'heatmap' ? <>
          {heatmap.length ? <div className="tv-scene-heatmap">{heatmap.map(quote => <button key={quoteKey(quote)} onClick={() => onQuote(quote)} data-tv-focus-key={`heatmap:${quoteKey(quote)}`} data-trend={quote.changePercent! > 0 ? 'up' : quote.changePercent! < 0 ? 'down' : 'flat'}>
            <span className="tv-scene-heatmap-name">{language === 'ar' ? quote.nameAr : quote.name}</span><strong dir="ltr">{quote.displaySymbol || quote.symbol}</strong>
            <QuoteChange quote={quote} language={language}/><QuoteEvidence quote={quote} language={language} now={now}/>
          </button>)}</div> : <div className="tv-scene-no-data"><p>{emptyWatchlist ? t('emptyWatchlist') : s('noHeatmap')}</p>{rows.length > 0 && <button onClick={() => setView('list')}>{s('quoteList')}</button>}</div>}
        </> : rows.length ? <div className="tv-scene-table" data-empty={!rowsPriced}>
          <div className="tv-scene-table-head" aria-hidden="true"><span>{s('identity')}</span>{rowsPriced ? <><span>{s('price')}</span><span>{s('change')}</span><span>{s('evidence')}</span></> : <span>{t('provider')}</span>}</div>
          <div className="tv-scene-rows">{rows.filter(tvSceneHasPrice).map(quote => <button className="tv-quote tv-scene-row" data-priced={tvSceneHasPrice(quote)} key={quoteKey(quote)} onClick={() => onQuote(quote)} data-tv-focus-key={`quote:${quoteKey(quote)}`}>
            <span className="tv-scene-identity"><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong><span dir="ltr">{quote.displaySymbol || quote.symbol}</span></span>
            {tvSceneHasPrice(quote) && <><span className="tv-scene-price" dir="ltr"><strong>{tvQuotePrice(quote)}</strong><small>{tvSceneQuoteUnit(quote, language)}</small></span>
              <QuoteChange quote={quote} language={language}/></>}<QuoteEvidence quote={quote} language={language} now={now}/>
          </button>)}{rows.filter(q=>!tvSceneHasPrice(q)).map(quote=><article className="tv-unavailable-card" key={quoteKey(quote)}><strong>{language==='ar'?quote.nameAr:quote.name}</strong><TvPriceError quote={quote} language={language} retry={onRefresh}/></article>)}</div>
        </div> : <div className="tv-scene-no-data"><h3>{emptyWatchlist ? t('emptyWatchlist') : s('noScenePrices')}</h3><button onClick={onRefresh}><RefreshCw aria-hidden="true"/>{t('retry')}</button></div>}
      </section>
      <TvSceneSidebar quotes={all} news={news} language={language} now={now} snapshot={snapshot} loading={loading} onStory={onStory} onQuote={onQuote} onRefresh={onRefresh}/>
    </main></>}
    {ticker && <SceneTicker quotes={tickerQuotes} language={language} now={now} paused={tickerPaused} speed={speed} select={onQuote} toggle={onTickerPause}/>}
  </>;
});
