'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { TvLanguage, TvQuote } from '@/lib/markets-tv/types';
import { tvQuotePrice, tvText } from '@/lib/markets-tv/i18n';
import { tvSceneChange, tvSceneText } from '@/lib/markets-tv/scene-display';
import { TvQuoteEvidence } from './TvQuoteEvidence';
export function TvWholeTicker({quotes,language,now,paused,speed,select,toggle}:{quotes:TvQuote[];language:TvLanguage;now:number;paused:boolean;speed:number;select:(quote:TvQuote)=>void;toggle:()=>void}) {
  const container=useRef<HTMLDivElement>(null),[count,setCount]=useState(3),[page,setPage]=useState(0),[focused,setFocused]=useState(false);
  const pages=Math.max(1,Math.ceil(quotes.length/count)), current=page%pages;
  useEffect(()=>{const el=container.current;if(!el)return;const measure=()=>setCount(Math.max(1,Math.min(5,Math.floor(el.clientWidth/(parseFloat(getComputedStyle(el).fontSize)*15)))));measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(paused||focused||pages<2)return;const timer=setInterval(()=>setPage(value=>(value+1)%pages),Math.max(5000,14000-speed*100));return()=>clearInterval(timer);},[paused,focused,pages,speed]);
  if(!quotes.length)return null;
  return <section className="tv-scene-ticker tv-whole-ticker" aria-label={tvSceneText(language,'ticker')} data-paused={paused} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <button onClick={toggle} aria-pressed={paused} aria-label={tvSceneText(language,paused?'resumeTicker':'pauseTicker')} data-tv-focus-key="ticker-pause">{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}</button>
    <div ref={container} className="tv-whole-ticker-cards" style={{gridTemplateColumns:`repeat(${count},minmax(0,1fr))`}}>{quotes.slice(current*count,(current+1)*count).map(quote=><button key={`${quote.exchange}:${quote.symbol}`} onClick={()=>select(quote)} data-tv-focus-key={`ticker:${quote.exchange||''}:${quote.symbol}:${quote.currency||''}`}>
      <strong dir="ltr">{quote.displaySymbol||quote.symbol}</strong><bdi>{tvQuotePrice(quote)}</bdi><span dir="ltr" data-trend={(quote.changePercent||0)>0?'up':(quote.changePercent||0)<0?'down':'flat'}>{tvSceneChange(quote)}</span><TvQuoteEvidence quote={quote} language={language} now={now} compact className="tv-scene-ticker-evidence"/>
    </button>)}</div>
    <div className="tv-ticker-pages"><button onClick={()=>setPage((current+pages-1)%pages)} disabled={pages<2} aria-label={tvText(language,'previous')}><ChevronLeft aria-hidden="true"/></button><small dir="ltr">{current+1}/{pages}</small><button onClick={()=>setPage((current+1)%pages)} disabled={pages<2} aria-label={tvText(language,'next')}><ChevronRight aria-hidden="true"/></button></div>
  </section>;
}
