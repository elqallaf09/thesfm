'use client';
import './trading-hall.css';
import './stock-rotation.css';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { TvLanguage, TvMarket, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import type { TvInstrumentPage } from '@/lib/markets-tv/selections';
import { hallText } from '@/lib/markets-tv/hallText';
import { tvText } from '@/lib/markets-tv/i18n';
import { useTvResource } from './useTvResource';
import { TvQuoteTable } from './TvQuoteTable';
import { TvHeadlineBand } from './TvHeadlineBand';
import { TvQuoteMarquee } from './TvQuoteMarquee';
import { useTvTableSize } from './useTvTableSize';
import { tvSceneHasPrice, tvStripSourceCooling } from '@/lib/markets-tv/scene-display';
import { TvStockRotation } from './TvStockRotation';

export function TvAllStocks({ language, now, markets, ready, revision, news, newsLoading, newsError, paused, playing, suspended, newsPaused = false, ticker, speed, onQuote, onStory, onRefresh, onTickerPause, onPlayback }: {
  language: TvLanguage; now: number; markets: TvMarket[]; ready: boolean; revision: number; news: TvNews[]; newsLoading?: boolean; newsError?: string | null; paused: boolean; newsPaused?: boolean; ticker: boolean; speed: number;
  playing: boolean; suspended: boolean;
  onQuote: (quote: TvQuote) => void; onStory: (story: TvNews) => void; onRefresh: () => void; onTickerPause: () => void; onPlayback: () => void;
}) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [market, setMarket] = useState(''), [page, setPage] = useState(0);
  const [activity, setActivity] = useState(0), [filterFocused, setFilterFocused] = useState(false);
  const interact = useCallback(() => setActivity(value => value + 1), []);
  const PAGE_SIZE = useTvTableSize();
  const scope = `${market}:${query}:${PAGE_SIZE}`;
  const [totals, setTotals] = useState<{ scope: string; total: number; directoryTotal: number } | null>(null);
  useEffect(() => setPage(0), [PAGE_SIZE]);
  useEffect(() => {
    const nextQuery = search.trim();
    // An unchanged query, including the initial empty value, must not undo Next.
    if (nextQuery === query) return;
    const timer = setTimeout(() => { setQuery(nextQuery); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search, query]);
  const directoryPath = `/api/tv/instruments?${new URLSearchParams({ group: 'world', market, q: query, page: String(page), pageSize: String(PAGE_SIZE) })}`;
  const directory = useTvResource<TvInstrumentPage>(ready ? directoryPath : null, 300000, '', revision);
  const matchedTotal = directory.data?.total, directoryTotal = directory.data?.directoryTotal;
  useEffect(() => {
    if (matchedTotal === undefined || directoryTotal === undefined) return;
    setTotals(previous => previous?.scope === scope && previous.total === matchedTotal && previous.directoryTotal === directoryTotal
      ? previous : { scope, total: matchedTotal, directoryTotal });
  }, [scope, matchedTotal, directoryTotal]);
  // Keep counts stable while another page of the same selection is loading.
  const total = matchedTotal ?? (totals?.scope === scope ? totals.total : undefined);
  const fullTotal = directoryTotal ?? (totals?.scope === scope ? totals.directoryTotal : undefined);
  const items = directory.data?.items ?? [];
  const quotePath = items.length ? `/api/tv/snapshot?${new URLSearchParams({ group: 'world', ...(market ? { market } : {}), pageSize: String(PAGE_SIZE), symbols: JSON.stringify(items.map(item => item.symbol)) })}` : null;
  const quotes = useTvResource<TvSnapshot>(quotePath, 60000, '', revision);
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const priced = quotes.data?.quotes.filter(tvSceneHasPrice).length ?? 0;
  const cooling = tvStripSourceCooling(quotes.data?.quotes ?? [], quotes.data?.retryAt, now);
  const nextPage = useCallback(() => {
    // After the reading interval, give a disappearing row a stable focus target.
    // Leaving the pager focused must never prevent the next automatic page.
    if (document.activeElement?.closest('.tv-stock-page, .tv-stock-pagination')) {
      document.querySelector<HTMLButtonElement>('[data-tv-focus-key="stocks-playback"]')?.focus({ preventScroll: true });
    }
    setPage(value => (value + 1) % pages);
  }, [pages]);
  const waiting = !ready || !items.length || !quotes.data || quotes.loading || Boolean(quotes.error) || directory.loading || Boolean(directory.error) || cooling;
  const browsing = filterFocused || Boolean(search.trim()) || search.trim() !== query;
  const rotationStatus = hallText(language, directory.data && total === 0 && !directory.error ? 'noResults'
    : waiting ? 'stocksWaiting' : pages <= 1 ? 'stocksSinglePage' : browsing ? 'stocksBrowsing' : 'stocksPaused');
  function movePage(step: number) {
    const next = Math.max(0, Math.min(pages - 1, page + step));
    // Only move focus when its button will become unavailable at an endpoint.
    if (next === 0 && step < 0 || next === pages - 1 && step > 0) {
      document.querySelector<HTMLButtonElement>('[data-tv-focus-key="stocks-playback"]')?.focus({ preventScroll: true });
    }
    setPage(next);
  }
  // A catalog refresh can shrink the last page. Clamp only after that response arrives.
  useEffect(() => { if (directory.data && page >= pages) setPage(pages - 1); }, [directory.data, page, pages]);
  const exchanges = markets.filter(item => !['global', 'crypto', 'forex', 'commodities', 'watchlist'].includes(item.group));
  return <main className="tv-hall-content tv-all-stocks" onKeyDownCapture={interact} onPointerDownCapture={interact}
    onFocusCapture={event => setFilterFocused(event.target.matches('input,select'))}
    onBlurCapture={event => setFilterFocused(Boolean(event.relatedTarget instanceof HTMLElement && event.currentTarget.contains(event.relatedTarget) && event.relatedTarget.matches('input,select')))}>
    <div className="tv-hall-title"><div><span>{hallText(language, 'directory')}</span><h1>{hallText(language, 'allStocks')} <bdi>{fullTotal?.toLocaleString('en-US') ?? '—'}</bdi></h1></div><small>{hallText(language, 'directoryNote')}</small><div className="tv-stock-controls">
      <div className="tv-stock-pagination"><button disabled={page === 0} onClick={() => movePage(-1)} aria-label={tvText(language, 'previous')} data-tv-focus-key="stocks-previous">{language === 'ar' ? <ChevronRight/> : <ChevronLeft/>}{tvText(language, 'previous')}</button><span dir="ltr">{page + 1} / {pages.toLocaleString('en-US')}</span><button disabled={page >= pages - 1} onClick={() => movePage(1)} aria-label={tvText(language, 'next')} data-tv-focus-key="stocks-next">{tvText(language, 'next')}{language === 'ar' ? <ChevronLeft/> : <ChevronRight/>}</button></div>
      <TvStockRotation language={language} playing={playing} blocked={suspended || waiting || browsing || pages <= 1} status={rotationStatus} cycle={`${directoryPath}:${activity}`} seconds={priced ? 12 : 8} onToggle={onPlayback} onNext={nextPage}/>
    </div></div>
    <div className="tv-stock-filters"><label className="tv-stock-search"><Search aria-hidden="true"/><input type="search" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder={hallText(language, 'search')} aria-label={hallText(language, 'search')} data-tv-focus-key="stock-search"/></label>
      <label><span>{hallText(language, 'chooseMarket')}</span><select value={market} onChange={event => { setMarket(event.target.value); setPage(0); setFilterFocused(false); }} data-tv-focus-key="stock-market"><option value="">{hallText(language, 'allMarkets')}</option>{exchanges.map(item => <option key={item.id} value={item.id}>{language === 'ar' ? item.labelAr : language === 'fr' ? item.labelFr : item.labelEn} · {item.count.toLocaleString('en-US')}</option>)}</select></label>
      <span className="tv-stock-results">{hallText(language, 'matches')} <bdi>{total?.toLocaleString('en-US') ?? '—'}</bdi></span>
    </div>
    {(directory.error || quotes.error) && <div className="tv-hall-error" role="status">{tvText(language, 'error')} <button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>}
    <section className="tv-hall-market-table tv-stock-page"><TvQuoteTable key={directoryPath} items={items} markets={markets} quotes={quotes.data?.quotes ?? []} language={language} now={now} loading={directory.loading || quotes.loading} emptyReason={directory.error || quotes.error ? 'error' : undefined} select={onQuote}/></section>
    <TvHeadlineBand now={now} newsLoading={newsLoading} newsError={newsError} onRetry={onRefresh} news={news} language={language} paused={newsPaused} onStory={onStory}/>
    {ticker && <TvQuoteMarquee quotes={quotes.data?.quotes ?? []} language={language} now={now} paused={paused} speed={speed} select={onQuote} toggle={onTickerPause}/>}
  </main>;
}
