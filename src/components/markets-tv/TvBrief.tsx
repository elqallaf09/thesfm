'use client';
import { briefMetrics, obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
import type { TvLanguage, TvQuote, TvSnapshot } from '@/lib/markets-tv/types';
import { TvQuoteEvidence } from './TvQuoteEvidence';
export function TvBrief({snapshot,language,now,select,loading=false,error=null,onRefresh}:{snapshot:TvSnapshot|null;language:TvLanguage;now:number;select:(quote:TvQuote)=>void;loading?:boolean;error?:string|null;onRefresh?:()=>void}) {
  const stats=briefMetrics([...(snapshot?.summary||[]),...(snapshot?.quotes||[])],now);
  const o=(key:Parameters<typeof obsText>[1])=>obsText(language,key);
  if (!snapshot || stats.total === 0) return <section className="tv-brief-dashboard" aria-busy={loading}>
    <div role={error?'alert':'status'}><h1>{o(loading?'loadingBrief':error?'unavailableBrief':'emptyBrief')}</h1>
      {!loading && onRefresh && <button onClick={onRefresh}>{tvText(language,'retry')}</button>}
    </div>
  </section>;
  const percent=(v:number)=>`${v>0?'+':''}${v.toFixed(2)}%`;
  const metrics=[{label:o('available'),value:`${stats.available} / ${stats.total}`,detail:o('scope')},
    {label:o('breadth'),value:`↑ ${stats.rising}  ↓ ${stats.falling}`,detail:`${stats.comparable} ${o('comparable')}`},
    {label:o('average'),value:stats.average===null?'—':percent(stats.average),detail:stats.basis==='24h'?'24h':tvText(language,'regularSessions')},
    {label:o('health'),value:`${stats.recent} / ${stats.total}`,detail:o(stats.total>0 && stats.recent===stats.total?'current':'partial')}];
  return <section className="tv-brief-dashboard" aria-busy={loading}><header><p className="tv-eyebrow">{o('scope')}</p><h1 data-trend={stats.headline==='redDay'?'down':stats.headline==='greenDay'?'up':'flat'}>{o(stats.headline)}</h1>{onRefresh && <button onClick={onRefresh}>{tvText(language,'retry')}</button>}</header>
    <div className="tv-brief-metrics">{metrics.map(metric=><article key={metric.label}><span>{metric.label}</span><strong dir="ltr">{metric.value}</strong><small>{metric.detail}</small></article>)}</div>
    <div className="tv-brief-rankings">{(['gainers','losers'] as const).map(kind=><section key={kind}><h2>{tvText(language,kind)}</h2>{stats[kind].length?stats[kind].slice(0,3).map(quote=><button className="tv-ranked-quote" key={`${quote.exchange}:${quote.symbol}`} onClick={()=>select(quote)}>
      <span>{language==='ar'?quote.nameAr:quote.name}</span><strong dir="ltr" data-trend={kind==='gainers'?'up':'down'}>{percent(quote.changePercent!)}</strong>
      <span className="tv-ranking-bar" aria-hidden="true"><i data-trend={kind==='gainers'?'up':'down'} style={{width:`${Math.max(3,Math.abs(quote.changePercent!)/Math.max(...stats[kind].map(q=>Math.abs(q.changePercent!)))*100)}%`}}/></span>
      <TvQuoteEvidence quote={quote} language={language} now={now} compact/>
    </button>):<p className="tv-ranking-empty">{o(stats.comparable?kind==='gainers'?'noGainers':'noLosers':'noComparable')}</p>}</section>)}</div>
  </section>;
}
