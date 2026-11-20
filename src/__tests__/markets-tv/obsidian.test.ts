import { describe, expect, it } from 'vitest';
import { briefMetrics, briefSummary } from '@/lib/markets-tv/obsidian';
import { normalizeTvSettings, type TvQuote } from '@/lib/markets-tv/types';
import { normalizeSessionHistory } from '@/lib/markets-tv/history';
import { durationClock, sessionTimeline, zonedInstant } from '@/lib/markets-tv/sessionTimeline';
import { TV_SESSIONS } from '@/lib/markets-tv/sessions';
const now=Date.parse('2026-11-06T15:00:00Z');
const quote=(symbol:string,change:number):TvQuote=>({symbol,name:symbol,nameAr:symbol,price:100,currency:'USD',changePercent:change,source:'QA',observedAt:new Date(now-60000).toISOString(),receivedAt:new Date(now).toISOString(),status:'delayed',delayType:'delayed',changeBasis:'session',exchange:null,country:null});
describe('Obsidian market data',()=>{
  it('persists only supported accents and upgrades existing device settings',()=>{
    expect(normalizeTvSettings({})).toMatchObject({accent:'green',theme:'light'});
    for(const accent of ['champagne','blue','green','purple'])expect(normalizeTvSettings({accent}).accent).toBe(accent);
    expect(normalizeTvSettings({accent:'url(external)',theme:'invalid'})).toMatchObject({accent:'green',theme:'light'});
    for(const theme of ['light','dark'])expect(normalizeTvSettings({accent:'champagne',theme})).toMatchObject({accent:'champagne',theme});
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
  it('measures breadth against comparable listings and includes unchanged prices in the headline', () => {
    const rows = [quote('up', 1), quote('flat1', 0), quote('flat2', 0), { ...quote('old', -80), status: 'stale' as const }];
    const stats = briefMetrics([...rows, rows[0]], now);
    expect(stats).toMatchObject({ total: 4, comparable: 3, unchanged: 2, headline: 'mostlyFlatDay', magnitude: 1 });
    expect(briefSummary(stats, 'en')).toContain('66.7%');
    expect(briefSummary(stats, 'fr')).toContain('66,7');
    expect(briefSummary(stats, 'ar')).toContain('بقيت مستقرة');
    expect(briefMetrics([quote('up', 1), quote('flat', 0)], now).headline).toBe('mixedDay');
  });
  it('keeps every absolute leader across both directions before the rankings display limit', () => {
    const rows = Array.from({ length: 6 }, (_, i) => quote(`up${i}`, 2));
    const stats = briefMetrics([...rows, quote('down', -2), { ...quote('rolling', 80), changeBasis: '24h' }, quote('small', .001)], now);
    expect(stats.gainers).toHaveLength(5);
    expect(stats.leaders.map(q => q.symbol)).toEqual([...rows.map(q => q.symbol), 'down']);
    expect(stats.comparableKeys.size).toBe(8);
    expect(briefMetrics([quote('flat', 0)], now).leaders).toEqual([]);
    expect(briefMetrics([], now).leaders).toEqual([]);
  });
  it('keeps server and first client schedules deterministic until the clock is ready',()=>{
    expect(sessionTimeline(TV_SESSIONS[0],0)).toEqual({open:false,remaining:null,nextOpen:null,closesAt:null,nowPercent:0,bars:[]});
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
    expect(durationClock(103*60000)).toBe('01:43:00');
  });
  it('normalizes real intraday bars to UTC, isolates the latest session, and rejects ETF/future/invalid points',()=>{
    const points=normalizeSessionHistory([{date:'2026-11-05 15:55:00',close:6000},{date:'2026-11-06 09:30:00',close:6010},{date:'2026-11-06 09:35:00',close:6012},{date:'2026-11-06 09:35:00',close:6013},{date:'2026-11-06 09:40:00',close:44,symbol:'SPY'},{date:'2026-11-06 09:45:00',close:NaN},{date:'2026-11-06 16:00:00',close:9999}],now);
    expect(points).toEqual([{at:'2026-11-06T14:30:00.000Z',price:6010},{at:'2026-11-06T14:35:00.000Z',price:6013}]);
    expect(zonedInstant('2026-07-01',570,'America/New_York')).toBe(Date.parse('2026-07-01T13:30:00Z'));
  });
});
