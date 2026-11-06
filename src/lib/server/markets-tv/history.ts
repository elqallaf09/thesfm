import 'server-only';
import { unstable_cache } from 'next/cache';
import { cleanEnv } from '@/lib/market/providerConfig';
import { fmpQueuedFetch } from '@/lib/trader/providers/fmpRuntime.server';
import { normalizeSessionHistory, type TvSessionHistory } from '@/lib/markets-tv/history';
const load = unstable_cache(async (): Promise<TvSessionHistory> => {
  const now=Date.now(), fetchedAt=new Date(now).toISOString();
  const empty: TvSessionHistory={symbol:'^GSPC',points:[],source:'Financial Modeling Prep',sessionDate:null,fetchedAt};
  const key=cleanEnv(process.env.FMP_API_KEY);
  if (!key) return {...empty,issue:'not_configured'};
  try {
    const url=new URL('https://financialmodelingprep.com/stable/historical-chart/5min');
    url.searchParams.set('symbol','^GSPC');
    url.searchParams.set('from',new Date(now-7*86_400_000).toISOString().slice(0,10));
    const response=await fmpQueuedFetch(url,{headers:{accept:'application/json',apikey:key},signal:AbortSignal.timeout(6500),cache:'no-store'});
    if (!response.ok) return {...empty,issue:response.status===429?'rate_limited':'provider_unavailable'};
    const points=normalizeSessionHistory(await response.json(),now);
    const sessionDate=points.length?new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(points[0].at)):null;
    return {...empty,points,sessionDate,...(points.length<2?{issue:'provider_unavailable'}:{})};
  } catch { return {...empty,issue:'provider_unavailable'}; }
},['tv-sp500-intraday-v1'],{revalidate:300});
export const loadTvSessionHistory=load;
