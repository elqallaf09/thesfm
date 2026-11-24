import { describe, expect, it } from 'vitest';
import { emptyNewsMovers, newsMoversPath, parseNewsMovers, rankNewsMovers } from '../../lib/markets-tv/newsMovers';
import { TV_NEWS_TOPICS } from '../../lib/markets-tv/newsReceiver';
import { tvPackagedOrigin } from '../../lib/markets-tv/cors';

const row = (symbol: string, changePercent: number, volume: number | null) => ({symbol,name:symbol,currency:'USD',price:10,changePercent,volume});
describe('TV scoped news movers', () => {
  it('ranks signed changes and caps the results at five', () => {
    const items = Array.from({length:8},(_,i)=>row('UP'+i,i+1,i+100));
    const data = rankNewsMovers([...items,row('LOSS',-10,8),row('FLAT',0,2)]);
    expect(data.gainers.map(r=>r.symbol)).toEqual(['UP7','UP6','UP5','UP4','UP3']);
    expect(data.losers.map(r=>r.symbol)).toEqual(['LOSS']);
    expect(data.mostTraded).toHaveLength(5);
  });
  it('distinguishes reported zero from missing volume and drops suspended/invalid quotes', () => {
    const data=rankNewsMovers([row('ZERO',1,0),row('UNKNOWN',2,null),row('BUSY',-1,20),{...row('STOP',99,99),suspended:true},{...row('BAD',99,99),price:0}]);
    expect(data.leastTraded.map(r=>r.symbol)).toEqual(['ZERO','BUSY']);
    expect(data.mostTraded.map(r=>r.symbol)).toEqual(['BUSY','ZERO']);
    expect(data.gainers.map(r=>r.symbol)).toEqual(['UNKNOWN','ZERO']);
  });
  it('keeps every news page scoped and refuses mismatched payloads', () => {
    for (const channel of [...TV_NEWS_TOPICS,'kuwait' as const]) {
      expect(new URL(newsMoversPath(channel),'https://tv.invalid').searchParams.get('channel')).toBe(channel);
    }
    expect(parseNewsMovers({channel:'technology',lists:emptyNewsMovers()},'kuwait')).toBeNull();
    expect(parseNewsMovers({channel:'kuwait',lists:emptyNewsMovers()},'kuwait')?.lists).toEqual(emptyNewsMovers());
  });
  it('uses headline symbols only for event categories', () => {
    const ticker='/api/tv/snapshot?symbols=AAPL%2CMSFT';
    expect(new URL(newsMoversPath('earningsNews',ticker),'https://tv.invalid').searchParams.get('symbols')).toBe('AAPL,MSFT');
    expect(new URL(newsMoversPath('kuwait',ticker),'https://tv.invalid').searchParams.has('symbols')).toBe(false);
  });
  it('permits packaged read access without allowing writes', () => {
    const url='https://www.the-sfm.com/api/tv/news-movers?channel=kuwait';
    expect(tvPackagedOrigin(new Request(url,{headers:{origin:'null'}}))).toBe(true);
    expect(tvPackagedOrigin(new Request(url,{method:'POST',headers:{origin:'null'}}))).toBe(false);
  });
});
