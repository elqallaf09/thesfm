'use client';
import { useId } from 'react';
import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvText } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneChange, tvSceneHasPrice, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvNewsStatus } from './TvNewsStatus';
import { TvNewsCard } from './TvNewsCard';
import { TvDataNotice } from './TvDataNotice';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage, useTvPanelCount } from './useTvBroadcastPage';

export function TvHeadlines({ news, language, now, onStory, newsLoading, newsError, onRetry }: { news: TvNews[]; language: TvLanguage; now: number; onStory: (story: TvNews) => void; playing?: boolean; newsLoading?: boolean; newsError?: string | null; onRetry?: () => void }) {
 const id=useId();
 return <section className="tv-scene-headlines tv-news-board" aria-labelledby={id} data-news-count={news.length}>
  <header className="tv-broadcast-heading tv-news-heading"><h2 id={id}>{tvText(language,'news')}</h2><bdi>{news.length || ''}</bdi></header>
  <div className="tv-headline-items tv-news-grid" data-tv-focus-grid>{news.length ? news.map(story=><TvNewsCard key={story.id} story={story} language={language} now={now} onStory={onStory}/>):<TvNewsStatus language={language} loading={newsLoading} error={newsError} onRetry={onRetry}/>}</div>
 </section>;
}
export function TvSceneMovers({quotes,language,now,onQuote}:{quotes:TvQuote[];language:TvLanguage;now:number;onQuote:(quote:TvQuote)=>void}){
 const {ref,count}=useTvPanelCount(2,2.5,2.8);
 const movers=quotes.filter(quote=>tvSceneHasPrice(quote)&&quote.changePercent!==null&&Number.isFinite(quote.changePercent)&&['available','delayed','closed'].includes(quoteStatus(quote,now))&&['24h','session'].includes(quote.changeBasis||''))
 .sort((a,b)=>Math.abs(b.changePercent!)-Math.abs(a.changePercent!)).slice(0,2);
 const pages=Math.max(1,Math.ceil(movers.length/count)),{current,move}=useTvBroadcastPage(pages);
 const s=(key:Parameters<typeof tvSceneText>[1])=>tvSceneText(language,key);
 return <section ref={ref} className="tv-scene-movers" title={s('selectedMoves')}><header className="tv-broadcast-heading"><h2>{s('sceneMoves')}</h2><TvBroadcastPager page={current} pages={pages} language={language} move={move}/></header>
  <div className="tv-mover-items">{movers.length?movers.slice(current*count,(current+1)*count).map(quote=><button key={`${quote.exchange}:${quote.symbol}`} onClick={()=>onQuote(quote)} data-tv-focus-key={`mover:${quote.symbol}`}><span>{language==='ar'?quote.nameAr:quote.name}</span><strong dir="ltr" data-trend={quote.changePercent!>=0?'up':'down'}>{tvSceneChange(quote)}</strong><small>{s(quote.changeBasis==='24h'?'day':'session')}</small></button>):<p>{language==='ar'?'لا تتوفر تحركات قابلة للمقارنة حالياً':language==='fr'?'Aucune variation comparable disponible':'No comparable moves available'}</p>}</div>
 </section>;
}
export function TvSceneSidebar({ quotes, news, newsLoading, newsError, language, now, snapshot, loading, onStory, onQuote, onRefresh }: {
 quotes:TvQuote[];news:TvNews[];newsLoading?:boolean;newsError?:string|null;language:TvLanguage;now:number;snapshot:TvSnapshot|null;loading:boolean;onStory:(story:TvNews)=>void;onQuote:(quote:TvQuote)=>void;onRefresh:()=>void;
}){
 const s=(key:Parameters<typeof tvSceneText>[1])=>tvSceneText(language,key),missing=quotes.filter(quote=>!tvSceneHasPrice(quote));
 return <aside className="tv-scene-sidebar"><TvHeadlines news={news} newsLoading={newsLoading} newsError={newsError} onRetry={onRefresh} language={language} now={now} onStory={onStory}/><TvSceneMovers quotes={quotes} language={language} now={now} onQuote={onQuote}/>
 <details className="tv-scene-health"><summary>{tvText(language,'provider')}</summary><p>{s('selectedCoverage')}</p><div className="tv-scene-coverage-total"><strong dir="ltr">{snapshot?`${quotes.length-missing.length} / ${quotes.length}`:'—'}</strong><span>{s('quoted')}</span></div>
 <TvDataNotice quotes={missing.length?missing:quotes} language={language} retryAt={snapshot?.retryAt} now={now} loading={loading} refresh={onRefresh}/></details></aside>;
}
