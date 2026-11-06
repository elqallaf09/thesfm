import 'server-only';
import { unstable_cache } from 'next/cache';
import { cleanEnv } from '@/lib/market/providerConfig';
import { fmpQueuedFetch } from '@/lib/trader/providers/fmpRuntime.server';
import { normalizeSessionHistory, type TvSessionHistory } from '@/lib/markets-tv/history';
import { tvIndexSessionPoints } from '@/lib/markets-tv/indexChart';
import { loadTvExternalIndex } from './indexFallback';
async function loadFmpHistory(): Promise<TvSessionHistory> {
  const now=Date.now(), fetchedAt=new Date(now).toISOString();
  const empty: TvSessionHistory={symbol:'^GSPC',points:[],source:'Financial Modeling Prep',sessionDate:null,fetchedAt};
  const key=cleanEnv(process.env.FMP_API_KEY);
  if (!key) return {...empty,issue:'not_configured'};
  try {
    const url=new URL('https://financialmodelingprep.com/stable/historical-chart/5min');
    url.searchParams.set('symbol','^GSPC');
    url.searchParams.set('from',new Date(now-7*86_400_000).toISOString().slice(0,10));
    const response=await fmpQueuedFetch(url,{headers:{accept:'application/json',apikey:key},signal:AbortSignal.timeout(3500),cache:'no-store'});
    if (!response.ok) return {...empty,issue:response.status===429?'rate_limited':[401,402,403].includes(response.status)?'access_denied':'provider_unavailable'};
    const points=normalizeSessionHistory(await response.json(),now);
    const sessionDate=points.length?new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(points[0].at)):null;
    return {...empty,points,sessionDate,...(points.length<2?{issue:'provider_unavailable'}:{})};
  } catch { return {...empty,issue:'provider_unavailable'}; }
}
const load = unstable_cache(async (): Promise<TvSessionHistory> => {
  const primary = await loadFmpHistory();
  if (primary.points.length >= 2) return primary;
  const external = await loadTvExternalIndex('^GSPC');
  if (!external) return primary;
  const session = tvIndexSessionPoints(external.history);
  if (session.points.length < 2) return primary;
  return { symbol: '^GSPC', ...session, source: external.quote.source!, fetchedAt: external.quote.receivedAt || primary.fetchedAt };
},['tv-sp500-intraday-v2'],{revalidate:300});
export const loadTvSessionHistory=load;
