import { expect, it } from 'vitest';
import { TV_WORLD_STOCKS, verifiedTvWorldStockQuote, tvWorldStockIdentity } from '@/lib/markets-tv/worldStockQuote';
import { tvSceneAssets } from '@/lib/server/markets-tv/sceneCatalog';
const now=Date.parse('2026-11-07T10:00:00Z');
const assets=tvSceneAssets('world').rows;
const payload=()=>({data:TV_WORLD_STOCKS.map(q=>({s:`${q.exchange}:${q.ticker}`,d:[q.ticker,'Test',q.exchange,'stock',q.currency,100,1,(now-86400000)/1000,q.isin,'delayed_streaming_1200','out_of_session']}))});
it('matches all six configured listings including Hong Kong zero padding',()=>{
  expect(assets).toHaveLength(6);
  for(const asset of assets){expect(tvWorldStockIdentity(asset)).not.toBeNull();expect(verifiedTvWorldStockQuote(asset,payload(),new Date(now).toISOString(),now)).toMatchObject({symbol:asset.symbol,price:100,currency:asset.currency,status:'closed',delayType:'delayed'});}
});
it.each([[0,'WRONG'],[2,'NASDAQ'],[3,'fund'],[4,'USD'],[5,-1],[7,(now+120000)/1000],[7,(now-8*86400000)/1000],[8,'WRONG']])('rejects incompatible field %s', (index,value)=>{
  const p=payload();p.data[0].d[index as number]=value;
  expect(verifiedTvWorldStockQuote(assets[0],p,new Date(now).toISOString(),now)).toBeNull();
});
it('rejects a duplicate or truncated response rather than guessing',()=>{
 const p=payload();p.data.push(p.data[0]);expect(verifiedTvWorldStockQuote(assets[0],p,new Date(now).toISOString(),now)).toBeNull();
 const short=payload();short.data[0].d.pop();expect(verifiedTvWorldStockQuote(assets[0],short,new Date(now).toISOString(),now)).toBeNull();
});
