import {expect,it,vi,afterEach} from 'vitest';
import {TV_COMMODITIES,verifiedTvCommodityQuote} from '@/lib/markets-tv/commodityQuote';
import {tvSceneQuoteUnit} from '@/lib/markets-tv/scene-display';
const now=Date.parse('2026-11-07T10:00:00Z');
const assets=TV_COMMODITIES.map(q=>({...q,assetType:'commodity' as const}));
const body=()=>({data:TV_COMMODITIES.map(q=>({s:q.symbol,d:[q.ticker,q.name,q.exchange,'futures',q.currency,100,1,(now-86400000)/1000,'delayed_streaming_600','out_of_session']}))});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('retains explicit continuous futures identity, date and units',()=>{
 expect(assets.map(a=>{const q=verifiedTvCommodityQuote(a,body(),new Date(now).toISOString(),now)!;expect(q).toMatchObject({symbol:a.symbol,price:100,status:'closed',source:'TradingView',observedAt:new Date(now-86400000).toISOString()});return tvSceneQuoteUnit(q,'ar');})).toEqual(['USD / oz','USD / oz','USD / bbl','USD / MMBtu']);
});
it.each([[0,'XAUUSD'],[2,'FX'],[3,'cfd'],[4,'EUR'],[5,0],[7,(now+120000)/1000],[7,(now-8*86400000)/1000]])('rejects wrong instrument/clock field %s',(i,v)=>{
 const p=body();p.data[0].d[i as number]=v;expect(verifiedTvCommodityQuote(assets[0],p,new Date(now).toISOString(),now)).toBeNull();
});
it('never labels continuous prices as Yahoo front-month or spot metal',()=>{
 for(const symbol of ['GC=F','XAUUSD','COMEX:GCZ2026'])expect(verifiedTvCommodityQuote({...assets[0],symbol},body(),new Date(now).toISOString(),now)).toBeNull();
});
it('recovers four contracts with a shared request and caches source timestamps',async()=>{
 vi.resetModules();vi.useFakeTimers();vi.setSystemTime(now);
 const fetch=vi.fn(async()=>Response.json(body()));vi.stubGlobal('fetch',fetch);
 const {withTvCommodityFallback}=await import('@/lib/server/markets-tv/commodityFallback');
 const missing=(a:typeof assets[number])=>({...a,nameAr:a.nameAr,price:null,changePercent:null,source:null,observedAt:null,receivedAt:null,country:'US',status:'unavailable' as const,issue:'rate_limited' as const});
 const q=await Promise.all(assets.map(a=>withTvCommodityFallback(a,Promise.resolve(missing(a)))));
 expect(q.map(q=>q.price)).toEqual([100,100,100,100]);expect(fetch).toHaveBeenCalledTimes(1);
 await withTvCommodityFallback(assets[0],Promise.resolve(missing(assets[0])));expect(fetch).toHaveBeenCalledTimes(1);
});
