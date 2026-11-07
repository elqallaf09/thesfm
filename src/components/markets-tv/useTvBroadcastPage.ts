'use client';
import { useCallback, useEffect, useState } from 'react';
import { TV_BROADCAST_PAGE_MS } from '@/lib/markets-tv/broadcast';
export function useTvBroadcastPage(pages:number,enabled=true,identity=''){
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0);
 const current=Number.isFinite(page)&&pages>0?Math.max(0,Math.floor(page))%pages:0;
 useEffect(()=>{
  if(!enabled||pages<2)return;
  const timer=setInterval(()=>{if(!document.hidden)setPage(value=>(value+1)%pages);},TV_BROADCAST_PAGE_MS);
  return()=>clearInterval(timer);
 },[pages,enabled,identity,revision]);
 const move=(value:number)=>{setPage(value);setRevision(v=>v+1);};
 return {current,move};
}
/** Measure the panel allocated by the TV grid, not the physical screen size. */
export function useTvPanelCount(maximum:number,rowEm:number,overheadEm:number){
 const [element,setElement]=useState<HTMLElement|null>(null),[count,setCount]=useState(1);
 // Some panels mount only after an authenticated fetch; observe that mount too.
 const ref=useCallback((node:HTMLElement|null)=>{setElement(node);},[]);
 useEffect(()=>{
  if(!element)return;
  const fit=()=>{const font=parseFloat(getComputedStyle(element).fontSize)||16;const height=element.clientHeight;if(height>0)setCount(Math.max(1,Math.min(maximum,Math.floor((height/font-overheadEm)/rowEm))));};
  fit();const observer=new ResizeObserver(fit);observer.observe(element);return()=>observer.disconnect();
 },[element,maximum,rowEm,overheadEm]);
 return {ref,count};
}
