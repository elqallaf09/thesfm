import {mobileAccess,mobileResponse} from '@/lib/server/mobileAccess';
import {getQuoteWithFallback} from '@/lib/market/marketDataProviders';
import {goldSilverRatio} from '@/lib/mobile/metals';
import {rateLimitRequest} from '@/lib/server/rateLimiter';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request:Request){const access=await mobileAccess(request);if(access.response)return access.response;const limited=rateLimitRequest(request,{max:20,windowMs:60000,prefix:'mobile-metals:'+access.userId});if(limited)return limited;
 const results=await Promise.allSettled(['XAUUSD','XAGUSD'].map(symbol=>getQuoteWithFallback(symbol,'commodities',{symbol,assetType:'commodity',currency:'USD'})));
 const quote=(index:number)=>{const r=results[index];if(r.status!=='fulfilled'||!r.value.ok)return null;const q=r.value.data;return {symbol:q.symbol,price:q.price,currency:q.currency,lastUpdated:q.lastUpdated,provider:q.provider,change:q.change,changePercent:q.changePercent};};
 const gold=quote(0),silver=quote(1);return mobileResponse({gold,silver,ratio:goldSilverRatio(gold,silver),unit:'USD/troy_ounce',retrievedAt:new Date().toISOString(),ratioPolicy:'Both spot observations must be no older than 15 minutes and within 5 minutes of each other. Missing or stale evidence never becomes a synthetic ratio.'});}
