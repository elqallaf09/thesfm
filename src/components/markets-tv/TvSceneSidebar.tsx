'use client';
import { receiverText } from '@/lib/markets-tv/receiver';
import { useId } from 'react';
import type { TvLanguage, TvNews, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { tvQuoteTime, tvText } from '@/lib/markets-tv/i18n';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import { tvSceneChange, tvSceneHasPrice, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvDataNotice } from './TvDataNotice';
import { TvBroadcastPager } from './TvBroadcastPager';
import { useTvBroadcastPage, useTvPanelCount } from './useTvBroadcastPage';

export function TvHeadlines({ news, language, now, onStory, playing = true }: { news: TvNews[]; language: TvLanguage; now: number; onStory: (story: TvNews) => void; playing?: boolean }) {
 const id=useId(),{ref,count}=useTvPanelCount(2,8,3.7),pages=Math.max(1,Math.ceil(news.length/count));
 const {current,move}=useTvBroadcastPage(pages,playing,news.map(s=>s.id).join(','));
 return <section ref={ref} className="tv-scene-headlines" aria-labelledby={id}><header className="tv-broadcast-heading"><h2 id={id}>{tvText(language,'news')}</h2><TvBroadcastPager page={current} pages={pages} language={language} move={move}/></header>
  <div className="tv-headline-items">{news.length ? news.slice(current*count,(current+1)*count).map(story=><button key={story.id} onClick={()=>onStory(story)} data-tv-focus-key={`story:${story.id}`}><span>{story.title}</span><small className="tv-news-evidence"><bdi>{story.source}</bdi>{story.screening && <span>{receiverText(language, story.screening)}</span>}<time dir="ltr" dateTime={story.publishedAt}>{tvQuoteTime(story.publishedAt,language,now)}</time></small></button>):<p>{tvText(language,'noNews')}</p>}</div>
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
export function TvSceneSidebar({ quotes, news, language, now, snapshot, loading, onStory, onQuote, onRefresh }: {
 quotes:TvQuote[];news:TvNews[];language:TvLanguage;now:number;snapshot:TvSnapshot|null;loading:boolean;onStory:(story:TvNews)=>void;onQuote:(quote:TvQuote)=>void;onRefresh:()=>void;
}){
 const s=(key:Parameters<typeof tvSceneText>[1])=>tvSceneText(language,key),missing=quotes.filter(quote=>!tvSceneHasPrice(quote));
 return <aside className="tv-scene-sidebar"><TvHeadlines news={news} language={language} now={now} onStory={onStory}/><TvSceneMovers quotes={quotes} language={language} now={now} onQuote={onQuote}/>
 <details className="tv-scene-health"><summary>{tvText(language,'provider')}</summary><p>{s('selectedCoverage')}</p><div className="tv-scene-coverage-total"><strong dir="ltr">{snapshot?`${quotes.length-missing.length} / ${quotes.length}`:'—'}</strong><span>{s('quoted')}</span></div>
 <TvDataNotice quotes={missing.length?missing:quotes} language={language} retryAt={snapshot?.retryAt} now={now} loading={loading} refresh={onRefresh}/></details></aside>;
}
