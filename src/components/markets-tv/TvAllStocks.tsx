'use client';
import { useEffect, useState } from 'react';
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

export function TvAllStocks({ language, now, markets, ready, revision, news, paused, ticker, speed, onQuote, onStory, onRefresh, onTickerPause }: {
  language: TvLanguage; now: number; markets: TvMarket[]; ready: boolean; revision: number; news: TvNews[]; paused: boolean; ticker: boolean; speed: number;
  onQuote: (quote: TvQuote) => void; onStory: (story: TvNews) => void; onRefresh: () => void; onTickerPause: () => void;
}) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [market, setMarket] = useState(''), [page, setPage] = useState(0);
  const PAGE_SIZE = useTvTableSize();
  useEffect(() => setPage(0), [PAGE_SIZE]);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const directoryPath = `/api/tv/instruments?${new URLSearchParams({ group: 'world', market, q: query, page: String(page), pageSize: String(PAGE_SIZE) })}`;
  const directory = useTvResource<TvInstrumentPage>(ready ? directoryPath : null, 300000, '', revision);
  const items = directory.data?.items ?? [];
  const quotePath = items.length ? `/api/tv/snapshot?${new URLSearchParams({ group: 'world', ...(market ? { market } : {}), pageSize: String(PAGE_SIZE), symbols: JSON.stringify(items.map(item => item.symbol)) })}` : null;
  const quotes = useTvResource<TvSnapshot>(quotePath, 60000, '', revision);
  const pages = Math.max(1, Math.ceil((directory.data?.total ?? 0) / PAGE_SIZE));
  // A catalog refresh can shrink the last page. Clamp only after that response arrives.
  useEffect(() => { if (directory.data && page >= pages) setPage(pages - 1); }, [directory.data, page, pages]);
  const exchanges = markets.filter(item => !['global', 'crypto', 'forex', 'commodities', 'watchlist'].includes(item.group));
  return <main className="tv-hall-content tv-all-stocks">
    <div className="tv-hall-title"><div><span>{hallText(language, 'directory')}</span><h1>{hallText(language, 'allStocks')} <bdi>{directory.data?.directoryTotal.toLocaleString('en-US') ?? '—'}</bdi></h1></div><small>{hallText(language, 'directoryNote')}</small></div>
    <div className="tv-stock-filters"><label className="tv-stock-search"><Search aria-hidden="true"/><input type="search" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder={hallText(language, 'search')} aria-label={hallText(language, 'search')} data-tv-focus-key="stock-search"/></label>
      <label><span>{hallText(language, 'chooseMarket')}</span><select value={market} onChange={event => { setMarket(event.target.value); setPage(0); }} data-tv-focus-key="stock-market"><option value="">{hallText(language, 'allMarkets')}</option>{exchanges.map(item => <option key={item.id} value={item.id}>{language === 'ar' ? item.labelAr : language === 'fr' ? item.labelFr : item.labelEn} · {item.count.toLocaleString('en-US')}</option>)}</select></label>
      <span className="tv-stock-results">{hallText(language, 'matches')} <bdi>{directory.data?.total.toLocaleString('en-US') ?? '—'}</bdi></span>
    </div>
    {(directory.error || quotes.error) && <div className="tv-hall-error" role="status">{tvText(language, 'error')} <button onClick={onRefresh}>{tvText(language, 'retry')}</button></div>}
    <section className="tv-hall-market-table"><TvQuoteTable items={items} quotes={quotes.data?.quotes ?? []} language={language} now={now} loading={directory.loading || quotes.loading} select={onQuote}/></section>
    <div className="tv-stock-pagination"><button disabled={page === 0 || directory.loading} onClick={() => setPage(value => value - 1)} aria-label={tvText(language, 'previous')} data-tv-focus-key="stocks-previous">{language === 'ar' ? <ChevronRight/> : <ChevronLeft/>}{tvText(language, 'previous')}</button><span dir="ltr">{page + 1} / {pages.toLocaleString('en-US')}</span><button disabled={page >= pages - 1 || directory.loading} onClick={() => setPage(value => value + 1)} aria-label={tvText(language, 'next')} data-tv-focus-key="stocks-next">{tvText(language, 'next')}{language === 'ar' ? <ChevronLeft/> : <ChevronRight/>}</button></div>
    <TvHeadlineBand news={news} language={language} paused={paused} onStory={onStory}/>
    {ticker && <TvQuoteMarquee quotes={quotes.data?.quotes ?? []} language={language} now={now} paused={paused} speed={speed} select={onQuote} toggle={onTickerPause}/>}
  </main>;
}
