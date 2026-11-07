import { countdownParts } from './sessionTimeline';
import type { TvLanguage } from './types';
export const TV_BROADCAST_PAGE_MS=40_000;
/** Balance the 81-market directory over five pages, instead of a lone final card. */
export function tvSessionPageSize(total:number){
 const length=Number.isFinite(total)&&total>0?Math.floor(total):0;
 return Math.max(1,Math.ceil(length/Math.max(1,Math.ceil(length/20))));
}
export function compactCountdown(ms:number|null,language:TvLanguage){
 const p=countdownParts(ms);if(!p)return '—';
 const pad=(v:number)=>String(v).padStart(2,'0');
 return `${pad(p.days)}${language==='ar'?'ي':language==='fr'?'j':'d'} ${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
}
