'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, LayoutGrid, List, Pause, Play, RefreshCw } from 'lucide-react';
import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvPrice, tvText, tvTime } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneChange, tvSceneHasPrice, tvSceneIssue, tvSceneQuoteUnit, tvSceneText } from '@/lib/markets-tv/scene-display';

type SceneSnapshot = TvSnapshot & { summary?: TvQuote[]; selectionTotal?: number };
type Props = {
  snapshot: SceneSnapshot | null; loading: boolean; error: string | null; language: TvLanguage;
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

function QuoteEvidence({ quote, language, now }: { quote: TvQuote; language: TvLanguage; now: number }) {
  const status = tvSceneHasPrice(quote) ? quoteStatus(quote, now) : 'unavailable';
  return <span className="tv-scene-evidence">
    <span className="tv-status" data-status={status}>{status === 'available' ? tvSceneText(language, 'latestQuote') : tvText(language, status)}</span>
    <span className="tv-scene-source" dir="auto">{quote.source || tvText(language, 'unavailable')}</span>
    <time dateTime={quote.observedAt || undefined}>{tvTime(quote.observedAt, language, true)}</time>
  </span>;
}

function SummaryQuote({ quote, language, now, select }: { quote: TvQuote; language: TvLanguage; now: number; select: (quote: TvQuote) => void }) {
  return <button className="tv-scene-summary" onClick={() => select(quote)} data-tv-focus-key={`summary:${quoteKey(quote)}`}>
    <span className="tv-scene-summary-name">{language === 'ar' ? quote.nameAr : quote.name}</span>
    <span className="tv-scene-summary-value" dir="ltr">{tvSceneHasPrice(quote) ? tvPrice(quote.price, quote.currency) : '—'}<small>{tvSceneQuoteUnit(quote, language)}</small></span>
    <QuoteChange quote={quote} language={language}/>
    <QuoteEvidence quote={quote} language={language} now={now}/>
  </button>;
}

function SceneTicker({ quotes, language, now, paused, speed, select, toggle }: {
  quotes: TvQuote[]; language: TvLanguage; now: number; paused: boolean; speed: number;
  select: (quote: TvQuote) => void; toggle: () => void;
}) {
  const set = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(60);
  const identity = quotes.map(quoteKey).join('|');
  useEffect(() => {
    const element = set.current;
    if (!element) return;
    const measure = () => setDuration(Math.max(12, element.scrollWidth / Math.max(20, speed)));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [identity, speed]);
  if (!quotes.length) return null;
  return <section className="tv-scene-ticker" aria-label={tvSceneText(language, 'ticker')} data-paused={paused}>
    <button onClick={toggle} aria-label={tvSceneText(language, paused ? 'resumeTicker' : 'pauseTicker')} aria-pressed={paused} data-tv-focus-key="ticker-pause">
      {paused ? <Play aria-hidden="true"/> : <Pause aria-hidden="true"/>}<span>{tvSceneText(language, 'ticker')}</span>
    </button>
    <div className="tv-scene-ticker-window"><div className="tv-scene-ticker-track" style={{ animationDuration: `${duration}s` }}>
      {[false, true].map(duplicate => <div key={String(duplicate)} ref={duplicate ? undefined : set} className="tv-scene-ticker-set" aria-hidden={duplicate || undefined}>
        {quotes.map(quote => <button key={quoteKey(quote)} tabIndex={duplicate ? -1 : undefined} onClick={() => select(quote)} data-tv-focus-key={duplicate ? undefined : `ticker:${quoteKey(quote)}`}>
          <strong dir="ltr">{quote.displaySymbol || quote.symbol}</strong><span dir="ltr">{tvPrice(quote.price, quote.currency)} <small>{tvSceneQuoteUnit(quote, language)}</small></span>
          <span dir="ltr" data-trend={quote.changePercent === null || quote.changePercent === 0 ? 'flat' : quote.changePercent > 0 ? 'up' : 'down'}>{tvSceneChange(quote)}</span>
          <small className="tv-scene-ticker-evidence">{quote.source || tvText(language, 'unavailable')} · {tvText(language, quoteStatus(quote, now))} · {tvTime(quote.observedAt, language, true)}</small>
        </button>)}
      </div>)}
    </div></div>
  </section>;
}

export const TvSceneDashboard = memo(function TvSceneDashboard({ snapshot, loading, error, language, now, news, linked, watchlist, ticker, tickerPaused, speed, onQuote, onStory, onPair, onRefresh, onTickerPause }: Props) {
  const [view, setView] = useState<'list' | 'heatmap'>('list');
  const t = (key: Parameters<typeof tvText>[1]) => tvText(language, key);
  const s = (key: Parameters<typeof tvSceneText>[1]) => tvSceneText(language, key);
  const { summaries, rows, all, priced, unavailable, tickerQuotes } = useMemo(() => {
    const summaries = snapshot?.summary?.slice(0, 4) ?? snapshot?.quotes.slice(0, 4) ?? [];
    const snapshotRows = snapshot?.summary ? snapshot.quotes.slice(0, 6) : snapshot?.quotes.slice(4, 10) ?? [];
    const rows = watchlist && !snapshotRows.length ? summaries : snapshotRows;
    const all = Array.from(new Map([...summaries, ...rows].map(quote => [quoteKey(quote), quote])).values());
    return {
      summaries, rows, all, priced: rows.filter(tvSceneHasPrice), unavailable: all.filter(quote => !tvSceneHasPrice(quote)),
      tickerQuotes: all.filter(tvSceneHasPrice),
    };
  }, [snapshot, watchlist]);
  const emptyWatchlist = watchlist && Boolean(snapshot) && all.length === 0;
  const recent = all.filter(quote => tvSceneHasPrice(quote) && ['available', 'delayed'].includes(quoteStatus(quote, now))).length;
  const closed = all.filter(quote => tvSceneHasPrice(quote) && quoteStatus(quote, now) === 'closed').length;
  const retained = all.filter(quote => tvSceneHasPrice(quote) && !['available', 'delayed', 'closed'].includes(quoteStatus(quote, now))).length;
  const heatmap = rows.filter(quote => tvSceneHasPrice(quote) && quote.changePercent !== null
    && ['available', 'delayed', 'closed'].includes(quoteStatus(quote, now)));
  const visibleNews = news.slice(0, 2);

  if (watchlist && !linked) return <main className="tv-viewing-empty"><h1>{t('linkForWatchlist')}</h1><button onClick={onPair}>{t('pair')}</button></main>;

  return <>
    {error && <div className="tv-scene-notice" role="status"><span>{snapshot ? s('retainedDuringRetry') : t('error')}</span><button onClick={onRefresh}><RefreshCw aria-hidden="true"/>{t('retry')}</button></div>}
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
          </button>)}</div> : <p className="tv-scene-no-data">{emptyWatchlist ? t('emptyWatchlist') : s('noHeatmap')}</p>}
        </> : priced.length ? <div className="tv-scene-table">
          <div className="tv-scene-table-head" aria-hidden="true"><span>{s('identity')}</span><span>{s('price')}</span><span>{s('change')}</span><span>{s('evidence')}</span></div>
          <div className="tv-scene-rows">{priced.map(quote => <button className="tv-quote tv-scene-row" key={quoteKey(quote)} onClick={() => onQuote(quote)} data-tv-focus-key={`quote:${quoteKey(quote)}`}>
            <span className="tv-scene-identity"><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong><span dir="ltr">{quote.displaySymbol || quote.symbol}</span></span>
            <span className="tv-scene-price" dir="ltr"><strong>{tvPrice(quote.price, quote.currency)}</strong><small>{tvSceneQuoteUnit(quote, language)}</small></span>
            <QuoteChange quote={quote} language={language}/><QuoteEvidence quote={quote} language={language} now={now}/>
          </button>)}</div>
        </div> : <div className="tv-scene-no-data"><h3>{emptyWatchlist ? t('emptyWatchlist') : s('noScenePrices')}</h3><button onClick={onRefresh}><RefreshCw aria-hidden="true"/>{t('retry')}</button></div>}
      </section>
      <aside className="tv-scene-sidebar">
        <section className="tv-scene-health" aria-labelledby="tv-scene-coverage-title"><h2 id="tv-scene-coverage-title">{s('sceneCoverage')}</h2>
          <div className="tv-scene-coverage-total"><strong dir="ltr">{snapshot ? `${all.length - unavailable.length} / ${all.length}` : '—'}</strong><span>{s('quoted')}</span></div>
          <p>{s('selectedCoverage')}</p>
          <dl><div><dt>{s('recent')}</dt><dd dir="ltr">{snapshot ? recent : '—'}</dd></div><div><dt>{s('closePrices')}</dt><dd dir="ltr">{snapshot ? closed : '—'}</dd></div><div><dt>{s('otherPrices')}</dt><dd dir="ltr">{snapshot ? retained : '—'}</dd></div></dl>
          {unavailable.length > 0 && <details className="tv-scene-unavailable"><summary data-tv-focus-key="scene-unavailable">{s('missing')} <bdi>{unavailable.length}</bdi></summary><ul>{unavailable.map(quote => <li key={quoteKey(quote)}><button onClick={() => onQuote(quote)} data-tv-focus-key={`unavailable:${quoteKey(quote)}`}><strong>{language === 'ar' ? quote.nameAr : quote.name}</strong><span>{s(tvSceneIssue(quote.issue))}</span></button></li>)}</ul></details>}
        </section>
        <section className="tv-scene-headlines" aria-labelledby="tv-scene-news-title"><h2 id="tv-scene-news-title">{t('news')}</h2>{visibleNews.length ? visibleNews.map(story => <button key={story.id} onClick={() => onStory(story)} data-tv-focus-key={`story:${story.id}`}><span>{story.title}</span><small>{story.source} · {tvTime(story.publishedAt, language, true)}</small></button>) : <p>{t('noNews')}</p>}</section>
      </aside>
    </main>
    {ticker && <SceneTicker quotes={tickerQuotes} language={language} now={now} paused={tickerPaused} speed={speed} select={onQuote} toggle={onTickerPause}/>}
  </>;
});
