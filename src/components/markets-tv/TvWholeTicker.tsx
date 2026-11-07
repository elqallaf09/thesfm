'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvAssetIcon } from './TvAssetIcon';
import { TvQuoteEvidence } from './TvQuoteEvidence';
import { tvCardColumns, tvPagination } from '@/lib/markets-tv/pagination';
export function TvWholeTicker({quotes,language,now,paused,speed,select,toggle}:{quotes:TvQuote[];language:TvLanguage;now:number;paused:boolean;speed:number;select:(quote:TvQuote)=>void;toggle:()=>void}) {
  const pointerInput=useRef(false);
  const container=useRef<HTMLDivElement>(null),[count,setCount]=useState(3),[page,setPage]=useState(0),[focused,setFocused]=useState(false);
  const {pages,current,count:columns}=tvPagination(quotes.length,count,page);
  const hasQuotes=quotes.length>0;
  useEffect(()=>{const el=container.current;if(!el)return;const measure=()=>{const next=tvCardColumns(el.clientWidth,parseFloat(getComputedStyle(el).fontSize));if(next!==null)setCount(next);};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[hasQuotes]);
  useEffect(()=>{if(paused||focused||pages<2)return;const timer=setInterval(()=>setPage(value=>((Number.isFinite(value)?value:0)+1)%pages),Math.max(5000,14000-speed*100));return()=>clearInterval(timer);},[paused,focused,pages,speed]);
  // Touch leaves buttons focused in Android WebView. Only keyboard/remote
  // focus on a quote should hold its page; playback and paging controls must
  // never prevent the timer from resuming.
  useEffect(()=>{
    const pointer=()=>{pointerInput.current=true;setFocused(false);};
    const keyboard=()=>{pointerInput.current=false;setFocused(Boolean(container.current?.contains(document.activeElement)));};
    document.addEventListener('pointerdown',pointer,true);
    document.addEventListener('keydown',keyboard,true);
    return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',keyboard,true);};
  },[]);
  if(!quotes.length)return null;
  return <section className="tv-scene-ticker tv-whole-ticker" aria-label={tvSceneText(language,'ticker')} data-paused={paused} onFocusCapture={event=>setFocused(!pointerInput.current&&Boolean(container.current?.contains(event.target)))} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <button onClick={toggle} aria-pressed={paused} aria-label={tvSceneText(language,paused?'resumeTicker':'pauseTicker')} data-tv-focus-key="ticker-pause">{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}</button>
    <div ref={container} className="tv-whole-ticker-cards" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{quotes.slice(current*columns,(current+1)*columns).map(quote=><button key={`${quote.exchange}:${quote.symbol}`} onClick={()=>select(quote)} data-tv-focus-key={`ticker:${quote.exchange||''}:${quote.symbol}:${quote.currency||''}`}>
      <span className="tv-ticker-identity"><TvAssetIcon quote={quote}/><strong dir="ltr">{quote.displaySymbol||quote.symbol}</strong></span><bdi>{tvQuotePrice(quote)}</bdi><span dir="ltr" data-trend={(quote.changePercent||0)>0?'up':(quote.changePercent||0)<0?'down':'flat'}>{tvSceneChange(quote)}</span><TvQuoteEvidence quote={quote} language={language} now={now} compact className="tv-scene-ticker-evidence"/>
    </button>)}</div>
    <div className="tv-ticker-pages"><button onClick={()=>setPage((current+pages-1)%pages)} disabled={pages<2} aria-label={tvText(language,'previous')}><ChevronLeft aria-hidden="true"/></button><small dir="ltr">{current+1}/{pages}</small><button onClick={()=>setPage((current+1)%pages)} disabled={pages<2} aria-label={tvText(language,'next')}><ChevronRight aria-hidden="true"/></button></div>
  </section>;
}
