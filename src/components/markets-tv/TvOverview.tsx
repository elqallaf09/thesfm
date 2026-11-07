'use client';
import { RefreshCw } from 'lucide-react';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvSceneChange, tvSceneHasPrice, tvSceneIssue, tvSceneText } from '@/lib/markets-tv/scene-display';
import type { TvLanguage, TvNews, TvQuote } from '@/lib/markets-tv/types';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { TvHeadlines } from './TvSceneSidebar';
import { TvSessionsNow } from './TvSessions';
import { TvSessionChart } from './TvSessionChart';
export function TvPriceError({quote,language,retry}:{quote:TvQuote;language:TvLanguage;retry:()=>void}) {
  return <div className="tv-price-error"><span>{tvSceneText(language,tvSceneIssue(quote.issue))}</span><button onClick={retry}><RefreshCw aria-hidden="true"/>{tvText(language,'retry')}</button></div>;
}
export function TvOverview({sessionIds,quotes,language,now,news,loading,onQuote,onStory,onRefresh}:{sessionIds?:string[];quotes:TvQuote[];language:TvLanguage;now:number;news:TvNews[];loading:boolean;onQuote:(quote:TvQuote)=>void;onStory:(story:TvNews)=>void;onRefresh:()=>void}) {
  const hero=quotes.find(q=>q.symbol==='^GSPC'),indices=quotes.filter(q=>q.symbol!=='^GSPC').slice(0,5);
  return <main className="tv-overview" aria-busy={loading&&!quotes.length}>
    <div className="tv-overview-primary"><section className="tv-index-hero">
      <header><div><p className="tv-eyebrow">{tvText(language,'global')}</p><h1 dir="ltr">S&P 500</h1></div><span className="tv-hero-code" dir="ltr">SPX · ^GSPC</span></header>
      {hero&&tvSceneHasPrice(hero)?<button className="tv-hero-price" onClick={()=>onQuote(hero)} data-tv-focus-key="summary:sp500"><strong dir="ltr">{tvQuotePrice(hero)}</strong><span dir="ltr" data-trend={(hero.changePercent||0)>0?'up':(hero.changePercent||0)<0?'down':'flat'}>{tvSceneChange(hero)}</span></button>:<div className="tv-hero-unavailable"><strong>—</strong>{hero?<TvPriceError quote={hero} language={language} retry={onRefresh}/>:<span>{loading?tvText(language,'loading'):obsText(language,'unavailable')}</span>}</div>}
      {hero&&tvSceneHasPrice(hero)&&<TvQuoteEvidence quote={hero} language={language} now={now}/>}
      <TvSessionChart language={language}/>
    </section>
    <section className="tv-index-five" aria-label={tvText(language,'global')}>{indices.map(quote=><article key={quote.symbol} data-priced={tvSceneHasPrice(quote)}><button className="tv-index-value" onClick={()=>onQuote(quote)} data-tv-focus-key={`summary:${quote.exchange||''}:${quote.symbol}:${quote.currency||''}`}><span>{language==='ar'?quote.nameAr:quote.name}</span><strong dir="ltr">{tvQuotePrice(quote)}</strong>{tvSceneHasPrice(quote)&&<bdi data-trend={(quote.changePercent||0)>0?'up':(quote.changePercent||0)<0?'down':'flat'}>{tvSceneChange(quote)}</bdi>}</button>{tvSceneHasPrice(quote)?<TvQuoteEvidence quote={quote} language={language} now={now}/>:<TvPriceError quote={quote} language={language} retry={onRefresh}/>}</article>)}</section>
    </div>
    <aside className="tv-overview-sidebar"><TvSessionsNow selected={sessionIds} language={language} now={now}/><section className="tv-overview-news"><TvHeadlines news={news} language={language} now={now} onStory={onStory}/></section></aside>
  </main>;
}
