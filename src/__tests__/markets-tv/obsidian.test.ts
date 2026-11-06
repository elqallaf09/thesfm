import { describe, expect, it } from 'vitest';
import { briefMetrics } from '@/lib/markets-tv/obsidian';
import { normalizeTvSettings, type TvQuote } from '@/lib/markets-tv/types';
import { normalizeSessionHistory } from '@/lib/markets-tv/history';
import { durationClock, sessionTimeline, zonedInstant } from '@/lib/markets-tv/sessionTimeline';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';
const now=Date.parse('2026-11-06T15:00:00Z');
const quote=(symbol:string,change:number):TvQuote=>({symbol,name:symbol,nameAr:symbol,price:100,currency:'USD',changePercent:change,source:'QA',observedAt:new Date(now-60000).toISOString(),receivedAt:new Date(now).toISOString(),status:'delayed',delayType:'delayed',changeBasis:'session',exchange:null,country:null});
describe('Obsidian market data',()=>{
  it('persists only supported accents and upgrades existing device settings',()=>{
    expect(normalizeTvSettings({}).accent).toBe('champagne');
    for(const accent of ['champagne','blue','green','purple'])expect(normalizeTvSettings({accent}).accent).toBe(accent);
    expect(normalizeTvSettings({accent:'url(external)'}).accent).toBe('champagne');
  });
  it('uses unique comparable session changes, never stale/unknown/reference or rolling changes',()=>{
    const a=quote('A',-2),b=quote('B',1);
    const result=briefMetrics([a,a,b,{...quote('old',80),status:'stale'}, {...quote('rolling',50),changeBasis:'24h'}, {...quote('ref',80),changeBasis:'reference'}, {...quote('unknown',90),observedAt:null}, {...quote('nan',NaN)}],now);
    expect(result).toMatchObject({total:7,comparable:2,rising:1,falling:1,average:-.5,headline:'mixedDay'});
    expect(result.gainers.map(q=>q.symbol)).toEqual(['B']);
  });
  it('reports no gains distinctly from no comparable data and computes rolling crypto separately',()=>{
    expect(briefMetrics([quote('A',-2),quote('B',-1)],now)).toMatchObject({headline:'redDay',gainers:[],average:-1.5});
    expect(briefMetrics([{...quote('A',-2),price:null}],now)).toMatchObject({headline:'waitingDay',average:null,comparable:0});
    expect(briefMetrics([{...quote('BTC/USDT',3),changeBasis:'24h'}],now)).toMatchObject({basis:'24h',average:3});
  });
  it('keeps server and first client schedules deterministic until the clock is ready',()=>{
    expect(sessionTimeline(TV_SESSIONS[0],0)).toEqual({open:false,remaining:null,nowPercent:0,bars:[]});
  });
  it('aligns New York and London in Kuwait time through both DST transitions',()=>{
    const ny=TV_SESSIONS.find(s=>s.id==='XNYS')!,london=TV_SESSIONS.find(s=>s.id==='XLON')!;
    const winter=sessionTimeline(ny,now),summer=sessionTimeline(ny,Date.parse('2026-07-01T14:00:00Z'));
    expect(winter.bars[0].left).toBeCloseTo(17.5/24*100);
    expect(summer.bars[0].left).toBeCloseTo(16.5/24*100);
    expect(sessionTimeline(london,now).bars[0].left).toBeCloseTo(11/24*100);
    expect(sessionTimeline(london,Date.parse('2026-07-01T10:00:00Z')).bars[0].left).toBeCloseTo(10/24*100);
  });
  it('handles Gulf weekends, Tokyo lunch, published holidays and early closing',()=>{
    expect(sessionTimeline(TV_SESSIONS[0],Date.parse('2026-11-06T07:00:00Z')).open).toBe(false);
    const tokyo=TV_SESSIONS.find(s=>s.id==='XTKS')!,ny=TV_SESSIONS.find(s=>s.id==='XNYS')!;
    expect(sessionTimeline(tokyo,Date.parse('2026-11-06T03:00:00Z'))).toMatchObject({open:false,remaining:30*60000});
    expect(sessionTimeline(tokyo,Date.parse('2026-11-03T01:00:00Z')).bars).toEqual([]);
    expect(sessionTimeline(ny,Date.parse('2026-11-26T15:00:00Z')).open).toBe(false);
    expect(sessionTimeline(ny,Date.parse('2026-11-27T17:30:00Z'))).toMatchObject({open:true,remaining:30*60000});
    expect(durationClock(103*60000)).toBe('1:43');
  });
  it('normalizes real intraday bars to UTC, isolates the latest session, and rejects ETF/future/invalid points',()=>{
    const points=normalizeSessionHistory([{date:'2026-11-05 15:55:00',close:6000},{date:'2026-11-06 09:30:00',close:6010},{date:'2026-11-06 09:35:00',close:6012},{date:'2026-11-06 09:35:00',close:6013},{date:'2026-11-06 09:40:00',close:44,symbol:'SPY'},{date:'2026-11-06 09:45:00',close:NaN},{date:'2026-11-06 16:00:00',close:9999}],now);
    expect(points).toEqual([{at:'2026-11-06T14:30:00.000Z',price:6010},{at:'2026-11-06T14:35:00.000Z',price:6013}]);
    expect(zonedInstant('2026-07-01',570,'America/New_York')).toBe(Date.parse('2026-07-01T13:30:00Z'));
  });
});
