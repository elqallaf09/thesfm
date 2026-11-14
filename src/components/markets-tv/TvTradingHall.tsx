'use client';
import './trading-hall.css';
import { useState } from 'react';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { tvSceneHasPrice } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { TvQuoteTable } from './TvQuoteTable';
import { TvHallSessions } from './TvHallSessions';
import { TvHeadlineBand } from './TvHeadlineBand';
import { TvQuoteMarquee } from './TvQuoteMarquee';
import { useTvTableSize } from './useTvTableSize';
import { useTvBroadcastPage } from './useTvBroadcastPage';

export function TvTradingHall({ snapshot, loading, error, language, now, news, newsLoading, newsError, selected, paused, ticker, speed, onQuote, onStory, onRefresh, onAllStocks, onTickerPause }: {
  snapshot: TvSnapshot | null; loading: boolean; error: string | null; language: TvLanguage; now: number; news: TvNews[]; newsLoading?: boolean; newsError?: string | null; selected?: string[];
  paused: boolean; ticker: boolean; speed: number; onQuote: (quote: TvQuote) => void; onStory: (story: TvNews) => void; onRefresh: () => void; onAllStocks: () => void; onTickerPause: () => void;
}) {
  const rows = (snapshot?.quotes.length ? snapshot.quotes : snapshot?.summary ?? []).filter(tvSceneHasPrice).slice(0, 6);
  const size = useTvTableSize(), pages = Math.max(1, Math.ceil(rows.length / size));
  const [focused, setFocused] = useState(false);
  const { current, move } = useTvBroadcastPage(pages, !paused && !focused);
  const all = Array.from(new Map([...(snapshot?.summary ?? []), ...rows].map(quote => [`${quote.exchange}:${quote.symbol}`, quote])).values());
  return <main className="tv-hall-content">
    <div className="tv-hall-title"><div><span>{hallText(language, 'sample')}</span><h1>{hallText(language, 'hall')}</h1></div><button onClick={onAllStocks} data-tv-focus-key="all-stocks">{hallText(language, 'allStocks')} ←</button></div>
    {error && <div className="tv-hall-error" role="status">{tvText(language, 'error')} <button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>}
    <div className="tv-hall-main"><section className="tv-hall-market-table" onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}><TvQuoteTable items={rows.slice(current * size, (current + 1) * size)} quotes={rows} language={language} now={now} loading={loading} emptyReason={error ? 'error' : 'prices'} select={onQuote}/>{pages > 1 && <div className="tv-hall-row-pager"><button onClick={() => move((current + pages - 1) % pages)}>{tvText(language, 'previous')}</button><bdi>{current + 1} / {pages}</bdi><button onClick={() => move((current + 1) % pages)}>{tvText(language, 'next')}</button></div>}</section><TvHallSessions language={language} now={now} selected={selected} paused={paused}/></div>
    <TvHeadlineBand newsLoading={newsLoading} newsError={newsError} onRetry={onRefresh} news={news} language={language} paused={paused} onStory={onStory}/>
    {ticker && <TvQuoteMarquee quotes={all} language={language} now={now} paused={paused} speed={speed} select={onQuote} toggle={onTickerPause}/>}
  </main>;
}
