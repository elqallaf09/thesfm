'use client';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTvResource } from './useTvResource';
import type { TvSessionHistory } from '@/lib/markets-tv/history';
import type { TvLanguage } from '@/lib/markets-tv/types';
import { obsText } from '@/lib/markets-tv/obsidian';
import { tvText } from '@/lib/markets-tv/i18n';
export function TvSessionChart({language}:{language:TvLanguage}) {
  const [revision,setRevision]=useState(0);
  const history=useTvResource<TvSessionHistory>('/api/tv/history',300000,'',revision);
  const data=history.data, points=data?.points||[];
  const title=obsText(language,'sessionChart');
  if(points.length<2) return <div className="tv-chart-missing" role="status"><span>{history.loading?tvText(language,'loading'):obsText(language,'chartMissing')}</span><button onClick={()=>setRevision(v=>v+1)} disabled={history.loading}><RefreshCw aria-hidden="true"/>{tvText(language,'retry')}</button></div>;
  const values=points.map(p=>p.price),min=Math.min(...values),max=Math.max(...values),span=Math.max(max-min,max*.0002);
  const first=Date.parse(points[0].at),last=Date.parse(points.at(-1)!.at),elapsed=Math.max(1,last-first);
  const coords=points.map(p=>`${20+(Date.parse(p.at)-first)/elapsed*960},${180-(p.price-min)/span*160}`).join(' ');
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuwait',year:'numeric',month:'2-digit',day:'2-digit'});
  const firstDay=day.format(first);
  const time=(at:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',...(day.format(new Date(at))!==firstDay?{day:'2-digit',month:'2-digit'} as const:{}),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
  return <figure className="tv-session-chart"><figcaption><span>{title} · {obsText(language,'chartPrevious')}</span><bdi>{data?.sessionDate}</bdi></figcaption>
    <div className="tv-chart-plot"><div className="tv-chart-range" dir="ltr"><span>{max.toLocaleString('en-US',{maximumFractionDigits:2})}</span><span>{min.toLocaleString('en-US',{maximumFractionDigits:2})}</span></div>
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label={`${title} S&P 500 · ${data?.sessionDate}`}><path d="M20 20H980M20 100H980M20 180H980" className="tv-chart-grid"/><polygon points={`20,200 ${coords} 980,200`} className="tv-chart-area"/><polyline points={coords} className="tv-chart-line"/></svg></div>
    <div className="tv-chart-times" dir="ltr"><span>{time(points[0].at)}</span><span>{time(points.at(-1)!.at)}</span></div>
    <small>{data?.source} · {obsText(language,'kuwait')}</small>
  </figure>;
}
